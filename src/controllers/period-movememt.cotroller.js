// src/controllers/movement.controller.js
import * as movementService from '../services/period-movement.service.js';

export async function createMovement(req, res) {
  try {
    // body: { type, concept, amount, paymentMethod, periodId?, autoCreatePeriod? }
    const payload = req.body;
    const autoCreate = payload.autoCreatePeriod !== undefined ? !!payload.autoCreatePeriod : true;
    const created = await movementService.createMovement(payload, { autoCreatePeriod: autoCreate });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function getMovement(req, res) {
  try {
    const { id } = req.params;
    const m = await movementService.getMovementById(id);
    if (!m) return res.status(404).json({ error: 'Movement not found' });
    return res.json(m);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listMovements(req, res) {
  try {
    const { periodId, limit = 100, offset = 0 } = req.query;
    const list = await movementService.listMovements({ periodId: periodId ? Number(periodId) : null, limit: Number(limit), offset: Number(offset) });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMovement(req, res) {
  try {
    const { id } = req.params;
    const updated = await movementService.updateMovement(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Movement not found' });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteMovement(req, res) {
  try {
    const { id } = req.params;
    const deleted = await movementService.deleteMovement(id);
    if (!deleted) return res.status(404).json({ error: 'Movement not found' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}