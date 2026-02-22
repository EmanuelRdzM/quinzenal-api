// src/services/debt.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import ApiError from '../shared/errors/ApiError.js';
import { Op } from 'sequelize';

const { Debt, Person, DebtMovement } = models;

export async function createDebt({ personId, type = 'loan', description = null }) {
  if (!personId) throw new ApiError('personId is required', 400);
  if (!['loan', 'rent'].includes(type)) throw new ApiError('type must be "loan" or "rent"', 400);

  const person = await Person.findByPk(personId);
  if (!person) throw new ApiError('Person not found', 404);

  return Debt.create({ personId, type, description });
}

export async function listDebts({ personId = null, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (personId) where.personId = personId;

  return Debt.findAll({
    where,
    include: [{ model: Person, as: 'person' }],
    attributes: {
      include: [
        // suma 'lend'
        [sequelize.literal(`COALESCE((SELECT SUM(amount) FROM debt_movements dm WHERE dm."debtId" = "Debt"."id" AND dm.type = 'lend'), 0)`), 'totalLend'],
        // suma 'payment'
        [sequelize.literal(`COALESCE((SELECT SUM(amount) FROM debt_movements dm WHERE dm."debtId" = "Debt"."id" AND dm.type = 'payment'), 0)`), 'totalPayment'],
        // balance = lend - payment
        [sequelize.literal(`COALESCE((SELECT 
            COALESCE(SUM(CASE WHEN dm.type='lend' THEN dm.amount ELSE 0 END),0)
            - COALESCE(SUM(CASE WHEN dm.type='payment' THEN dm.amount ELSE 0 END),0)
          FROM debt_movements dm WHERE dm."debtId" = "Debt"."id"), 0)`), 'balance']
      ]
    },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    raw: false
  });
}


export async function getDebtById(id) {
  const d = await Debt.findByPk(id, { include: [{ model: DebtMovement, as: 'debt_movements', order: [['date','DESC']] }, { model: Person, as: 'person' }] });
  return d;
}

export async function updateDebt(id, payload) {
  return sequelize.transaction(async (t) => {
    const d = await Debt.findByPk(id, { transaction: t });
    if (!d) return null;

    if (payload.personId && payload.personId !== d.personId) {
      const p = await Person.findByPk(payload.personId, { transaction: t });
      if (!p) throw new ApiError('Target personId not found', 404);
      d.personId = payload.personId;
    }

    const allowed = ['type', 'description'];
    allowed.forEach(k => { if (payload[k] !== undefined) d[k] = payload[k]; });

    if (!['loan','rent'].includes(d.type)) throw new ApiError('type must be "loan" or "rent"', 400);

    await d.save({ transaction: t });
    return d;
  });
}

export async function deleteDebt(id) {
  return sequelize.transaction(async (t) => {
    const d = await Debt.findByPk(id, { transaction: t });
    if (!d) return null;

    // opción: checar si tiene movimientos y bloquear eliminación
    await d.destroy({ transaction: t });
    return true;
  });
}

/**
 * getDebtSummary:
 *  - totalLend: suma movimientos tipo 'lend'
 *  - totalPayment: suma 'payment'
 *  - balance: totalLend - totalPayment
 */
export async function getDebtSummary(debtId) {
  const debt = await Debt.findByPk(debtId);
  if (!debt) throw new ApiError('Debt not found', 404);

  const rows = await DebtMovement.findAll({
    where: { debtId },
    attributes: [
      'type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['type'],
    raw: true
  });

  let totalLend = 0, totalPayment = 0;
  rows.forEach(r => {
    const v = parseFloat(r.total || 0);
    if (r.type === 'lend') totalLend += v;
    if (r.type === 'payment') totalPayment += v;
  });

  return {
    debtId,
    totalLend,
    totalPayment,
    balance: totalLend - totalPayment
  };
}
