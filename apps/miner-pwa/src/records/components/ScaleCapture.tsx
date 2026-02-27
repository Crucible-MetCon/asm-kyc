import { useState, useRef } from 'react';
import { apiFetch, NetworkError } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import type { VisionWeightResult } from '@asm-kyc/shared';

interface Props {
  onWeightExtracted: (weight: number | null, photoData: string, mimeType: string) => void;
  onPhotoOnly: (photoData: string, mimeType: string) => void;
}

export function ScaleCapture({ onWeightExtracted, onPhotoOnly }: Props) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      const mimeType = file.type || 'image/jpeg';
      setPreview(dataUri);

      // Try vision extraction
      setProcessing(true);
      try {
        const result = await apiFetch<VisionWeightResult>('/vision/extract-weight', {
          method: 'POST',
          body: JSON.stringify({ image_data: dataUri, mime_type: mimeType }),
        });
        setConfidence(result.confidence);
        onWeightExtracted(result.weight_grams, dataUri, mimeType);
      } catch (err) {
        if (err instanceof NetworkError) {
          // Offline: save photo for later extraction
          onPhotoOnly(dataUri, mimeType);
        } else {
          // API error: still keep the photo
          onPhotoOnly(dataUri, mimeType);
        }
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getConfidenceBadge = () => {
    if (!confidence) return null;
    const colors: Record<string, string> = {
      high: '#16a34a',
      medium: '#ca8a04',
      low: '#dc2626',
    };
    return (
      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 10,
        background: colors[confidence] || '#6b7280', color: 'white', marginLeft: 8,
      }}>
        {confidence}
      </span>
    );
  };

  return (
    <div className="capture-section">
      <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
        {'\u2696\uFE0F'} {t.vision.captureScale}
      </label>

      {preview ? (
        <div style={{ marginBottom: 8 }}>
          <img src={preview} alt="Scale" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
          {processing && <div className="loading-text" style={{ textAlign: 'center', marginTop: 8 }}>{t.vision.extracting}</div>}
          {confidence && (
            <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#6b7280' }}>
              {t.vision.confidence}: {getConfidenceBadge()}
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
          {'\uD83D\uDCF7'} {t.vision.captureScale}
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
