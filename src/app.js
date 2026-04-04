// src/app.js
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    `http://localhost:${PORT}`
  ],
  credentials: true
}));

app.use(express.json());

// ---------- RUTAS API ----------
app.use(routes);

// ---------- Servir frontend build ----------
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.use(express.static(frontendDist));

// catch-all via middleware (recomendado)
app.use((req, res, next) => {
  // Solo responder con index.html para requests GET que acepten HTML
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});