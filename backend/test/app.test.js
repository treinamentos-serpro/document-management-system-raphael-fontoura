const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');
const { createDocumentController } = require('../src/controllers/documentController');
const { createDocumentRepository } = require('../src/repositories/documentRepository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('o caminho do arquivo permanece dentro do diretório de armazenamento', (context) => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-storage-'));
  context.after(() => fs.rmSync(storageDir, { recursive: true, force: true }));
  const repository = createDocumentRepository({ storageDir });

  assert.strictEqual(repository.getFilePath('arquivo-seguro'), path.join(storageDir, 'arquivo-seguro'));
  assert.strictEqual(repository.getFilePath('..nota'), path.join(storageDir, '..nota'));
  assert.throws(() => repository.getFilePath('../fora-do-storage'), /Nome de armazenamento inválido/);
  assert.throws(() => repository.getFilePath(''), /Nome de armazenamento inválido/);
});

test('encaminha erros de download mesmo após o início da resposta', () => {
  const downloadError = new Error('falha ao ler arquivo');
  let forwardedError;
  const controller = createDocumentController({
    getDownload: () => ({ filePath: '/storage/documento', originalName: 'documento.txt' }),
  });
  const response = {
    headersSent: true,
    download(_filePath, _originalName, callback) {
      callback(downloadError);
      return this;
    },
  };

  controller.download(
    { params: { id: 'documento-1' }, owner: 'usuario-1' },
    response,
    (error) => { forwardedError = error; },
  );

  assert.strictEqual(forwardedError, downloadError);
});
