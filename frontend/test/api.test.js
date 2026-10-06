import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/api.js';

test('lista documentos usando o prefixo /api e encaminha o signal', async (context) => {
  const documents = [{ id: '1', originalName: 'relatorio.pdf' }];
  const controller = new AbortController();
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents');
    assert.equal(options.signal, controller.signal);
    return Response.json(documents);
  });

  assert.deepEqual(await listDocuments({ signal: controller.signal }), documents);
});

test('envia o arquivo como multipart sem definir Content-Type manualmente', async (context) => {
  const file = new File(['conteudo'], 'documento.txt');
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/upload');
    assert.equal(options.method, 'POST');
    assert.equal(options.body.get('file').name, file.name);
    assert.equal(await options.body.get('file').text(), 'conteudo');
    assert.equal(options.headers, undefined);
    return new Response(null, { status: 201 });
  });

  await uploadDocument(file);
});

test('baixa o arquivo como blob e codifica o identificador', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api/documents/arquivo%2F1/download');
    return new Response('conteudo');
  });

  assert.equal(await (await downloadDocument('arquivo/1')).text(), 'conteudo');
});

test('exibe a mensagem de erro do backend', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Arquivo nao encontrado.' }, { status: 404 }),
  );

  await assert.rejects(downloadDocument('1'), /Arquivo nao encontrado/);
});

test('trata erros HTTP sem corpo JSON', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    new Response('Not Found', { status: 404 }),
  );

  await assert.rejects(listDocuments(), /HTTP 404/);
});

test('trata falhas de rede', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(listDocuments(), /Nao foi possivel conectar/);
});

test('rejeita uma resposta de listagem invalida', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({}));

  await assert.rejects(listDocuments(), /lista de documentos invalida/);
});

test('envia o identificador do usuario nas tres operacoes', async (context) => {
  const requests = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push(url);
    assert.equal(options.headers['X-User-Id'], 'usuario-1');
    assert.equal(options.owner, undefined);
    assert.equal(options.headers['Content-Type'], undefined);
    if (url === '/api/documents') return Response.json([]);
    return new Response('conteudo');
  });

  const options = { owner: 'usuario-1' };
  await listDocuments(options);
  await uploadDocument(new File(['conteudo'], 'documento.txt'), options);
  await downloadDocument('1', options);
  assert.deepEqual(requests, ['/api/documents', '/api/upload', '/api/documents/1/download']);
});

test('exibe a mensagem de erro estruturada do backend', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: { code: 'OWNER_REQUIRED', message: 'Informe o usuario.' } }, { status: 401 }),
  );

  await assert.rejects(listDocuments(), /Informe o usuario/);
});