// src/services/period.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';

// Helper: último día del mes
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month 1-12 -> Date uses month index 0-based if used differently; here used accordingly
}

function validateMaxDuration(startDate, endDate, maxDays = 31) {

  const ms = new Date(endDate) - new Date(startDate);

  const days = ms / (1000 * 60 * 60 * 24) + 1;

  if (days > maxDays) {
    throw new Error(`Period cannot exceed ${maxDays} days`);
  }
}

/**
 * validatePeriodOverlap:
 *  - startDate/endDate deben ser strings 'YYYY-MM-DD' o Date convertibles
 *  - excludeId: id a excluir (usado en update)
 */
async function validatePeriodOverlap(startDate, endDate, excludeId = null) {

  const where = {
    [Op.or]: [
      {
        startDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      {
        endDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      {
        [Op.and]: [
          { startDate: { [Op.lte]: startDate } },
          { endDate: { [Op.gte]: endDate } }
        ]
      }
    ]
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const existing = await models.Period.findOne({ where });

  if (existing) {
    throw new Error(
      `Period overlaps with existing period (${existing.startDate} - ${existing.endDate})`
    );
  }
}

/**
 * Crer manualmente un periodo valido
 */
export async function createManualPeriod({ startDate, endDate, notes }, options = {}) {
  const trx = options.transaction || null;

  if (!startDate || !endDate) throw new Error("startDate and endDate are required");

  if (new Date(startDate) >= new Date(endDate)) {
    throw new Error("startDate must be before endDate");
  }

  validateMaxDuration(startDate, endDate, 31);

  await validatePeriodOverlap(startDate, endDate);

  const created = await models.Period.create({
    startDate,
    endDate,
    notes: notes || null
  }, { transaction: trx });

  return created;
}

/**
 * Crea un periodo quincenal desde una fecha (wrapper)
 */
export async function createBiweeklyPeriodFromDate(dateInput, options = {}) {

  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let startDate, endDate;

  if (day <= 15) {
    startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    endDate = `${year}-${String(month).padStart(2, '0')}-15`;
  } else {
    startDate = `${year}-${String(month).padStart(2, '0')}-16`;
    const last = lastDayOfMonth(year, month);
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  }

  await validatePeriodOverlap(startDate, endDate);

  const created = await models.Period.create({
    startDate,
    endDate,
    notes: options.notes || null
  }, { transaction: options.transaction });

  return created;
}

export async function findOrCreatePeriodByDate(dateInput, { autoCreate = true, transaction = null } = {}) {
  const dateStr = dateInput;

  const where = {
    startDate: { [Op.lte]: dateStr },
    endDate: { [Op.gte]: dateStr }
  };

  const period = await models.Period.findOne({ where, transaction });

  if (period) return period;

  if (!autoCreate) return null;

  // crear nuevo periodo según regla quincenal
  const created = await createBiweeklyPeriodFromDate(dateInput, { transaction });
  return created;
}

// Listar todos los periodos
export async function listPeriods({ limit = 50, offset = 0 } = {}) {
  return models.Period.findAll({
    order: [['startDate', 'DESC']],
    limit,
    offset
  });
}

// Obtener periodo por id con movements
export async function getPeriodById(id) {
  return models.Period.findByPk(id, {
    include: [
      {
        model: models.PeriodMovement,
        as: 'period_movements'
      }
    ],
  });
}

export async function updatePeriod(id, payload) {
  // usar transacción para evitar race conditions entre validación y save
  return sequelize.transaction(async (t) => {
    const period = await models.Period.findByPk(id, { transaction: t });
    if (!period) return null;

    const startDate = payload.startDate ?? period.startDate;
    const endDate = payload.endDate ?? period.endDate;

    if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
      throw new Error('startDate must be before endDate');
    }

    validateMaxDuration(startDate, endDate, 31);

    // exclude self to avoid false positive
    await validatePeriodOverlap(startDate, endDate, id);

    // apply allowed updates
    const allowed = ['startDate','endDate','notes'];
    allowed.forEach(k => {
      if (payload[k] !== undefined) period[k] = payload[k];
    });

    await period.save({ transaction: t });
    return period;
  });
}