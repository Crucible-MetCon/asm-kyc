import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { apiFetch } from '../api/client';
import { DOCUMENT_TYPES } from '@asm-kyc/shared';
import type { DocumentListResponse, DocumentResponse } from '@asm-kyc/shared';

const DOC_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  NRC: { label: 'National Registration Card', icon: '🪪' },
  MINING_LICENSE: { label: 'Mining License', icon: '⛏️' },
  PASSPORT: { label: 'Passport', icon: '🛂' },
  COOPERATIVE_CERT: { label: 'Cooperative Certificate', icon: '📜' },
};

export function DocumentUpload() {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await apiFetch<DocumentListResponse>('/documents');
      setDocuments(data.documents);
    } catch {
      // Ignore errors
    }
  };

  const getDocByType = (docType: string) =>
    documents.find((d) => d.doc_type === docType);

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    setError('');

    try {
      const reader = new FileReader();
      const dataUri = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      await apiFetch(`/documents/${docType}`, {
        method: 'POST',
        body: JSON.stringify({ image_data: dataUri }),
      });

      await loadDocuments();
    } catch {
      setError(t.documents?.uploadFailed || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (docType: string) => {
    try {
      await apiFetch(`/documents/${docType}`, { method: 'DELETE' });
      await loadDocuments();
    } catch {
      setError(t.documents?.deleteFailed || 'Delete failed');
    }
  };

  return (
    <div className="profile-section">
      <h2>{t.documents?.title || 'Documents'}</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
        {t.documents?.subtitle || 'Upload identity and license documents for verification.'}
      </p>

      {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DOCUMENT_TYPES.map((docType) => {
          const doc = getDocByType(docType);
          const meta = DOC_TYPE_LABELS[docType] || { label: docType, icon: '📄' };
          const isUploading = uploading === docType;

          return (
            <div
              key={docType}
              className="card"
              style={{
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: doc ? '1px solid #16a34a' : '1px solid #e5e7eb',
                borderRadius: 10,
                background: doc ? '#f0fdf4' : '#fff',
              }}
            >
              <span style={{ fontSize: 24 }}>{meta.icon}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                {doc ? (
                  <div style={{ fontSize: 12, color: '#16a34a' }}>
                    Uploaded · AI confidence: {doc.ai_confidence || 'N/A'}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#999' }}>Not uploaded</div>
                )}
                {doc?.ai_extracted && (
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                    {Object.entries(doc.ai_extracted)
                      .filter(([, v]) => v)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {doc && (
                  <button
                    type="button"
                    onClick={() => handleDelete(docType)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 16, padding: 4, color: '#dc2626',
                    }}
                    title="Delete"
                  >
                    x
                  </button>
                )}
                <label
                  style={{
                    cursor: isUploading ? 'wait' : 'pointer',
                    background: '#d4a017',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: isUploading ? 0.7 : 1,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(docType, file);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  {isUploading ? '...' : (doc ? 'Replace' : 'Upload')}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
