import { useEffect, useState } from 'react';
import { FolderOpen, UserRound } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/api.js';
import './App.css';

export default function App() {
  const [ownerInput, setOwnerInput] = useState('');
  const [owner, setOwner] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError('');

    listDocuments({ owner, signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setDocuments(items);
      })
      .catch((listError) => {
        if (!controller.signal.aborted) setError(listError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [owner, revision]);

  function refreshDocuments() {
    setRevision((current) => current + 1);
  }

  function selectOwner(event) {
    event.preventDefault();
    const nextOwner = ownerInput.trim();
    if (!nextOwner) return;
    if (nextOwner !== owner) setDocuments([]);
    setOwner(nextOwner);
    refreshDocuments();
  }

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <FolderOpen size={28} aria-hidden="true" />
          <h1>Gestao de documentos</h1>
        </div>
      </header>
      <main>
        <form className="owner-controls" onSubmit={selectOwner}>
          <div className="file-field">
            <label htmlFor="document-owner">Identificador do usuario</label>
            <input
              id="document-owner"
              type="text"
              required
              value={ownerInput}
              onChange={(event) => setOwnerInput(event.target.value)}
            />
          </div>
          <button className="primary-button" type="submit" disabled={!ownerInput.trim()}>
            <UserRound size={18} aria-hidden="true" />
            Abrir documentos
          </button>
        </form>
        {owner && (
          <div key={owner}>
            <p className="active-owner">Usuario: {owner}</p>
            <UploadComponent owner={owner} onUpload={refreshDocuments} />
            <DocumentList
              owner={owner}
              documents={documents}
              isLoading={isLoading}
              error={error}
              onRefresh={refreshDocuments}
            />
          </div>
        )}
      </main>
    </>
  );
}
