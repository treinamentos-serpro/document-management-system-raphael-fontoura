const express = require('express');
const multer = require('multer');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(documentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Upload invalido. Envie apenas um arquivo no campo file.' });
  }

  const status = error.code === 'ENOENT' ? 404 : error.status || 500;
  const message = status === 404
    ? 'Documento nao encontrado.'
    : status >= 500 ? 'Nao foi possivel concluir a operacao.' : error.message;
  res.status(status).json({ message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
