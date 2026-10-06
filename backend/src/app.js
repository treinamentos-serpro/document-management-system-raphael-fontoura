// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createDocumentService } = require('./services/documentService');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRouter } = require('./routes/documentRoutes');

const PORT = process.env.PORT || 3000;

function createApp(options = {}) {
  const configuredStorageDir = options.storageDir
    || process.env.STORAGE_DIR
    || path.join(__dirname, '../storage');
  const storageDir = path.resolve(configuredStorageDir);
  const maxFileSizeBytes = options.maxFileSizeBytes
    ?? Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

  if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
    throw new Error('MAX_FILE_SIZE_MB deve representar um limite positivo válido.');
  }

  const repository = createDocumentRepository({ storageDir });
  const service = createDocumentService(repository);
  const controller = createDocumentController(service);
  const storage = multer.diskStorage({
    destination: storageDir,
    filename: (_request, _file, callback) => callback(null, randomUUID()),
  });
  const upload = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });

  const app = express();
  app.use(express.json());
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.use(createDocumentRouter({ controller, upload }));
  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return response.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: tooLarge
            ? 'O arquivo excede o limite permitido.'
            : 'A requisição de upload é inválida.',
        },
      });
    }

    if (error.code === 'EMPTY_FILE') {
      return response.status(400).json({
        error: { code: error.code, message: 'O arquivo enviado está vazio.' },
      });
    }

    console.error('Erro ao processar requisição:', error);
    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível processar a solicitação.',
      },
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
