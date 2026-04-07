// src/routes/period.routes.js
import { Router } from 'express';
import * as periodCtrl from '../controllers/period.controller.js';
import * as movementCtrl from '../controllers/periodMovememt.controller.js';

const router = Router();

// PERIODS
router.get('/periods', periodCtrl.list);
router.post('/periods', periodCtrl.create);
router.get('/periods/:id', periodCtrl.get);
router.put('/periods/:id', periodCtrl.update);
router.get('/periods/:id/summary', periodCtrl.summary);
router.get('/periods/:id/analytics', periodCtrl.analytics);

// Movements under a specific period
router.post('/periods/:id/movements', async (req, res, next) => {
  // inyectar periodId en body para usar la ruta
  req.body.periodId = Number(req.params.id);
  return movementCtrl.createMovement(req, res, next);
});


// MOVEMENTS PERIODS
router.post('/period-movements', movementCtrl.createMovement);
router.get('/period-movements', movementCtrl.listMovements); // optional ?periodId=&limit=&offset=
router.get('/period-movements/analytics/monthly', movementCtrl.monthlyAnalytics);
router.get('/period-movements/:id', movementCtrl.getMovement);
router.patch('/period-movements/:id', movementCtrl.updateMovement);
router.delete('/period-movements/:id', movementCtrl.deleteMovement);

// TRANSACTION CATEGORIES
router.get('/transaction-categories', movementCtrl.listCategories);
router.post('/transaction-categories', movementCtrl.createCategory);
router.patch('/transaction-categories/:id', movementCtrl.updateCategory);
router.delete('/transaction-categories/:id', movementCtrl.deleteCategory);

export default router;
