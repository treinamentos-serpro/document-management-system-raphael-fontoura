import { useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/api.js';

export default function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;

    const form = event.currentTarget;
    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      await uploadDocument(file);
      form.reset();
      setFile(null);
      setSuccess('Documento enviado com sucesso.');
      onUpload();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar documento</h2>
      <form onSubmit={handleSubmit} aria-busy={isUploading}>
        <div className="upload-controls">
          <div className="file-field">
            <label htmlFor="document-file">Arquivo</label>
            <input
              id="document-file"
              name="file"
              type="file"
              required
              disabled={isUploading}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError('');
                setSuccess('');
              }}
            />
          </div>
          <button type="submit" className="primary-button" disabled={!file || isUploading}>
            {isUploading ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
            {isUploading ? 'Enviando...' : 'Enviar documento'}
          </button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        {success && <p className="success-message" role="status">{success}</p>}
      </form>
    </section>
  );
}