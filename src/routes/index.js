import express from 'express';

// Importar rutas
import periodRoutes from './period.routes.js'
import cardRoutes from './card.routes.js'
import debtRoutes from './debt.routes.js'

const API_V1 = "/api/v1";
const router = express.Router();

// Rutas de acceso a la API
router.use(API_V1, periodRoutes);
router.use(API_V1, cardRoutes);
router.use(API_V1, debtRoutes);

export default router;