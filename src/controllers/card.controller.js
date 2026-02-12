// src/controllers/card.controller.js
import * as cardService from '../services/card.service.js';

export async function createCard(req, res, next) {
  try {
    const created = await cardService.createCard(req.body);
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function listCards(req, res, next) {
  try {
    const { limit, offset, q } = req.query;
    const rows = await cardService.listCards({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      q
    });
    return res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getCard(req, res, next) {
  try {
    const id = req.params.id;
    const card = await cardService.getCardById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    return res.json(card);
  } catch (err) {
    next(err);
  }
}

export async function updateCard(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await cardService.updateCard(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Card not found' });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteCard(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await cardService.deleteCard(id);
    if (!ok) return res.status(404).json({ message: 'Card not found' });
    return res.json({ message: 'deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getCardSummary(req, res, next) {
  try {
    const id = req.params.id;
    const summary = await cardService.getCardSummary(id);
    return res.json(summary);
  } catch (err) {
    if (err.message === 'Card not found') {
      return res.status(404).json({ error: 'Card not found' });
    }
    next(err);
  }
}
