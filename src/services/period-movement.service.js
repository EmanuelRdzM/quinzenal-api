// src/services/movement.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { findOrCreatePeriodByDate } from './period.service.js';

const { PeriodMovement, Period } = models;

// Validaciones ligeras
function validateMovementPayload(payload) {
  const { type, concept, amount, paymentMethod } = payload;
  if (!['income','expense'].includes(type)) throw new Error('type must be "income" or "expense"');
  if (!concept || typeof concept !== 'string') throw new Error('concept required');
  const am = parseFloat(amount);
  if (Number.isNaN(am) || am <= 0) throw new Error('amount must be positive number');
  if (!['cash','card'].includes(paymentMethod)) throw new Error('paymentMethod must be "cash" or "card"');
}

// Crea un movimiento.
export async function createMovement(payload, { autoCreatePeriod = true } = {}) {
  validateMovementPayload(payload);

  const t = await sequelize.transaction();
  try {
    let periodId = payload.periodId;
    if (!periodId) {
      const actualDate = new Date().toISOString().slice(0,10);
      const period = await findOrCreatePeriodByDate(actualDate, { autoCreate: autoCreatePeriod, transaction: t });
      if (!period) throw new Error('No period found for given date and autoCreatePeriod is false');
      periodId = period.id;
    } else {
      // validar existencia
      const p = await models.Period.findByPk(periodId, { transaction: t });
      if (!p) throw new Error('periodId not found');
    }

    // preparar objeto de creación. 
    const createObj = {
      periodId,
      type: payload.type,
      concept: payload.concept,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod
    };

    const created = await PeriodMovement.create(createObj, { transaction: t });

    await t.commit();
    return created;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function getMovementById(id) {
  return PeriodMovement.findByPk(id, {
    include: [{ model: Period, as: 'period' }]
  });
}

export async function listMovements({ periodId = null, limit = 100, offset = 0 } = {}) {
  const where = {};
  if (periodId) where.periodId = periodId;
  return PeriodMovement.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });
}

export async function updateMovement(id, payload) {
  const t = await sequelize.transaction();
  try {
    const m = await PeriodMovement.findByPk(id, { transaction: t });
    if (!m) {
      await t.rollback();
      return null;
    }

    // If payload wants to change periodId, validate target exists
    if (payload.periodId !== undefined && payload.periodId !== m.periodId) {
      const p = await Period.findByPk(payload.periodId, { transaction: t });
      if (!p) throw new Error('Target periodId not found');
      m.periodId = payload.periodId;
    }

    // Update allowed fields
    const allowed = ['type','concept','amount','paymentMethod'];
    allowed.forEach(k => { if (payload[k] !== undefined) m[k] = payload[k]; });

    await m.save({ transaction: t });
    await t.commit();
    return m;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function deleteMovement(id) {
  // simple delete
  const t = await sequelize.transaction();
  try {
    const m = await PeriodMovement.findByPk(id, { transaction: t });
    if (!m) {
      await t.rollback();
      return null;
    }
    await m.destroy({ transaction: t });
    await t.commit();
    return true;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Obtener resumen (saldos) de un periodo
export async function getPeriodSummary(periodId) {
  // agrupado por type y paymentMethod
  const { sequelize: seq } = models;
  const rows = await PeriodMovement.findAll({
    where: { periodId },
    attributes: [
      'type',
      'paymentMethod',
      [seq.fn('SUM', seq.col('amount')), 'total']
    ],
    group: ['type','paymentMethod'],
    raw: true
  });

  let incomeCash = 0, incomeCard = 0, expenseCash = 0, expenseCard = 0;
  rows.forEach(r => {
    const v = parseFloat(r.total || 0);
    if (r.type === 'income' && r.paymentMethod === 'cash') incomeCash += v;
    if (r.type === 'income' && r.paymentMethod === 'card') incomeCard += v;
    if (r.type === 'expense' && r.paymentMethod === 'cash') expenseCash += v;
    if (r.type === 'expense' && r.paymentMethod === 'card') expenseCard += v;
  });

  const totalIncome = incomeCash + incomeCard;
  const totalExpense = expenseCash + expenseCard;
  return {
    incomeCash, incomeCard, expenseCash, expenseCard,
    totalIncome, totalExpense,
    balanceCash: incomeCash - expenseCash,
    balanceCard: incomeCard - expenseCard,
    balanceTotal: totalIncome - totalExpense
  };
}
