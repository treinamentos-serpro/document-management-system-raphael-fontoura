const documentRepository = require('../repositories/documentRepository');

function ensureStorage(callback) {
  documentRepository.ensureStorage(callback);
}

function createDocument(file, owner) {
  if (!file) {
    throw Object.assign(new Error('Envie um arquivo no campo file.'), { status: 400 });
  }

  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    createdAt: new Date().toISOString(),
    owner: typeof owner === 'string' && owner.trim() ? owner.trim() : 'anonymous',
  };

  return documentRepository.save(document, file.path);
}

function listDocuments() {
  return documentRepository.findAll();
}

function getDocument(id) {
  const entry = documentRepository.findById(id);
  if (!entry) {
    throw Object.assign(new Error('Documento nao encontrado.'), { status: 404 });
  }
  return entry;
}

module.exports = { ensureStorage, createDocument, listDocuments, getDocument };