import { Router } from 'express';
import * as personCtrl from '../controllers/person.controller.js';
import * as debtCtrl from '../controllers/debt.controller.js';
import * as debtMvCtrl from '../controllers/debtMovement.controller.js';

const router = Router();

// People
router.post('/people', personCtrl.createPerson);
router.get('/people', personCtrl.listPeople);
router.get('/people/:id', personCtrl.getPerson);
router.put('/people/:id', personCtrl.updatePerson);
router.delete('/people/:id', personCtrl.deletePerson);
router.get('/people/:id/summary', personCtrl.getPersonSummary);

// Debts
router.post('/debts', debtCtrl.createDebt);
router.get('/debts', debtCtrl.listDebts);
router.get('/debts/:id', debtCtrl.getDebt);
router.put('/debts/:id', debtCtrl.updateDebt);
router.delete('/debts/:id', debtCtrl.deleteDebt);
router.get('/debts/:id/summary', debtCtrl.getDebtSummary);

// Movements (scoped)
router.post('/debts/:debtId/movements', debtMvCtrl.createDebtMovement);
router.get('/debts/:debtId/movements', debtMvCtrl.listDebtMovements);

// Movements by id
router.get('/movements/:id', debtMvCtrl.getDebtMovement);
router.put('/movements/:id', debtMvCtrl.updateDebtMovement);
router.delete('/movements/:id', debtMvCtrl.deleteDebtMovement);

export default router;
