import ApiError from '../shared/errors/ApiError.js';
import * as personMovementService from '../services/personMovement.service.js';

export async function createForPerson(req, res, next) {
  try {
    const personId = parseInt(req.params.id, 10);
    const created = await personMovementService.createPersonMovement({
      personId,
      category: req.body.category,
      type: req.body.type,
      amount: req.body.amount,
      date: req.body.date,
      notes: req.body.notes
    });
    return res.status(201).json(created);
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function listForPerson(req, res, next) {
  try {
    const personId = parseInt(req.params.id, 10);
    const { category, fromDate, toDate, limit, offset } = req.query;

    const rows = await personMovementService.listPersonMovements({
      personId,
      category: category || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      limit: limit ? parseInt(limit, 10) : 500,
      offset: offset ? parseInt(offset, 10) : 0
    });

    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getPersonMovement(req, res, next) {
  try {
    const movement = await personMovementService.getPersonMovementById(req.params.id);
    if (!movement) return res.status(404).json({ message: 'Movement not found' });
    return res.json(movement);
  } catch (err) {
    next(err);
  }
}

export async function updatePersonMovement(req, res, next) {
  try {
    const updated = await personMovementService.updatePersonMovement(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Movement not found' });
    return res.json(updated);
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function deletePersonMovement(req, res, next) {
  try {
    const ok = await personMovementService.deletePersonMovement(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Movement not found' });
    return res.json({ deleted: ok });
  } catch (err) {
    next(err);
  }
}
