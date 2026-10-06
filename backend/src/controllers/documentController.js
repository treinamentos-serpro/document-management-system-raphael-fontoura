const multer = require('multer');
const { randomUUID } = require('node:crypto');
const documentService = require('../services/documentService');

const receiveFile = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      documentService.ensureStorage(callback);
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
}).single('file');

function upload(req, res) {
  const document = documentService.createDocument(req.file, req.body?.owner);
  res.status(201).json(document);
}

function list(req, res) {
  res.json(documentService.listDocuments());
}

function download(req, res, next) {
  const { document, filePath } = documentService.getDocument(req.params.id);
  res.download(filePath, document.originalName, (error) => {
    if (error) next(error);
  });
}

module.exports = { receiveFile, upload, list, download };