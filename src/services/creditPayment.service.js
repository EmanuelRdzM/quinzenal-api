import models, { sequelize } from '../database/models/associateModels.js';
import ApiError from '../shared/errors/ApiError.js';
import { parseISO, isValid } from 'date-fns';
import { Op } from 'sequelize';

const { CreditPayment, Credit } = models;

/* Helpers para centavos */
function toCents(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100);
}

function fromCents(cents) {
  // devuelve string "123.45" compatible con DECIMAL(12,2)
  return (cents / 100).toFixed(2);
}
function centsToNumber(cents) {
  return cents / 100;
}

/* Validación básica del payload */
function validatePaymentPayload(payload) {
  const { creditId, paymentNumber, amount, date } = payload;
  if (!creditId) throw new ApiError('creditId is required', 400);

  const amCents = toCents(amount);
  if (Number.isNaN(amCents) || amCents <= 0) throw new ApiError('amount must be a positive number', 400);

  if (!date) throw new ApiError('date is required (YYYY-MM-DD)', 400);
  const d = parseISO(date);
  if (!isValid(d)) throw new ApiError('date must be a valid YYYY-MM-DD', 400);
}

/**
 * createCreditPayment
 * payload: { creditId, paymentNumber, amount, date, allowOverpay = false }
 */
export async function createCreditPayment(payload) {
  validatePaymentPayload(payload);

  return sequelize.transaction(async (t) => {
    const credit = await Credit.findByPk(payload.creditId, { transaction: t });
    if (!credit) throw new ApiError('Credit not found', 404);

    const lastPayment = await CreditPayment.findOne({
      where: { creditId: payload.creditId },
      order: [['paymentNumber', 'DESC']],
      transaction: t
    });

    const nextPaymentNumber = lastPayment ? lastPayment.paymentNumber + 1 : 1;

    // evitar duplicados de paymentNumber
    const exists = await CreditPayment.findOne({
      where: { creditId: payload.creditId, paymentNumber: nextPaymentNumber },
      transaction: t
    });
    if (exists) throw new ApiError('Payment number already recorded for this credit', 400);

    // Validaciones monetarias en centavos
    const amountCents = toCents(payload.amount);
    const totalCents = toCents(parseFloat(credit.totalAmount));

    // obtener suma de pagos existentes (puede devolver string dependiendo de dialecto)
    const sumRow = await CreditPayment.findAll({
      where: { creditId: payload.creditId },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalPaid']],
      raw: true,
      transaction: t
    });
    const existingPaid = toCents(parseFloat(sumRow[0].totalPaid || 0));

    // regla por defecto: no permitir que la suma exceda el total del crédito
    const allowOverpay = payload.allowOverpay === true;
    if (!allowOverpay && (existingPaid + amountCents) > totalCents) {
      throw new ApiError('Payment amount would exceed credit total. Provide allowOverpay flag if you want to allow it.', 400);
    }

    const createObj = {
      creditId: payload.creditId,
      paymentNumber: nextPaymentNumber,
      amount: fromCents(amountCents),
      date: payload.date
    };

    const created = await CreditPayment.create(createObj, { transaction: t });
    return created;
  });
}

export async function listCreditPayments({ creditId = null, limit = 200, offset = 0, fromDate = null, toDate = null } = {}) {
  const where = {};
  if (creditId) where.creditId = creditId;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date[Op.gte] = fromDate;
    if (toDate) where.date[Op.lte] = toDate;
  }

  return CreditPayment.findAll({
    where,
    order: [['paymentNumber', 'ASC']],
    limit,
    offset
  });
}

export async function getCreditPaymentById(id) {
  return CreditPayment.findByPk(id, { include: [{ model: Credit, as: 'credit' }] });
}

/**
 * updateCreditPayment:
 * - permite cambiar creditId/paymentNumber/amount/date
 * - valida colisiones y que no exceda total (si cambia amount o creditId)
 */
export async function updateCreditPayment(id, payload) {
  return sequelize.transaction(async (t) => {
    const m = await CreditPayment.findByPk(id, { transaction: t });
    
    if (!m) return null;

    // actualizar campos permitidos
    const allowed = ['amount', 'date'];
    allowed.forEach(k => { if (payload[k] !== undefined) m[k] = payload[k]; });

    // validar amount/date
    const amCents = toCents(parseFloat(m.amount));
    if (Number.isNaN(amCents) || amCents <= 0) throw new ApiError('amount must be positive number', 400);
    
    const d = parseISO(m.date);
    if (!isValid(d)) throw new ApiError('date must be a valid YYYY-MM-DD', 400);

    // validar que nuevo monto no haga que la suma exceda el total del crédito
    const credit = await Credit.findByPk(m.creditId, { transaction: t });
    if (!credit) throw new ApiError('Credit not found', 404);
    const totalCents = toCents(parseFloat(credit.totalAmount));

    // suma de pagos excluyendo este registro
    const sumRow = await CreditPayment.findAll({
      where: { creditId: m.creditId, id: { [Op.ne]: id } },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalPaid']],
      raw: true,
      transaction: t
    });
    const paidExcludingThis = toCents(parseFloat(sumRow[0].totalPaid || 0));

    const allowOverpay = payload.allowOverpay === true;
    if (!allowOverpay && (paidExcludingThis + amCents) > totalCents) {
      throw new ApiError('Updated amount would exceed credit total. Provide allowOverpay flag if you want to allow it.', 400);
    }

    await m.save({ transaction: t });
    return m;
  });
}

export async function deleteCreditPayment(id) {
  return sequelize.transaction(async (t) => {
    const m = await CreditPayment.findByPk(id, { transaction: t });
    if (!m) return null;
    await m.destroy({ transaction: t });
    return true;
  });
}