const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository({ storageDir }) {
  fs.mkdirSync(storageDir, { recursive: true });
  const documents = new Map();

  function save(document) {
    documents.set(document.id, document);
  }

  function findById(id) {
    return documents.get(id) || null;
  }

  function findByOwner(owner) {
    return [...documents.values()]
      .filter((document) => document.owner === owner)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
  }

  async function removeFile(filePath) {
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function getFilePath(storageName) {
    if (
      typeof storageName !== 'string'
      || storageName.length === 0
      || storageName === '.'
      || storageName === '..'
      || path.basename(storageName) !== storageName
    ) {
      throw new Error('Nome de armazenamento inválido.');
    }

    const filePath = path.resolve(storageDir, storageName);
    const relativePath = path.relative(storageDir, filePath);
    if (
      relativePath === '..'
      || relativePath.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativePath)
    ) {
      throw new Error('Caminho de armazenamento inválido.');
    }

    return filePath;
  }

  return { save, findById, findByOwner, removeFile, getFilePath };
}

module.exports = { createDocumentRepository };