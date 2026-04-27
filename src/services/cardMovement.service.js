// src/services/cardMovement.service.js
import { randomUUID } from 'node:crypto';
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';
import { addMonths, format, isValid, parseISO } from 'date-fns';
import ApiError from '../shared/errors/ApiError.js';

const { CardMovement, Card } = models;

const OPERATION_TO_FLOW_TYPE = {
  purchase: 'expense',
  interest: 'expense',
  late_fee: 'expense',
  cash_advance: 'expense',
  payment: 'income',
  refund: 'income'
};

const CREDIT_OPERATION_TYPES = Object.keys(OPERATION_TO_FLOW_TYPE);

function toCents(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100);
}

function parseMsiTerms(rawTerms) {
  if (!rawTerms) return [3, 6, 9, 12];
  if (Array.isArray(rawTerms)) {
    return [...new Set(rawTerms.map((item) => parseInt(item, 10)).filter((item) => !Number.isNaN(item) && item > 1))]
      .sort((a, b) => a - b);
  }

  if (typeof rawTerms === 'string') {
    try {
      const parsed = JSON.parse(rawTerms);
      return parseMsiTerms(parsed);
    } catch {
      return parseMsiTerms(rawTerms.split(',').map((item) => item.trim()));
    }
  }

  return [3, 6, 9, 12];
}

function validateCommonPayload(payload) {
  const { cardId, concept, amount, date } = payload;

  if (!cardId || Number.isNaN(parseInt(cardId, 10))) {
    throw new ApiError('cardId is required', 400);
  }

  if (!concept || typeof concept !== 'string') {
    throw new ApiError('concept is required', 400);
  }

  const amountCents = toCents(amount);
  if (Number.isNaN(amountCents) || amountCents <= 0) {
    throw new ApiError('amount must be a positive number', 400);
  }

  if (!date) {
    throw new ApiError('date is required (YYYY-MM-DD)', 400);
  }

  const parsedDate = parseISO(date);
  if (!isValid(parsedDate)) {
    throw new ApiError('date must be a valid YYYY-MM-DD', 400);
  }
}

function normalizeOperationType(cardType, incomingType, incomingOperationType) {
  if (cardType === 'credit') {
    const operationType = incomingOperationType
      || (incomingType === 'income' ? 'payment' : 'purchase');

    if (!CREDIT_OPERATION_TYPES.includes(operationType)) {
      throw new ApiError(`operationType must be one of: ${CREDIT_OPERATION_TYPES.join(', ')}`, 400);
    }

    return {
      type: OPERATION_TO_FLOW_TYPE[operationType],
      operationType
    };
  }

  if (!['income', 'expense'].includes(incomingType)) {
    throw new ApiError('type must be "income" or "expense"', 400);
  }

  if (incomingOperationType !== undefined && incomingOperationType !== null && incomingOperationType !== '') {
    throw new ApiError('operationType is only valid for credit cards', 400);
  }

  return {
    type: incomingType,
    operationType: null
  };
}

function assertCreditMsiRules(card, normalizedMovement, installments) {
  if (!installments || installments <= 1) return;

  if (normalizedMovement.operationType !== 'purchase') {
    throw new ApiError('MSI is only available for purchase operationType', 400);
  }

  if (!card.msiEnabled) {
    throw new ApiError('MSI is disabled for this card', 400);
  }

  const terms = parseMsiTerms(card.availableMsiTerms);
  if (!terms.includes(installments)) {
    throw new ApiError(`MSI terms allowed for this card: ${terms.join(', ')}`, 400);
  }
}

export async function createCardMovement(payload) {
  validateCommonPayload(payload);

  return sequelize.transaction(async (t) => {
    const card = await Card.findByPk(payload.cardId, { transaction: t });
    if (!card) throw new ApiError('cardId not found', 404);

    const normalizedType = normalizeOperationType(card.cardType, payload.type, payload.operationType);
    const installments = payload.installments ? parseInt(payload.installments, 10) : null;

    if (installments !== null && (Number.isNaN(installments) || installments < 1 || installments > 48)) {
      throw new ApiError('installments must be a number between 1 and 48', 400);
    }

    if (card.cardType === 'credit') {
      assertCreditMsiRules(card, normalizedType, installments);
    }

    const createObj = {
      cardId: payload.cardId,
      type: normalizedType.type,
      operationType: normalizedType.operationType,
      concept: payload.concept,
      description: payload.description || null,
      amount: Number(payload.amount),
      date: payload.date,
      msiGroupId: null,
      installmentNumber: null,
      installments: null,
      originalPurchaseDate: null
    };

    if (card.cardType !== 'credit' || !installments || installments <= 1) {
      const created = await CardMovement.create(createObj, { transaction: t });
      return created;
    }

    const totalCents = toCents(payload.amount);
    const baseInstallmentCents = Math.floor(totalCents / installments);
    const remainder = totalCents - (baseInstallmentCents * installments);

    const msiGroupId = randomUUID();
    const createdRows = [];
    const originalDate = parseISO(payload.date);

    for (let i = 1; i <= installments; i += 1) {
      const installmentCents = baseInstallmentCents + (i <= remainder ? 1 : 0);
      const installmentDate = addMonths(originalDate, i - 1);

      const row = await CardMovement.create(
        {
          ...createObj,
          concept: `${payload.concept} (MSI ${i}/${installments})`,
          amount: Number((installmentCents / 100).toFixed(2)),
          date: format(installmentDate, 'yyyy-MM-dd'),
          msiGroupId,
          installmentNumber: i,
          installments,
          originalPurchaseDate: payload.date
        },
        { transaction: t }
      );

      createdRows.push(row);
    }

    return {
      msiGroupId,
      installments,
      created: createdRows
    };
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
    const movement = await CardMovement.findByPk(id, { transaction: t });
    if (!movement) return null;

    let targetCard = null;
    if (payload.cardId && Number(payload.cardId) !== Number(movement.cardId)) {
      targetCard = await Card.findByPk(payload.cardId, { transaction: t });
      if (!targetCard) throw new ApiError('Target cardId not found', 404);
      movement.cardId = payload.cardId;
    } else {
      targetCard = await Card.findByPk(movement.cardId, { transaction: t });
    }

    if (!targetCard) {
      throw new ApiError('cardId not found', 404);
    }

    const nextType = payload.type ?? movement.type;
    const nextOperationType = payload.operationType ?? movement.operationType;

    const normalizedType = normalizeOperationType(targetCard.cardType, nextType, nextOperationType);

    if (payload.amount !== undefined) {
      const cents = toCents(payload.amount);
      if (Number.isNaN(cents) || cents <= 0) {
        throw new ApiError('amount must be a positive number', 400);
      }
      movement.amount = Number(payload.amount);
    }

    if (payload.date !== undefined) {
      const d = parseISO(payload.date);
      if (!isValid(d)) throw new ApiError('date must be a valid YYYY-MM-DD', 400);
      movement.date = payload.date;
    }

    if (payload.concept !== undefined) {
      if (!payload.concept || typeof payload.concept !== 'string') {
        throw new ApiError('concept is required', 400);
      }
      movement.concept = payload.concept;
    }

    if (payload.description !== undefined) {
      movement.description = payload.description || null;
    }

    movement.type = normalizedType.type;
    movement.operationType = normalizedType.operationType;

    await movement.save({ transaction: t });
    return movement;
  });
}

export async function deleteMovement(id) {
  return sequelize.transaction(async (t) => {
    const movement = await CardMovement.findByPk(id, { transaction: t });
    if (!movement) return null;
    await movement.destroy({ transaction: t });
    return true;
  });
}
