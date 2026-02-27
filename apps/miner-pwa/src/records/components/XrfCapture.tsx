import { useState, useRef } from 'react';
import { apiFetch, NetworkError } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import type { VisionXrfResult } from '@asm-kyc/shared';

interface PurityEntry {
  element: string;
  purity: number;
}

interface Props {
  onPuritiesExtracted: (purities: PurityEntry[], photoData: string, mimeType: string) => void;
  onPhotoOnly: (photoData: string, mimeType: string) => void;
}

export function XrfCapture({ onPuritiesExtracted, onPhotoOnly }: Props) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      const mimeType = file.type || 'image/jpeg';
      setPreview(dataUri);

      setProcessing(true);
      try {
        const result = await apiFetch<VisionXrfResult>('/vision/extract-xrf', {
          method: 'POST',
          body: JSON.stringify({ image_data: dataUri, mime_type: mimeType }),
        });
        setConfidence(result.confidence);
        onPuritiesExtracted(result.purities, dataUri, mimeType);
      } catch (err) {
        if (err instanceof NetworkError) {
          onPhotoOnly(dataUri, mimeType);
        } else {
          onPhotoOnly(dataUri, mimeType);
        }
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="capture-section">
      <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
        {'\uD83D\uDD2C'} {t.vision.captureXrf}
      </label>

      {preview ? (
        <div style={{ marginBottom: 8 }}>
          <img src={preview} alt="XRF" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
          {processing && <div className="loading-text" style={{ textAlign: 'center', marginTop: 8 }}>{t.vision.extracting}</div>}
          {confidence && (
            <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#6b7280' }}>
              {t.vision.confidence}: <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                background: confidence === 'high' ? '#16a34a' : confidence === 'medium' ? '#ca8a04' : '#dc2626',
                color: 'white',
              }}>{confidence}</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 8, fontSize: 13 }}
            onClick={() => { setPreview(null); setConfidence(null); fileRef.current && (fileRef.current.value = ''); }}
          >
            {t.vision.retake}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={() => fileRef.current?.click()}
          style={{ padding: '14px 0', fontSize: 14 }}
        >
          {'\uD83D\uDCF7'} {t.vision.captureXrf}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCapture}
      />
    </div>
  );
}
