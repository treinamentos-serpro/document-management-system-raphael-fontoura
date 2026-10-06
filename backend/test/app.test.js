const { test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const { readFile, unlink } = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('rotas de documentos', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  const uploadedIds = [];
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await Promise.all(uploadedIds.map((id) => unlink(path.resolve(__dirname, '../storage', id))
      .catch((error) => { if (error.code !== 'ENOENT') throw error; })));
  });
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let document;
  const content = Buffer.from('Conteudo do documento de teste.');

  await context.test('preserva o health check e inicia com lista vazia', async () => {
    const health = await fetch(`${baseUrl}/health`);
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(await health.json(), { status: 'ok' });
    const response = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), []);
  });

  await context.test('grava upload local e retorna metadados sem expor o caminho', async () => {
    const body = new FormData();
    body.append('file', new Blob([content]), 'relatorio.txt');
    body.append('owner', 'usuario-teste');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body });
    assert.strictEqual(response.status, 201);
    document = await response.json();
    uploadedIds.push(document.id);
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.size, content.length);
    assert.strictEqual(document.owner, 'usuario-teste');
    assert.ok(Number.isFinite(Date.parse(document.createdAt)));
    assert.deepStrictEqual(Object.keys(document).sort(), ['createdAt', 'id', 'originalName', 'owner', 'size']);
    assert.deepStrictEqual(await readFile(path.resolve(__dirname, '../storage', document.id)), content);
  });

  await context.test('lista os metadados e baixa os bytes com o nome original', async () => {
    const list = await fetch(`${baseUrl}/documents`);
    assert.deepStrictEqual(await list.json(), [document]);
    const response = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment; filename="relatorio.txt"/);
    assert.deepStrictEqual(Buffer.from(await response.arrayBuffer()), content);
  });

  await context.test('rejeita upload sem arquivo', async () => {
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST' });
    assert.strictEqual(response.status, 400);
    assert.match((await response.json()).message, /campo file/);
  });

  await context.test('rejeita campo de arquivo inesperado e arquivos adicionais', async () => {
    for (const fields of [['document'], ['file', 'file']]) {
      const body = new FormData();
      for (const field of fields) body.append(field, new Blob([content]), 'relatorio.txt');
      const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body });
      assert.strictEqual(response.status, 400);
      assert.match((await response.json()).message, /Upload invalido/);
    }
    const list = await fetch(`${baseUrl}/documents`);
    assert.deepStrictEqual(await list.json(), [document]);
  });

  await context.test('gera nomes distintos para arquivos com o mesmo nome e define dono padrao', async () => {
    const body = new FormData();
    body.append('file', new Blob([content]), 'relatorio.txt');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body });
    assert.strictEqual(response.status, 201);
    const secondDocument = await response.json();
    uploadedIds.push(secondDocument.id);
    assert.notStrictEqual(secondDocument.id, document.id);
    assert.strictEqual(secondDocument.owner, 'anonymous');
    assert.deepStrictEqual(await readFile(path.resolve(__dirname, '../storage', secondDocument.id)), content);
  });

  await context.test('retorna 404 para id desconhecido ou arquivo removido', async () => {
    const unknown = await fetch(`${baseUrl}/documents/inexistente/download`);
    assert.strictEqual(unknown.status, 404);
    assert.strictEqual((await unknown.json()).message, 'Documento nao encontrado.');
    await unlink(path.resolve(__dirname, '../storage', document.id));
    const missing = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(missing.status, 404);
    assert.strictEqual((await missing.json()).message, 'Documento nao encontrado.');
  });
});
