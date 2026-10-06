const { randomUUID } = require('node:crypto');

function createDocumentService(repository) {
  async function upload(file, owner) {
    if (!file.size) {
      await repository.removeFile(file.path);
      const error = new Error('O arquivo enviado está vazio.');
      error.code = 'EMPTY_FILE';
      throw error;
    }

    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storageName: file.filename,
    };

    try {
      repository.save(document);
    } catch (error) {
      await repository.removeFile(file.path);
      throw error;
    }

    return toPublicDocument(document);
  }

  function listByOwner(owner) {
    return repository.findByOwner(owner).map(toPublicDocument);
  }

  function getDownload(id, owner) {
    const document = repository.findById(id);

    if (!document || document.owner !== owner) {
      return null;
    }

    return {
      filePath: repository.getFilePath(document.storageName),
      originalName: document.originalName,
    };
  }

  return { upload, listByOwner, getDownload };
}

function toPublicDocument(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

module.exports = { createDocumentService };