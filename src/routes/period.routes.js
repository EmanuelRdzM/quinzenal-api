// src/routes/period.routes.js
import { Router } from 'express';
import * as periodCtrl from '../controllers/period.contoller.js';
import * as movementCtrl from '../controllers/period-movememt.cotroller.js';

const router = Router();

// PERIODS
router.get('/periods', periodCtrl.list);
router.post('/periods', periodCtrl.create);
router.get('/periods/:id', periodCtrl.get);
router.put('/periods/:id', periodCtrl.update);
router.get('/periods/:id/summary', periodCtrl.summary);

// Movements under a specific period
router.post('/periods/:id/movements', async (req, res, next) => {
  // inyectar periodId en body para usar la ruta
  req.body.periodId = Number(req.params.id);
  return movementCtrl.createMovement(req, res, next);
});


// MOVEMENTS PERIODS
router.post('/period-movements', movementCtrl.createMovement);
router.get('/period-movements', movementCtrl.listMovements); // optional ?periodId=&limit=&offset=
router.get('/period-movements/:id', movementCtrl.getMovement);
router.patch('/period-movement/:id', movementCtrl.updateMovement);
router.delete('/period-movements/:id', movementCtrl.deleteMovement);

export default router;
