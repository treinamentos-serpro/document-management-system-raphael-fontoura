import { FileText, LoaderCircle, RefreshCw } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
}

function formatSize(size) {
  if (!Number.isFinite(size) || size < 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}

export default function DocumentList({ documents, isLoading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={isLoading}>
      <div className="section-heading">
        <h2 id="documents-title">Documentos <span className="document-count">{documents.length}</span></h2>
        <button
          type="button"
          className="icon-button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Atualizar documentos"
          title="Atualizar documentos"
        >
          {isLoading ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
        </button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {isLoading && <p className="list-status" role="status">Carregando documentos...</p>}
      {!isLoading && !error && documents.length === 0 && (
        <div className="empty-state">
          <FileText size={32} aria-hidden="true" />
          <p>Nenhum documento encontrado.</p>
        </div>
      )}
      {documents.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th scope="col">Nome</th><th scope="col">Tamanho</th><th scope="col">Data</th><th scope="col">Download</th></tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const fileName = document.originalName || document.name || 'Documento';
                return (
                  <tr key={document.id}>
                    <td><div className="document-name"><FileText size={18} aria-hidden="true" /><span>{fileName}</span></div></td>
                    <td>{formatSize(document.size)}</td>
                    <td>{formatDate(document.createdAt)}</td>
                    <td><DownloadButton documentId={document.id} fileName={fileName} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}