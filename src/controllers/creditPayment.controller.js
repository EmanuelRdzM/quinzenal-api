import * as mvService from '../services/creditPayment.service.js';
import ApiError from '../shared/errors/ApiError.js';

export async function createPayment(req, res, next) {
  try {
    const payload = {
      creditId: parseInt(req.params.creditId || req.body.creditId),
      amount: req.body.amount,
      date: req.body.date
    };
    const created = await mvService.createCreditPayment(payload);
    return res.status(201).json(created);
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function listPayments(req, res, next) {
  try {
    const creditId = req.params.creditId ? parseInt(req.params.creditId) : null;
    const { limit, offset, fromDate, toDate } = req.query;
    const rows = await mvService.listCreditPayments({
      creditId,
      limit: limit ? parseInt(limit) : 200,
      offset: offset ? parseInt(offset) : 0,
      fromDate,
      toDate
    });
    return res.json(rows);
  } catch (err) { next(err); }
}

export async function getPayment(req, res, next) {
  try {
    const id = req.params.id;
    const m = await mvService.getCreditPaymentById(id);
    if (!m) return res.status(404).json({ message: 'Payment not found' });
    return res.json(m);
  } catch (err) { next(err); }
}

export async function updatePayment(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await mvService.updateCreditPayment(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Payment not found' });
    return res.json(updated);
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function deletePayment(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await mvService.deleteCreditPayment(id);
    if (!ok) return res.status(404).json({ message: 'Payment not found' });
    return res.json({ deleted: ok });
  } catch (err) { next(err); }
}