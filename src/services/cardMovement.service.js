// src/services/cardMovement.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';
import { parseISO, isValid } from 'date-fns';

const { CardMovement, Card } = models;

function validateMovementPayload(payload) {
  const { cardId, type, concept, amount, date } = payload;
  if (!cardId) throw new Error('cardId is required');
  if (!['income', 'expense'].includes(type)) throw new Error('type must be "income" or "expense"');
  if (!concept || typeof concept !== 'string') throw new Error('concept required');
  const am = parseFloat(amount);
  if (Number.isNaN(am) || am <= 0) throw new Error('amount must be positive number');
  if (!date) throw new Error('date is required (YYYY-MM-DD)');
  const d = parseISO(date);
  if (!isValid(d)) throw new Error('date must be a valid YYYY-MM-DD');
}

export async function createCardMovement(payload) {
  validateMovementPayload(payload);

  return sequelize.transaction(async (t) => {
    // validar card existe
    const card = await Card.findByPk(payload.cardId, { transaction: t });
    if (!card) throw new Error('cardId not found');

    const createObj = {
      cardId: payload.cardId,
      type: payload.type,
      concept: payload.concept,
      description: payload.description || null,
      amount: parseFloat(payload.amount),
      date: payload.date
    };

    const created = await CardMovement.create(createObj, { transaction: t });
    return created;
  });
}

export async function getMovementById(id) {
  return CardMovement.findByPk(id, { include: [{ model: Card, as: 'card' }] });
}

export async function listMovements({ cardId = null, limit = 100, offset = 0, fromDate = null, toDate = null } = {}) {
  const where = {};
  if (cardId) where.cardId = cardId;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date[Op.gte] = fromDate;
    if (toDate) where.date[Op.lte] = toDate;
  }

  return CardMovement.findAll({
    where,
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset
  });
}

export async function updateMovement(id, payload) {
  return sequelize.transaction(async (t) => {
    const m = await CardMovement.findByPk(id, { transaction: t });
    if (!m) return null;

    if (payload.cardId && payload.cardId !== m.cardId) {
      const c = await Card.findByPk(payload.cardId, { transaction: t });
      if (!c) throw new Error('Target cardId not found');
      m.cardId = payload.cardId;
    }

    const allowed = ['type', 'concept', 'description', 'amount', 'date'];
    allowed.forEach(k => { if (payload[k] !== undefined) m[k] = payload[k]; });

    // validaciones ligeras
    if (!['income', 'expense'].includes(m.type)) throw new Error('type must be "income" or "expense"');
    const am = parseFloat(m.amount);
    if (Number.isNaN(am) || am <= 0) throw new Error('amount must be positive number');

    await m.save({ transaction: t });
    return m;
  });
}

export async function deleteMovement(id) {
  return sequelize.transaction(async (t) => {
    const m = await CardMovement.findByPk(id, { transaction: t });
    if (!m) return null;
    await m.destroy({ transaction: t });
    return true;
  });
}
