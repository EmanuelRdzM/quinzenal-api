// src/controllers/period.controller.js
import * as periodService from '../services/period.service.js';

export async function list(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  const list = await periodService.listPeriods({ limit: Number(limit), offset: Number(offset) });
  res.json(list);
}

export async function get(req, res) {
  const { id } = req.params;
  const p = await periodService.getPeriodById(id);
  if (!p) return res.status(404).json({ error: 'Period not found' });
  res.json(p);
}

export async function create(req, res) {
  try {
    const { startDate, endDate, notes } = req.body;


    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate required'
      });
    }

    const created = await periodService.createManualPeriod({
      startDate,
      endDate,
      notes
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  try {
    const updated = await periodService.updatePeriod(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Period not found' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function summary(req, res) {
  const { id } = req.params;
  try {
    const summary = await (await import('../services/periodMovement.service.js')).getPeriodSummary(Number(id));
    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}