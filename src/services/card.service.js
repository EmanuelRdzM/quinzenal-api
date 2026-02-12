// src/services/card.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';
import ApiError from '../shared/errors/ApiError.js';

/**
 * Card service - operaciones sobre la entidad Card.
 */

const { Card, CardMovement } = models;

export async function createCard({ name, initialBalance = 0, notes = null }) {
  if (!name || typeof name !== 'string') throw new Error('name is required');
  const ib = parseFloat(initialBalance) || 0;
  return Card.create({ name, initialBalance: ib, notes });
}

export async function getCardById(id) {
  return Card.findByPk(id, {
    include: [{ model: CardMovement, as: 'card_movements', order: [['date', 'DESC']] }]
  });
}

export async function listCards({ limit = 50, offset = 0, q = null } = {}) {
  const where = {};
  if (q) {
    where.name = { [Op.like]: `%${q}%` };
  }
  return Card.findAll({
    where,
    order: [['name', 'ASC']],
    limit,
    offset
  });
}

export async function updateCard(id, payload) {
  return sequelize.transaction(async (t) => {
    const card = await Card.findByPk(id, { transaction: t });
    if (!card) return null;

    const allowed = ['name', 'initialBalance', 'notes'];
    allowed.forEach(k => {
      if (payload[k] !== undefined) card[k] = payload[k];
    });

    await card.save({ transaction: t });
    return card;
  });
}

export async function deleteCard(id) {
  return sequelize.transaction(async (t) => {
    const card = await Card.findByPk(id, { transaction: t });
    if (!card) return null;
    // opcion: podrías checar si tiene movimientos y bloquear eliminación si quieres
    await card.destroy({ transaction: t });
    return true;
  });
}

/**
 * getCardSummary:
 *  - Calcula balance actual: initialBalance + sum(incomes) - sum(expenses)
 *  - Devuelve desgloses por tipo y total.
 */
export async function getCardSummary(cardId) {
  const card = await Card.findByPk(cardId);
  if (!card) throw new ApiError('Card not found', 404);

  // sumar movimientos agrupados por type
  const rows = await CardMovement.findAll({
    where: { cardId },
    attributes: [
      'type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['type'],
    raw: true
  });

  let income = 0, expense = 0;
  rows.forEach(r => {
    const v = parseFloat(r.total || 0);
    if (r.type === 'income') income += v;
    if (r.type === 'expense') expense += v;
  });

  const initial = parseFloat(card.initialBalance || 0);
  const balance = initial + income - expense;

  return {
    cardId,
    name: card.name,
    initialBalance: initial,
    totalIncome: income,
    totalExpense: expense,
    balance
  };
}
