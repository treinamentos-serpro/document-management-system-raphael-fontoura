const path = require('node:path');
const { mkdir } = require('node:fs');

const storagePath = path.resolve(__dirname, '../../storage');
const documents = new Map();

function ensureStorage(callback) {
  mkdir(storagePath, { recursive: true }, (error) => callback(error, storagePath));
}

function save(document, filePath) {
  documents.set(document.id, { document, filePath });
  return document;
}

function findAll() {
  return Array.from(documents.values(), (entry) => entry.document);
}

function findById(id) {
  return documents.get(id);
}

module.exports = { ensureStorage, save, findAll, findById };