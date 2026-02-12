import * as mvService from '../services/debtMovement.service.js';

export async function createDebtMovement(req, res, next) {
  try {
    const payload = {
      debtId: parseInt(req.params.debtId || req.body.debtId),
      type: req.body.type,
      amount: req.body.amount,
      date: req.body.date,
      notes: req.body.notes
    };
    const created = await mvService.createDebtMovement(payload);
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

export async function listDebtMovements(req, res, next) {
  try {
    const debtId = req.params.debtId ? parseInt(req.params.debtId) : null;
    const { limit, offset, fromDate, toDate } = req.query;
    const rows = await mvService.listDebtMovements({
      debtId,
      limit: limit ? parseInt(limit) : 200,
      offset: offset ? parseInt(offset) : 0,
      fromDate,
      toDate
    });
    return res.json(rows);
  } catch (err) { next(err); }
}

export async function getDebtMovement(req, res, next) {
  try {
    const id = req.params.id;
    const m = await mvService.getDebtMovementById(id);
    return res.json(m);
  } catch (err) { next(err); }
}

export async function updateDebtMovement(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await mvService.updateDebtMovement(id, req.body);
    return res.json(updated);
  } catch (err) { next(err); }
}

export async function deleteDebtMovement(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await mvService.deleteDebtMovement(id);
    return res.json({ deleted: ok });
  } catch (err) { next(err); }
}
