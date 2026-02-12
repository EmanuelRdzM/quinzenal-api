// src/controllers/cardMovement.controller.js
import * as movementService from '../services/cardMovement.service.js';

export async function createMovement(req, res, next) {
  try {
    const payload = {
      cardId: parseInt(req.params.cardId || req.body.cardId),
      type: req.body.type,
      concept: req.body.concept,
      description: req.body.description,
      amount: req.body.amount,
      date: req.body.date
    };
    const created = await movementService.createCardMovement(payload);
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function listMovements(req, res, next) {
  try {
    const cardId = req.params.cardId ? parseInt(req.params.cardId) : null;
    const { limit, offset, fromDate, toDate } = req.query;
    const rows = await movementService.listMovements({
      cardId,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      fromDate,
      toDate
    });
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getMovement(req, res, next) {
  try {
    const id = req.params.id;
    const m = await movementService.getMovementById(id);
    if (!m) return res.status(404).json({ message: 'Movement not found' });
    return res.json(m);
  } catch (err) {
    next(err);
  }
}

export async function updateMovement(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await movementService.updateMovement(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Movement not found' });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteMovement(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await movementService.deleteMovement(id);
    if (!ok) return res.status(404).json({ message: 'Movement not found' });
    return res.json({ message: 'deleted' });
  } catch (err) {
    next(err);
  }
}
