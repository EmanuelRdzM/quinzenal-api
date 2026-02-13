import models, { sequelize } from '../database/models/associateModels.js';
import ApiError from '../shared/errors/ApiError.js';
import { Op } from 'sequelize';

const { Credit, CreditPayment } = models;

/**
 * Helpers: operar en centavos enteros para evitar floats.
 */
function toCents(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return NaN;
  // redondeo al centavo más cercano para la conversión input -> centavos
  return Math.round(n * 100);
}
function fromCents(cents) {
  return (cents / 100).toFixed(2); // devuelve string con 2 decimales
}
function toNumberFromCents(cents) {
  return cents / 100;
}

export async function createCredit({ name, totalAmount, months, monthlyAmount = null, startDate = null, notes = null }) {
  if (!name || typeof name !== 'string') throw new ApiError('name is required', 400);
  const total = parseFloat(totalAmount);
  const m = parseInt(months, 10);
  if (Number.isNaN(total) || total <= 0) throw new ApiError('totalAmount must be a positive number', 400);
  if (Number.isNaN(m) || m <= 0) throw new ApiError('months must be a positive integer', 400);

  // usar centavos para calcular
  const totalCents = toCents(total);
  const baseCents = Math.floor(totalCents / m);
  const remainder = totalCents - baseCents * m;

  // monthly default: base (dos decimales)
  let monthlyCents = baseCents;

  // si el usuario envía monthlyAmount, validamos razonablemente:
  if (monthlyAmount !== null && monthlyAmount !== undefined) {
    const providedCents = toCents(monthlyAmount);
    if (Number.isNaN(providedCents) || providedCents <= 0) throw new ApiError('monthlyAmount must be positive number', 400);

    // referencia: promedio redondeado al centavo
    const avgCentsRounded = Math.round(totalCents / m);

    // aceptamos si el monto proporcionado está cerca del promedio (±1 cent)
    // o si coincide con la base (cuando se usa ajuste en último pago)
    if (Math.abs(providedCents - avgCentsRounded) > 1 && providedCents !== baseCents) {
      throw new ApiError(`monthlyAmount inconsistent with totalAmount/months. expected ~ ${(avgCentsRounded/100).toFixed(2)}`, 400);
    }
    monthlyCents = providedCents;
  }

  const created = await Credit.create({
    name,
    totalAmount: fromCents(totalCents),      // guarda "1000.00"
    months: m,
    monthlyAmount: fromCents(monthlyCents),  // guarda base (referencia)
    startDate: startDate || null,
    notes: notes || null
  });

  return created;
}

export async function listCredits({ limit = 50, offset = 0 } = {}) {
  return Credit.findAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });
}

export async function getCreditById(id) {
  return Credit.findByPk(id, {
    include: [{ model: CreditPayment, as: 'payments', order: [['paymentNumber', 'ASC']] }]
  });
}

export async function updateCredit(id, payload) {
  return sequelize.transaction(async (t) => {
    const c = await Credit.findByPk(id, { transaction: t });
    if (!c) return null;

    const allowed = ['name', 'totalAmount', 'months', 'monthlyAmount', 'startDate', 'notes'];
    allowed.forEach(k => {
      if (payload[k] !== undefined) c[k] = payload[k];
    });

    // validations if months / totalAmount changed -> ensure payments are consistent
    const total = parseFloat(c.totalAmount);
    const months = parseInt(c.months, 10);
    if (Number.isNaN(total) || total <= 0) throw new ApiError('totalAmount must be a positive number', 400);
    if (Number.isNaN(months) || months <= 0) throw new ApiError('months must be a positive integer', 400);

    // recompute using centavos
    const totalCents = toCents(total);
    const baseCents = Math.floor(totalCents / months);

    if (payload.monthlyAmount === undefined || payload.monthlyAmount === null) {
      c.monthlyAmount = fromCents(baseCents);
    } else {
      const mAmt = parseFloat(c.monthlyAmount);
      const mAmtCents = toCents(mAmt);
      if (Number.isNaN(mAmtCents) || mAmtCents <= 0) throw new ApiError('monthlyAmount must be positive number', 400);
      // validar consistencia similar a create
      const avgCentsRounded = Math.round(totalCents / months);
      if (Math.abs(mAmtCents - avgCentsRounded) > 1 && mAmtCents !== baseCents) {
        throw new ApiError(`monthlyAmount inconsistent with totalAmount/months. expected ~ ${(avgCentsRounded/100).toFixed(2)}`, 400);
      }
    }

    // If months reduced, check there aren't payments with paymentNumber > months
    if (payload.months !== undefined) {
      const maxPayment = await CreditPayment.max('paymentNumber', { where: { creditId: id }, transaction: t });
      if (maxPayment && maxPayment > months) {
        throw new ApiError('Cannot reduce months: there are payments with paymentNumber greater than new months', 400);
      }
    }

    await c.save({ transaction: t });
    return c;
  });
}

export async function deleteCredit(id) {
  return sequelize.transaction(async (t) => {
    const c = await Credit.findByPk(id, { transaction: t });
    if (!c) return null;

    // opcional: bloquear eliminar si existen pagos
    const cnt = await CreditPayment.count({ where: { creditId: id }, transaction: t });
    if (cnt > 0) {
      throw new ApiError('Cannot delete credit with payments. Delete payments first.', 400);
    }

    await c.destroy({ transaction: t });
    return true;
  });
}

/**
 * Resumen del crédito
 */
export async function getCreditSummary(creditId) {
  const credit = await Credit.findByPk(creditId, { include: [{ model: CreditPayment, as: 'payments' }] });
  if (!credit) throw new ApiError('Credit not found', 404);

  // sumar pagos (usar SQL SUM puede devolver string dependiendo del dialecto)
  const rows = await CreditPayment.findAll({
    where: { creditId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalPaid'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'paymentsMade']
    ],
    raw: true
  });

  const totalPaidCents = toCents(parseFloat(rows[0].totalPaid || 0));
  const paymentsMadeCount = parseInt(rows[0].paymentsMade || 0, 10);
  const totalCents = toCents(parseFloat(credit.totalAmount || 0));
  const remainingCents = totalCents - totalPaidCents;

  // calcular nextPaymentNumber: primer number entre 1..months que no exista
  const existing = await CreditPayment.findAll({
    where: { creditId },
    attributes: ['paymentNumber'],
    raw: true
  });
  const existSet = new Set(existing.map(r => parseInt(r.paymentNumber, 10)));
  let nextPaymentNumber = null;
  for (let i = 1; i <= credit.months; i++) {
    if (!existSet.has(i)) { nextPaymentNumber = i; break; }
  }

  return {
    creditId,
    name: credit.name,
    totalAmount: Number((totalCents / 100).toFixed(2)),
    months: credit.months,
    monthlyAmount: Number(parseFloat(credit.monthlyAmount).toFixed(2)),
    totalPaid: Number((totalPaidCents / 100).toFixed(2)),
    paymentsMadeCount,
    remaining: Number((remainingCents / 100).toFixed(2)),
    nextPaymentNumber,
    payments: credit.payments || []
  };
}