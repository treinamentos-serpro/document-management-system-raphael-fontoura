const API_PREFIX = '/api';

async function request(path, { owner, ...options } = {}) {
  let response;

  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      ...(owner ? { headers: { 'X-User-Id': owner } } : {}),
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

export async function listDocuments({ owner, signal } = {}) {
  const response = await request('/documents', { owner, signal });
  const documents = await response.json();

  if (!Array.isArray(documents)) {
    throw new Error('O servidor retornou uma lista de documentos invalida.');
  }

  return documents;
}

export async function uploadDocument(file, { owner } = {}) {
  const body = new FormData();
  body.append('file', file);
  await request('/upload', { method: 'POST', body, owner });
}

export async function downloadDocument(id, { owner } = {}) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, { owner });
  return response.blob();
}