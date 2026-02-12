// src/routes/card.routes.js
import { Router } from 'express';
import * as cardCtrl from '../controllers/card.controller.js';
import * as mvCtrl from '../controllers/cardMovement.controller.js';

const router = Router();

// Cards
router.get('/cards', cardCtrl.listCards);
router.post('/cards', cardCtrl.createCard);
router.get('/cards/:id', cardCtrl.getCard);
router.put('/cards/:id', cardCtrl.updateCard);
router.delete('/cards/:id', cardCtrl.deleteCard);

// Card summary
router.get('/cards/:id/summary', cardCtrl.getCardSummary);

// Movements (scoped under card)
router.post('/cards/:cardId/movements', mvCtrl.createMovement);
router.get('/cards/:cardId/movements', mvCtrl.listMovements);

// Movements direct by id
router.get('/card-movements/:id', mvCtrl.getMovement);
router.put('/card-movements/:id', mvCtrl.updateMovement);
router.delete('/card-movements/:id', mvCtrl.deleteMovement);

export default router;
