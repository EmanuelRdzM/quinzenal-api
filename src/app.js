import express from 'express';
import routes from './routes/index.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(routes);

app.get('/', (req, res) => {
  res.send('Servidor backend funcionando');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
