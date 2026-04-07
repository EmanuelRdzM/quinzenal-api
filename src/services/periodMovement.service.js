import { Op } from 'sequelize';
import models, { sequelize } from '../database/models/associateModels.js';
import { findOrCreatePeriodByDate } from './period.service.js';

const { PeriodMovement, Period, TransactionCategory } = models;

const VALID_TYPES = ['income', 'expense'];
const VALID_PAYMENT_METHODS = ['cash', 'card'];

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function ensureMovementDateInsidePeriod(period, movementDate) {
  if (!period || !movementDate) return;
  if (movementDate < period.startDate || movementDate > period.endDate) {
    throw new Error('movementDate must be inside selected period range');
  }
}

function validateMovementPayload(payload, { partial = false } = {}) {
  const { type, concept, amount, paymentMethod, categoryId, movementDate } = payload;

  if (!partial || type !== undefined) {
    if (!VALID_TYPES.includes(type)) throw new Error('type must be "income" or "expense"');
  }

  if (!partial || concept !== undefined) {
    if (!concept || typeof concept !== 'string') throw new Error('concept required');
  }

  if (!partial || amount !== undefined) {
  const am = parseFloat(amount);
    if (Number.isNaN(am) || am <= 0) throw new Error('amount must be positive number');
  }

  if (!partial || paymentMethod !== undefined) {
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error('paymentMethod must be "cash" or "card"');
    }
  }

  if (!partial || categoryId !== undefined) {
    if (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0) {
      throw new Error('categoryId must be a positive integer');
    }
  }

  if (movementDate !== undefined) {
    const normalized = toDateOnly(movementDate);
    if (!normalized) throw new Error('movementDate must be a valid date');
  }
}

export async function createMovement(payload, { autoCreatePeriod = true } = {}) {
  validateMovementPayload(payload);

  const t = await sequelize.transaction();
  try {
    const movementDate = toDateOnly(payload.movementDate) || toDateOnly(new Date());

    const category = await TransactionCategory.findByPk(Number(payload.categoryId), { transaction: t });
    if (!category || !category.isActive) throw new Error('categoryId not found or inactive');

    let periodId = payload.periodId;
    if (!periodId) {
      const period = await findOrCreatePeriodByDate(movementDate, { autoCreate: autoCreatePeriod, transaction: t });
      if (!period) throw new Error('No period found for given date and autoCreatePeriod is false');
      periodId = period.id;
    } else {
      const p = await models.Period.findByPk(periodId, { transaction: t });
      if (!p) throw new Error('periodId not found');
      ensureMovementDateInsidePeriod(p, movementDate);
    }

    const createObj = {
      periodId,
      type: payload.type,
      concept: payload.concept,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      categoryId: Number(payload.categoryId),
      movementDate,
      description: payload.description || null
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
    include: [
      { model: Period, as: 'period' },
      { model: TransactionCategory, as: 'category', attributes: ['id', 'name', 'slug'] }
    ]
  });
}

export async function listMovements({ periodId = null, categoryId = null, type = null, startDate = null, endDate = null, limit = 100, offset = 0 } = {}) {
  const where = {};
  if (periodId) where.periodId = periodId;
  if (categoryId) where.categoryId = categoryId;
  if (type && VALID_TYPES.includes(type)) where.type = type;

  if (startDate || endDate) {
    where.movementDate = {};
    if (startDate) where.movementDate[Op.gte] = startDate;
    if (endDate) where.movementDate[Op.lte] = endDate;
  }

  return PeriodMovement.findAll({
    where,
    include: [{ model: TransactionCategory, as: 'category', attributes: ['id', 'name', 'slug'] }],
    order: [['movementDate', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset
  });
}

export async function updateMovement(id, payload) {
  validateMovementPayload(payload, { partial: true });

  const t = await sequelize.transaction();
  try {
    const m = await PeriodMovement.findByPk(id, { transaction: t });
    if (!m) {
      await t.rollback();
      return null;
    }

    const targetPeriodId = payload.periodId !== undefined ? Number(payload.periodId) : m.periodId;
    const targetMovementDate = payload.movementDate !== undefined ? toDateOnly(payload.movementDate) : m.movementDate;

    if (payload.periodId !== undefined && payload.periodId !== m.periodId) {
      const p = await Period.findByPk(payload.periodId, { transaction: t });
      if (!p) throw new Error('Target periodId not found');
      ensureMovementDateInsidePeriod(p, targetMovementDate);
      m.periodId = Number(payload.periodId);
    }

    if (payload.movementDate !== undefined && targetPeriodId === m.periodId) {
      const period = await Period.findByPk(targetPeriodId, { transaction: t });
      ensureMovementDateInsidePeriod(period, targetMovementDate);
    }

    if (payload.categoryId !== undefined) {
      const category = await TransactionCategory.findByPk(Number(payload.categoryId), { transaction: t });
      if (!category || !category.isActive) throw new Error('categoryId not found or inactive');
      m.categoryId = Number(payload.categoryId);
    }

    const allowed = ['type', 'concept', 'amount', 'paymentMethod', 'description'];
    allowed.forEach(k => { if (payload[k] !== undefined) m[k] = payload[k]; });
    if (payload.movementDate !== undefined) m.movementDate = targetMovementDate;

    await m.save({ transaction: t });
    await t.commit();
    return m;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function deleteMovement(id) {
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

export async function getPeriodSummary(periodId) {
  const rows = await PeriodMovement.findAll({
    where: { periodId },
    attributes: [
      'type',
      'paymentMethod',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['type', 'paymentMethod'],
    raw: true
  });

  const movements = await PeriodMovement.findAll({
    where: { periodId },
    include: [{ model: TransactionCategory, as: 'category', attributes: ['id', 'name', 'slug'] }],
    attributes: ['type', 'amount', 'categoryId'],
    raw: true,
    nest: true
  });

  const counts = await PeriodMovement.count({ where: { periodId } });

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

  const expenseByCategoryMap = new Map();
  movements.forEach(item => {
    if (item.type !== 'expense') return;
    const key = String(item.categoryId);
    const agg = expenseByCategoryMap.get(key) || {
      categoryId: item.categoryId,
      categoryName: item.category?.name || 'Sin categoria',
      categorySlug: item.category?.slug || 'sin-categoria',
      total: 0
    };
    agg.total += Number(item.amount || 0);
    expenseByCategoryMap.set(key, agg);
  });

  const expenseByCategory = Array.from(expenseByCategoryMap.values()).sort((a, b) => b.total - a.total);

  const topExpenseCategory = expenseByCategory[0] || null;

  return {
    incomeCash, incomeCard, expenseCash, expenseCard,
    totalIncome, totalExpense,
    balanceCash: incomeCash - expenseCash,
    balanceCard: incomeCard - expenseCard,
    balanceTotal: totalIncome - totalExpense,
    transactionsCount: counts,
    expenseByCategory,
    topExpenseCategory
  };
}

export async function getPeriodAnalytics(periodId) {
  const movements = await PeriodMovement.findAll({
    where: { periodId },
    include: [{ model: TransactionCategory, as: 'category', attributes: ['id', 'name', 'slug'] }],
    attributes: ['id', 'type', 'amount', 'movementDate', 'categoryId'],
    order: [['movementDate', 'ASC']],
    raw: true,
    nest: true
  });

  const dailyMap = new Map();
  const categoryTotals = new Map();

  movements.forEach(item => {
    const day = item.movementDate;
    const value = Number(item.amount || 0);
    const current = dailyMap.get(day) || { movementDate: day, income: 0, expense: 0 };
    current[item.type] += value;
    dailyMap.set(day, current);

    const key = `${item.type}:${item.categoryId}`;
    const agg = categoryTotals.get(key) || {
      type: item.type,
      categoryId: item.categoryId,
      categoryName: item.category?.name || 'Sin categoria',
      categorySlug: item.category?.slug || 'sin-categoria',
      total: 0
    };
    agg.total += value;
    categoryTotals.set(key, agg);
  });

  return {
    dailySeries: Array.from(dailyMap.values()),
    categoryBreakdown: Array.from(categoryTotals.values()).sort((a, b) => b.total - a.total)
  };
}

export async function getMonthlyAnalytics({ months = 6 } = {}) {
  const safeMonths = Math.min(24, Math.max(3, Number(months) || 6));
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (safeMonths - 1), 1);
  const fromDate = from.toISOString().slice(0, 10);

  const movements = await PeriodMovement.findAll({
    where: { movementDate: { [Op.gte]: fromDate } },
    include: [{ model: TransactionCategory, as: 'category', attributes: ['id', 'name', 'slug'] }],
    attributes: ['type', 'amount', 'movementDate', 'categoryId'],
    raw: true,
    nest: true
  });

  const buckets = [];
  for (let i = safeMonths - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
    buckets.push({ key, label, income: 0, expense: 0 });
  }

  const bucketMap = new Map(buckets.map(item => [item.key, item]));
  const categoryExpenseMap = new Map();

  movements.forEach(item => {
    const movementDate = toDateOnly(item.movementDate);
    const monthKey = movementDate.slice(0, 7);
    const bucket = bucketMap.get(monthKey);
    if (bucket) {
      bucket[item.type] += Number(item.amount || 0);
    }

    if (item.type === 'expense') {
      const categoryKey = String(item.categoryId);
      const agg = categoryExpenseMap.get(categoryKey) || {
        categoryId: item.categoryId,
        categoryName: item.category?.name || 'Sin categoria',
        categorySlug: item.category?.slug || 'sin-categoria',
        total: 0
      };
      agg.total += Number(item.amount || 0);
      categoryExpenseMap.set(categoryKey, agg);
    }
  });

  return {
    months: buckets,
    expenseByCategory: Array.from(categoryExpenseMap.values()).sort((a, b) => b.total - a.total)
  };
}
