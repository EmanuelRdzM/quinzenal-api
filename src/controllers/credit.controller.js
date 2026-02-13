import * as creditService from '../services/credit.service.js';
import ApiError from '../shared/errors/ApiError.js';

export async function createCredit(req, res, next) {
  try {
    const created = await creditService.createCredit(req.body);
    return res.status(201).json(created);
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function listCredits(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const rows = await creditService.listCredits({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    return res.json(rows);
  } catch (err) { next(err); }
}

export async function getCredit(req, res, next) {
  try {
    const id = req.params.id;
    const c = await creditService.getCreditById(id);
    if (!c) return res.status(404).json({ message: 'Credit not found' });
    return res.json(c);
  } catch (err) { next(err); }
}

export async function updateCredit(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await creditService.updateCredit(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Credit not found' });
    return res.json(updated);
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function deleteCredit(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await creditService.deleteCredit(id);
    if (!ok) return res.status(404).json({ message: 'Credit not found' });
    return res.json({ deleted: ok });
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function getCreditSummary(req, res, next) {
  try {
    const id = req.params.id;
    const summary = await creditService.getCreditSummary(id);
    return res.json(summary);
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}