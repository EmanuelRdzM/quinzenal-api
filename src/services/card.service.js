// src/services/card.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay
} from 'date-fns';
import ApiError from '../shared/errors/ApiError.js';

const { Card, CardMovement } = models;

const DEFAULT_CREDIT_TERMS = [3, 6, 9, 12];

function toCents(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100);
}

function centsToNumber(cents) {
  return Number((cents / 100).toFixed(2));
}

function asInteger(value, fieldName) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new ApiError(`${fieldName} must be a valid integer`, 400);
  }
  return parsed;
}

function asPositiveNumber(value, fieldName, allowZero = false) {
  const parsed = Number(value);
  const isValid = allowZero ? parsed >= 0 : parsed > 0;
  if (Number.isNaN(parsed) || !isValid) {
    throw new ApiError(`${fieldName} must be ${allowZero ? 'a non-negative' : 'a positive'} number`, 400);
  }
  return parsed;
}

function normalizeMsiTerms(rawTerms, { allowEmpty = false } = {}) {
  if (rawTerms === null || rawTerms === undefined || rawTerms === '') {
    return allowEmpty ? [] : [...DEFAULT_CREDIT_TERMS];
  }

  let terms = rawTerms;

  if (typeof terms === 'string') {
    try {
      terms = JSON.parse(terms);
    } catch {
      terms = terms
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(terms)) {
    throw new ApiError('availableMsiTerms must be an array of months', 400);
  }

  const normalized = [...new Set(
    terms
      .map((item) => asInteger(item, 'availableMsiTerms item'))
      .filter((item) => item >= 2 && item <= 48)
  )].sort((a, b) => a - b);

  if (!normalized.length) {
    if (allowEmpty) return [];
    throw new ApiError('availableMsiTerms must contain values between 2 and 48 months', 400);
  }

  return normalized;
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function createDateWithDay(year, monthIndex, day) {
  const d = Math.min(day, lastDayOfMonth(year, monthIndex));
  return startOfDay(new Date(year, monthIndex, d));
}

function normalizeDateValue(dateValue, fieldName) {
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      throw new ApiError(`${fieldName} must be a valid date`, 400);
    }
    return startOfDay(dateValue);
  }

  const parsed = typeof dateValue === 'string'
    ? parseISO(dateValue)
    : new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(`${fieldName} must be a valid YYYY-MM-DD`, 400);
  }
  return startOfDay(parsed);
}

function summarizeByType(rows) {
  const result = { income: 0, expense: 0 };
  rows.forEach((row) => {
    const cents = toCents(row.total || 0);
    if (row.type === 'income') result.income += Number.isNaN(cents) ? 0 : cents;
    if (row.type === 'expense') result.expense += Number.isNaN(cents) ? 0 : cents;
  });
  return result;
}

function buildCreditCycleDates(cutoffDay, dueDay) {
  const today = startOfDay(new Date());
  const year = today.getFullYear();
  const month = today.getMonth();

  const cutoffThisMonth = createDateWithDay(year, month, cutoffDay);
  const lastCutoffDate = today >= cutoffThisMonth ? cutoffThisMonth : addMonths(cutoffThisMonth, -1);
  const prevCutoffDate = addMonths(lastCutoffDate, -1);
  const nextCutoffDate = addMonths(lastCutoffDate, 1);

  let dueDate = createDateWithDay(lastCutoffDate.getFullYear(), lastCutoffDate.getMonth(), dueDay);
  if (dueDate <= lastCutoffDate) {
    dueDate = addMonths(dueDate, 1);
  }

  return {
    today,
    prevCutoffDate,
    lastCutoffDate,
    nextCutoffDate,
    statementStartDate: addDays(prevCutoffDate, 1),
    currentCycleStartDate: addDays(lastCutoffDate, 1),
    dueDate
  };
}

function computeCreditSnapshot(card, movementRows) {
  const creditLimitCents = toCents(card.creditLimit || 0);
  const initialDebtCents = toCents(card.initialBalance || 0);
  const annualRate = Number(card.annualInterestRate || 0);
  const minimumRate = Number(card.minimumPaymentRate || 100);
  const fullStatementRequired = minimumRate >= 100;
  const latePaymentFeeCents = toCents(card.latePaymentFee || 0);

  const { statementCutoffDay, paymentDueDay } = card;
  if (!statementCutoffDay || !paymentDueDay) {
    throw new ApiError('Credit card requires statementCutoffDay and paymentDueDay', 400);
  }

  const dates = buildCreditCycleDates(statementCutoffDay, paymentDueDay);

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let statementBalanceCents = 0;
  let paymentsAfterCutoffCents = 0;
  let currentCycleChargesCents = 0;

  const opTotals = {
    purchase: 0,
    payment: 0,
    refund: 0,
    interest: 0,
    late_fee: 0,
    cash_advance: 0
  };

  movementRows.forEach((movement) => {
    const amountCents = toCents(movement.amount || 0);
    if (Number.isNaN(amountCents)) return;

    const movementDate = normalizeDateValue(movement.date, 'movement date');

    if (movement.type === 'income') totalIncomeCents += amountCents;
    if (movement.type === 'expense') totalExpenseCents += amountCents;

    if (movement.operationType && Object.hasOwn(opTotals, movement.operationType)) {
      opTotals[movement.operationType] += amountCents;
    }

    if (movementDate >= dates.statementStartDate && movementDate <= dates.lastCutoffDate) {
      statementBalanceCents += movement.type === 'expense' ? amountCents : -amountCents;
    }

    if (movementDate > dates.lastCutoffDate && movementDate <= dates.today && movement.type === 'income') {
      paymentsAfterCutoffCents += amountCents;
    }

    if (movementDate >= dates.currentCycleStartDate && movementDate <= dates.today && movement.type === 'expense') {
      currentCycleChargesCents += amountCents;
    }
  });

  const outstandingBalanceCents = initialDebtCents + totalExpenseCents - totalIncomeCents;
  const availableCreditCents = creditLimitCents - outstandingBalanceCents;
  const statementDebtCents = Math.max(statementBalanceCents, 0);
  const amountDueCents = Math.max(statementDebtCents - paymentsAfterCutoffCents, 0);
  const minimumPaymentDueCents = amountDueCents > 0
    ? (fullStatementRequired ? amountDueCents : Math.round(amountDueCents * (minimumRate / 100)))
    : 0;

  const daysUntilDue = differenceInCalendarDays(dates.dueDate, dates.today);
  const isPastDue = daysUntilDue < 0 && amountDueCents > 0;
  const daysPastDue = isPastDue ? Math.abs(daysUntilDue) : 0;

  const dailyRate = annualRate > 0 ? (annualRate / 100) / 360 : 0;
  const estimatedInterestCents = isPastDue
    ? Math.round(amountDueCents * dailyRate * daysPastDue)
    : 0;

  return {
    cardType: 'credit',
    initialBalance: centsToNumber(initialDebtCents),
    totalIncome: centsToNumber(totalIncomeCents),
    totalExpense: centsToNumber(totalExpenseCents),
    balance: centsToNumber(availableCreditCents),
    outstandingBalance: centsToNumber(outstandingBalanceCents),
    availableCredit: centsToNumber(availableCreditCents),
    creditLimit: centsToNumber(creditLimitCents),
    utilizationRate: creditLimitCents > 0
      ? Number(((outstandingBalanceCents / creditLimitCents) * 100).toFixed(2))
      : 0,
    statementCutoffDay,
    paymentDueDay,
    annualInterestRate: Number(Number(card.annualInterestRate || 0).toFixed(2)),
    minimumPaymentRate: Number(Number(card.minimumPaymentRate || 0).toFixed(2)),
    fullStatementRequired,
    latePaymentFee: centsToNumber(latePaymentFeeCents),
    annualFee: centsToNumber(toCents(card.annualFee || 0)),
    annualFeeMonth: card.annualFeeMonth || null,
    msiEnabled: Boolean(card.msiEnabled),
    availableMsiTerms: card.msiEnabled
      ? normalizeMsiTerms(card.availableMsiTerms ?? DEFAULT_CREDIT_TERMS)
      : [],
    statementBalance: centsToNumber(statementDebtCents),
    amountDue: centsToNumber(amountDueCents),
    minimumPaymentDue: centsToNumber(minimumPaymentDueCents),
    currentCycleCharges: centsToNumber(currentCycleChargesCents),
    nextCutoffDate: format(dates.nextCutoffDate, 'yyyy-MM-dd'),
    paymentDueDate: format(dates.dueDate, 'yyyy-MM-dd'),
    daysUntilDue,
    isPastDue,
    estimatedInterestIfUnpaid: centsToNumber(estimatedInterestCents),
    estimatedLateFeeIfUnpaid: isPastDue ? centsToNumber(latePaymentFeeCents) : 0,
    breakdown: {
      purchase: centsToNumber(opTotals.purchase),
      payment: centsToNumber(opTotals.payment),
      refund: centsToNumber(opTotals.refund),
      interest: centsToNumber(opTotals.interest),
      lateFee: centsToNumber(opTotals.late_fee),
      cashAdvance: centsToNumber(opTotals.cash_advance)
    }
  };
}

function validateCardPayload(payload, isUpdate = false) {
  const cardType = payload.cardType || 'debit';
  if (!['debit', 'credit'].includes(cardType)) {
    throw new ApiError('cardType must be "debit" or "credit"', 400);
  }

  if (!isUpdate || payload.name !== undefined) {
    if (!payload.name || typeof payload.name !== 'string') {
      throw new ApiError('name is required', 400);
    }
  }

  if (payload.initialBalance !== undefined) {
    asPositiveNumber(payload.initialBalance, 'initialBalance', true);
  }

  if (cardType === 'credit') {
    asPositiveNumber(payload.creditLimit, 'creditLimit');

    const cutoff = asInteger(payload.statementCutoffDay, 'statementCutoffDay');
    if (cutoff < 1 || cutoff > 28) {
      throw new ApiError('statementCutoffDay must be between 1 and 28', 400);
    }

    const dueDay = asInteger(payload.paymentDueDay, 'paymentDueDay');
    if (dueDay < 1 || dueDay > 28) {
      throw new ApiError('paymentDueDay must be between 1 and 28', 400);
    }

    const annualRate = asPositiveNumber(payload.annualInterestRate ?? 55, 'annualInterestRate', true);
    if (annualRate > 120) {
      throw new ApiError('annualInterestRate cannot be greater than 120%', 400);
    }

    const minimumRate = asPositiveNumber(payload.minimumPaymentRate ?? 100, 'minimumPaymentRate', true);
    if (minimumRate <= 0 || minimumRate > 100) {
      throw new ApiError('minimumPaymentRate must be between 1 and 100', 400);
    }

    asPositiveNumber(payload.latePaymentFee ?? 0, 'latePaymentFee', true);

    const annualFee = asPositiveNumber(payload.annualFee ?? 0, 'annualFee', true);
    if (annualFee > 0) {
      const annualFeeMonth = asInteger(payload.annualFeeMonth ?? 1, 'annualFeeMonth');
      if (annualFeeMonth < 1 || annualFeeMonth > 12) {
        throw new ApiError('annualFeeMonth must be between 1 and 12', 400);
      }
    }

    const msiEnabled = Boolean(payload.msiEnabled ?? false);
    if (msiEnabled) {
      normalizeMsiTerms(payload.availableMsiTerms ?? DEFAULT_CREDIT_TERMS);
    } else if (payload.availableMsiTerms !== undefined) {
      normalizeMsiTerms(payload.availableMsiTerms, { allowEmpty: true });
    }
  }
}

function normalizeCardWritePayload(payload, existingCard = null) {
  const cardType = payload.cardType || existingCard?.cardType || 'debit';

  const normalized = {
    name: payload.name ?? existingCard?.name,
    cardType,
    initialBalance: payload.initialBalance ?? existingCard?.initialBalance ?? 0,
    notes: payload.notes ?? existingCard?.notes ?? null
  };

  if (cardType === 'credit') {
    normalized.creditLimit = payload.creditLimit ?? existingCard?.creditLimit ?? 10000;
    normalized.statementCutoffDay = payload.statementCutoffDay ?? existingCard?.statementCutoffDay ?? 20;
    normalized.paymentDueDay = payload.paymentDueDay ?? existingCard?.paymentDueDay ?? 10;
    normalized.annualInterestRate = payload.annualInterestRate ?? existingCard?.annualInterestRate ?? 55;
    normalized.minimumPaymentRate = payload.minimumPaymentRate ?? existingCard?.minimumPaymentRate ?? 100;
    normalized.latePaymentFee = payload.latePaymentFee ?? existingCard?.latePaymentFee ?? 0;
    normalized.annualFee = payload.annualFee ?? existingCard?.annualFee ?? 0;
    normalized.annualFeeMonth = Number(normalized.annualFee) > 0
      ? (payload.annualFeeMonth ?? existingCard?.annualFeeMonth ?? 1)
      : null;
    normalized.msiEnabled = payload.msiEnabled ?? existingCard?.msiEnabled ?? false;
    normalized.availableMsiTerms = normalized.msiEnabled
      ? normalizeMsiTerms(payload.availableMsiTerms ?? existingCard?.availableMsiTerms ?? DEFAULT_CREDIT_TERMS)
      : [];
  } else {
    normalized.creditLimit = null;
    normalized.statementCutoffDay = null;
    normalized.paymentDueDay = null;
    normalized.annualInterestRate = 0;
    normalized.minimumPaymentRate = 100;
    normalized.latePaymentFee = 0;
    normalized.annualFee = 0;
    normalized.annualFeeMonth = null;
    normalized.msiEnabled = false;
    normalized.availableMsiTerms = [];
  }

  return normalized;
}

function shapeCardListItem(card, movementTotalsByType) {
  const plain = card.toJSON();
  const totals = movementTotalsByType.get(card.id) || { income: 0, expense: 0 };
  const initialCents = toCents(plain.initialBalance || 0);

  if (plain.cardType === 'credit') {
    const outstandingCents = initialCents + totals.expense - totals.income;
    const creditLimitCents = toCents(plain.creditLimit || 0);
    const availableCents = creditLimitCents - outstandingCents;

    return {
      ...plain,
      outstandingBalance: centsToNumber(outstandingCents),
      availableCredit: centsToNumber(availableCents),
      currentBalance: centsToNumber(availableCents)
    };
  }

  const balanceCents = initialCents + totals.income - totals.expense;
  return {
    ...plain,
    outstandingBalance: 0,
    availableCredit: null,
    currentBalance: centsToNumber(balanceCents)
  };
}

export async function createCard(payload) {
  const normalized = normalizeCardWritePayload(payload);
  validateCardPayload(normalized, false);
  return Card.create(normalized);
}

export async function getCardById(id) {
  return Card.findByPk(id, {
    include: [{ model: CardMovement, as: 'card_movements' }],
    order: [[{ model: CardMovement, as: 'card_movements' }, 'date', 'DESC']]
  });
}

export async function listCards({ limit = 50, offset = 0, q = null } = {}) {
  const where = {};
  if (q) {
    where.name = { [Op.like]: `%${q}%` };
  }

  const cards = await Card.findAll({
    where,
    order: [['name', 'ASC']],
    limit,
    offset
  });

  if (!cards.length) return [];

  const cardIds = cards.map((card) => card.id);

  const movementRows = await CardMovement.findAll({
    where: {
      cardId: { [Op.in]: cardIds }
    },
    attributes: [
      'cardId',
      'type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['cardId', 'type'],
    raw: true
  });

  const totalsByCard = new Map();
  movementRows.forEach((row) => {
    const current = totalsByCard.get(row.cardId) || { income: 0, expense: 0 };
    const cents = toCents(row.total || 0);
    if (Number.isNaN(cents)) return;

    if (row.type === 'income') current.income += cents;
    if (row.type === 'expense') current.expense += cents;

    totalsByCard.set(row.cardId, current);
  });

  return cards.map((card) => shapeCardListItem(card, totalsByCard));
}

export async function updateCard(id, payload) {
  return sequelize.transaction(async (t) => {
    const card = await Card.findByPk(id, { transaction: t });
    if (!card) return null;

    const normalized = normalizeCardWritePayload(payload, card);
    validateCardPayload(normalized, true);

    Object.entries(normalized).forEach(([key, value]) => {
      card[key] = value;
    });

    await card.save({ transaction: t });
    return card;
  });
}

export async function deleteCard(id) {
  return sequelize.transaction(async (t) => {
    const card = await Card.findByPk(id, { transaction: t });
    if (!card) return null;

    await card.destroy({ transaction: t });
    return true;
  });
}

export async function getCardSummary(cardId) {
  const card = await Card.findByPk(cardId);
  if (!card) throw new ApiError('Card not found', 404);

  const groupedByTypeRows = await CardMovement.findAll({
    where: { cardId },
    attributes: [
      'type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['type'],
    raw: true
  });

  const totals = summarizeByType(groupedByTypeRows);

  if (card.cardType === 'credit') {
    const movementRows = await CardMovement.findAll({
      where: { cardId },
      attributes: ['date', 'type', 'operationType', 'amount'],
      raw: true
    });

    return {
      cardId,
      name: card.name,
      ...computeCreditSnapshot(card, movementRows)
    };
  }

  const initialCents = toCents(card.initialBalance || 0);
  const balanceCents = initialCents + totals.income - totals.expense;

  return {
    cardId,
    name: card.name,
    cardType: 'debit',
    initialBalance: centsToNumber(initialCents),
    totalIncome: centsToNumber(totals.income),
    totalExpense: centsToNumber(totals.expense),
    balance: centsToNumber(balanceCents)
  };
}
