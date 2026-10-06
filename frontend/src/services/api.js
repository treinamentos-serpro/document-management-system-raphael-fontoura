const API_PREFIX = '/api';

async function request(path, { owner, ...options } = {}) {
  let response;
  const headers = new Headers(options.headers);
  if (owner) headers.set('X-User-Id', owner);

  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      ...(owner || options.headers ? { headers } : {}),
    });
  } catch {
    throw new Error('Nao foi possivel conectar ao servidor.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || payload?.error?.message || payload?.error;
    throw new Error(
      typeof message === 'string'
        ? message
        : `Nao foi possivel concluir a operacao (HTTP ${response.status}).`,
    );
  }

  return response;
}

export async function listDocuments({ owner, signal, headers } = {}) {
  const response = await request('/documents', { owner, signal, headers });
  const documents = await response.json();

  if (!Array.isArray(documents)) {
    throw new Error('O servidor retornou uma lista de documentos invalida.');
  }

  return documents;
}

export async function uploadDocument(file, { owner, headers } = {}) {
  const body = new FormData();
  body.append('file', file);
  await request('/upload', { method: 'POST', body, owner, headers });
}

export async function downloadDocument(id, { owner, headers } = {}) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, { owner, headers });
  return response.blob();
}