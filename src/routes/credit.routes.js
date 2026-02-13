import { Router } from 'express';
import * as creditCtrl from '../controllers/credit.controller.js';
import * as payCtrl from '../controllers/creditPayment.controller.js';

const router = Router();

// Credits
router.post('/credits', creditCtrl.createCredit);
router.get('/credits', creditCtrl.listCredits);
router.get('/credits/:id', creditCtrl.getCredit);
router.put('/credits/:id', creditCtrl.updateCredit);
router.delete('/credits/:id', creditCtrl.deleteCredit);
router.get('/credits/:id/summary', creditCtrl.getCreditSummary);

// Payments (scoped)
router.post('/credits/:creditId/payments', payCtrl.createPayment);
router.get('/credits/:creditId/payments', payCtrl.listPayments);

// Payments by id
router.get('/credit-payments/:id', payCtrl.getPayment);
router.put('/credit-payments/:id', payCtrl.updatePayment);
router.delete('/credit-payments/:id', payCtrl.deletePayment);

export default router;