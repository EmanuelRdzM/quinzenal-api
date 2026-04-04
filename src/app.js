import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173', // Vite default
  ],
  credentials: true
}));

app.use(express.json());

app.use(routes);

app.get('/', (req, res) => {
  res.send('Servidor backend funcionando');
});

// Global error handler — catches all next(err) calls across controllers
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
