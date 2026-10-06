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

async function createTestServer(context) {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-api-'));
  const server = app.createApp({ storageDir }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(storageDir, { recursive: true, force: true });
  });

  return `http://127.0.0.1:${server.address().port}`;
}

async function uploadDocument(baseUrl, owner = 'usuario-1') {
  const formData = new FormData();
  formData.append('file', new Blob(['conteudo'], { type: 'text/plain' }), 'documento.txt');
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: formData,
  });
}

test('faz upload de documento e retorna seus metadados', async (context) => {
  const baseUrl = await createTestServer(context);
  const response = await uploadDocument(baseUrl);

  assert.strictEqual(response.status, 201);
  const document = await response.json();
  assert.strictEqual(document.originalName, 'documento.txt');
  assert.strictEqual(document.size, 8);
  assert.strictEqual(document.owner, 'usuario-1');
  assert.ok(document.id);
});

test('lista apenas os documentos do usuario informado', async (context) => {
  const baseUrl = await createTestServer(context);
  await uploadDocument(baseUrl);
  await uploadDocument(baseUrl, 'usuario-2');

  const response = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });

  assert.strictEqual(response.status, 200);
  const documents = await response.json();
  assert.strictEqual(documents.length, 1);
  assert.strictEqual(documents[0].originalName, 'documento.txt');
  assert.strictEqual(documents[0].owner, 'usuario-1');
});

test('baixa o conteúdo de um documento enviado', async (context) => {
  const baseUrl = await createTestServer(context);
  const uploadResponse = await uploadDocument(baseUrl);
  const document = await uploadResponse.json();

  const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(await response.text(), 'conteudo');
  assert.match(response.headers.get('content-disposition'), /documento\.txt/);
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
