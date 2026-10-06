function createDocumentController(service) {
  function requireOwner(request, response, next) {
    const owner = request.get('X-User-Id')?.trim();

    if (!owner) {
      return response.status(401).json({
        error: {
          code: 'OWNER_REQUIRED',
          message: 'Informe o identificador do usuário.',
        },
      });
    }

    request.owner = owner;
    return next();
  }

  async function upload(request, response) {
    if (!request.file) {
      return response.status(400).json({
        error: {
          code: 'FILE_REQUIRED',
          message: 'Envie um arquivo no campo file.',
        },
      });
    }

    const document = await service.upload(request.file, request.owner);
    return response.status(201).json(document);
  }

  async function list(request, response) {
    const documents = await service.listByOwner(request.owner);
    return response.json(documents);
  }

  function download(request, response, next) {
    const document = service.getDownload(request.params.id, request.owner);

    if (!document) {
      return response.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'O documento não foi encontrado.',
        },
      });
    }

    return response.download(document.filePath, document.originalName, (error) => {
      if (error) {
        next(error);
      }
    });
  }

  return { requireOwner, upload, list, download };
}

module.exports = { createDocumentController };