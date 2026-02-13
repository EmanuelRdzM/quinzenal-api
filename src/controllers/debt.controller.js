import * as debtService from '../services/debt.service.js';

export async function createDebt(req, res, next) {
  try {
    const created = await debtService.createDebt(req.body);
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

export async function listDebts(req, res, next) {
  try {
    const { personId, limit, offset } = req.query;
    const rows = await debtService.listDebts({
      personId: personId ? parseInt(personId) : null,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    return res.json(rows);
  } catch (err) { next(err); }
}

export async function getDebt(req, res, next) {
  try {
    const id = req.params.id;
    const d = await debtService.getDebtById(id);
    if (!d) return res.status(404).json({ message: 'Debt not found' });
    return res.json(d);
  } catch (err) { next(err); }
}

export async function updateDebt(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await debtService.updateDebt(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Debt not found' });
    return res.json(updated);
  } catch (err) { next(err); }
}

export async function deleteDebt(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await debtService.deleteDebt(id);
    if (!ok) return res.status(404).json({ message: 'Debt not found' });
    return res.json({ deleted: ok });
  } catch (err) { next(err); }
}

export async function getDebtSummary(req, res, next) {
  try {
    const id = req.params.id;
    const summary = await debtService.getDebtSummary(id);
    return res.json(summary);
  } catch (err) { 
    if (err.message === 'Debt not found') {
      return res.status(404).json({ error: 'Debt not found' });
    }
    next(err); 
  }
}
