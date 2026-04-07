// src/controllers/movement.controller.js
import * as movementService from '../services/periodMovement.service.js';
import * as categoryService from '../services/transactionCategory.service.js';

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
    const { periodId, categoryId, type, startDate, endDate, limit = 100, offset = 0 } = req.query;
    const list = await movementService.listMovements({
      periodId: periodId ? Number(periodId) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      type: type || null,
      startDate: startDate || null,
      endDate: endDate || null,
      limit: Number(limit),
      offset: Number(offset)
    });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function monthlyAnalytics(req, res) {
  try {
    const { months = 6 } = req.query;
    const data = await movementService.getMonthlyAnalytics({ months: Number(months) });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listCategories(req, res) {
  try {
    const { activeOnly = 'true' } = req.query;
    const categories = await categoryService.listCategories({ activeOnly: activeOnly !== 'false' });
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createCategory(req, res) {
  try {
    const created = await categoryService.createCategory(req.body || {});
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const updated = await categoryService.updateCategory(Number(id), req.body || {});
    if (!updated) return res.status(404).json({ error: 'Category not found' });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const deleted = await categoryService.deleteCategory(Number(id));
    if (!deleted) return res.status(404).json({ error: 'Category not found' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
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