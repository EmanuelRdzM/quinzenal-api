// src/services/debtMovement.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import ApiError from '../shared/errors/ApiError.js';
import { parseISO, isValid } from 'date-fns';
import { Op } from 'sequelize';

const { DebtMovement, Debt, Person } = models;

function validateMovementPayload(payload) {
  const { debtId, type, amount, date } = payload;
  if (!debtId) throw new ApiError('debtId is required', 400);
  if (!['lend', 'payment'].includes(type)) throw new ApiError('type must be "lend" or "payment"', 400);
  const am = parseFloat(payload.amount);
  if (Number.isNaN(am) || am <= 0) throw new ApiError('amount must be positive number', 400);
  if (!date) throw new ApiError('date is required (YYYY-MM-DD)', 400);
  const d = parseISO(date);
  if (!isValid(d)) throw new ApiError('date must be a valid YYYY-MM-DD', 400);
}

export async function createDebtMovement(payload) {
  validateMovementPayload(payload);

  return sequelize.transaction(async (t) => {
    const debt = await Debt.findByPk(payload.debtId, { transaction: t });
    if (!debt) throw new ApiError('Debt not found', 404);

    const createObj = {
      debtId: payload.debtId,
      type: payload.type,
      amount: parseFloat(payload.amount),
      date: payload.date,
      notes: payload.notes || null
    };

    const created = await DebtMovement.create(createObj, { transaction: t });
    return created;
  });
}

export async function listDebtMovements({ debtId = null, limit = 200, offset = 0, fromDate = null, toDate = null } = {}) {
  const where = {};
  if (debtId) where.debtId = debtId;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date[Op.gte] = fromDate;
    if (toDate) where.date[Op.lte] = toDate;
  }

  return DebtMovement.findAll({
    where,
    include: [{ model: Debt, as: 'debt', include: [{ model: Person, as: 'person' }] }],
    order: [['date', 'DESC']],
    limit,
    offset
  });
}

export async function getDebtMovementById(id) {
  const m = await DebtMovement.findByPk(id, { include: [{ model: Debt, as: 'debt' }] });
  if (!m) throw new ApiError('DebtMovement not found', 404);
  return m;
}

export async function updateDebtMovement(id, payload) {
  return sequelize.transaction(async (t) => {
    const m = await DebtMovement.findByPk(id, { transaction: t });
    if (!m) throw new ApiError('DebtMovement not found', 404);

    if (payload.debtId && payload.debtId !== m.debtId) {
      const d = await Debt.findByPk(payload.debtId, { transaction: t });
      if (!d) throw new ApiError('Target debtId not found', 404);
      m.debtId = payload.debtId;
    }

    const allowed = ['type', 'amount', 'date', 'notes'];
    allowed.forEach(k => { if (payload[k] !== undefined) m[k] = payload[k]; });

    if (!['lend','payment'].includes(m.type)) throw new ApiError('type must be "lend" or "payment"', 400);
    const am = parseFloat(m.amount);
    if (Number.isNaN(am) || am <= 0) throw new ApiError('amount must be positive number', 400);

    await m.save({ transaction: t });
    return m;
  });
}

export async function deleteDebtMovement(id) {
  return sequelize.transaction(async (t) => {
    const m = await DebtMovement.findByPk(id, { transaction: t });
    if (!m) throw new ApiError('DebtMovement not found', 404);
    await m.destroy({ transaction: t });
    return true;
  });
}
