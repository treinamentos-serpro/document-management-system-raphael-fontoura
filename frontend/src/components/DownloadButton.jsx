import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/api.js';

export default function DownloadButton({ documentId, fileName }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'documento';
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  const label = isDownloading ? 'Baixando documento' : `Baixar ${fileName || 'documento'}`;

  return (
    <div className="download-action">
      <button
        type="button"
        className="icon-button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={label}
        title={label}
      >
        {isDownloading ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}