// src/controllers/movement.controller.js
import * as movementService from '../services/period-movement.service.js';

export async function createMovement(req, res) {
  try {
    // body: { type, concept, amount, paymentMethod, movementDate?, periodId? , autoCreatePeriod? }
    const payload = req.body;
    const autoCreate = payload.autoCreatePeriod !== undefined ? !!payload.autoCreatePeriod : true;
    const created = await movementService.createMovement(payload, { autoCreatePeriod: autoCreate });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
