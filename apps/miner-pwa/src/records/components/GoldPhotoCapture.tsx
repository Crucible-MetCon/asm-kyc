import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { apiFetch } from '../../api/client';
import type { VisionEstimationResult } from '@asm-kyc/shared';

interface Props {
  recordId: string | null;
  goldType: string;
  onEstimation: (result: {
    estimated_weight: number | null;
    estimated_purity: number | null;
    weight_confidence: string;
    purity_confidence: string;
    reference_object: string | null;
    gps_latitude: number | null;
    gps_longitude: number | null;
  }) => void;
  onPhotos: (topPhoto: string, sidePhoto: string) => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#16a34a',
  medium: '#ca8a04',
  low: '#dc2626',
};

export function GoldPhotoCapture({ recordId, goldType, onEstimation, onPhotos }: Props) {
  const { t } = useI18n();
  const [topPhoto, setTopPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimation, setEstimation] = useState<VisionEstimationResult | null>(null);
  const [error, setError] = useState('');

  const handleTopPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setTopPhoto(dataUri);
      setEstimation(null);
      if (sidePhoto) onPhotos(dataUri, sidePhoto);
    };
    reader.readAsDataURL(file);
  };

  const handleSidePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setSidePhoto(dataUri);
      setEstimation(null);
      if (topPhoto) onPhotos(topPhoto, dataUri);
    };
    reader.readAsDataURL(file);
  };

  const runEstimation = async () => {
    if (!topPhoto || !sidePhoto) return;
    setEstimating(true);
    setError('');

    try {
      if (recordId) {
        // Use the record-specific endpoint
        const result = await apiFetch<{ estimation: VisionEstimationResult }>(`/records/${recordId}/estimate`, {
          method: 'POST',
          body: JSON.stringify({
            top_photo: topPhoto,
            side_photo: sidePhoto,
            gold_type: goldType || 'RAW_GOLD',
          }),
        });
        setEstimation(result.estimation);
        onEstimation(result.estimation);
      } else {
        // Use the vision endpoint directly (for new records not yet saved)
        const result = await apiFetch<VisionEstimationResult>('/vision/estimate-gold', {
          method: 'POST',
          body: JSON.stringify({
            top_photo: topPhoto,
            side_photo: sidePhoto,
            gold_type: goldType || 'RAW_GOLD',
          }),
        });
        setEstimation(result);
        onEstimation(result);
      }
    } catch {
      setError(t.records.estimationFailed || 'AI estimation failed. You can enter values manually.');
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="gold-photo-capture">
      <div className="form-group">
        <label style={{ fontWeight: 600, fontSize: 15 }}>
          {t.records.minerPhotos || 'Gold Photos (Top + Side)'}
        </label>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          {t.records.photoInstructions || 'Place a reference object (coin, lighter, matchbox) next to the gold for scale estimation.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {/* Top Photo */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            {t.records.topPhoto || 'Top View'}
          </label>
          {topPhoto ? (
            <div style={{ position: 'relative' }}>
              <img
                src={topPhoto}
                alt="Top view"
                style={{ width: '100%', borderRadius: 8, border: '2px solid #d4a017' }}
              />
              <button
                type="button"
                onClick={() => { setTopPhoto(null); setEstimation(null); }}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  background: '#fff', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, cursor: 'pointer', fontWeight: 700,
                }}
              >
                x
              </button>
            </div>
          ) : (
            <label className="photo-capture-btn" style={{ height: 120 }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleTopPhoto}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 12 }}>{t.records.takeTopPhoto || 'Take Top Photo'}</span>
            </label>
          )}
        </div>

        {/* Side Photo */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            {t.records.sidePhoto || 'Side View'}
          </label>
          {sidePhoto ? (
            <div style={{ position: 'relative' }}>
              <img
                src={sidePhoto}
                alt="Side view"
                style={{ width: '100%', borderRadius: 8, border: '2px solid #d4a017' }}
              />
              <button
                type="button"
                onClick={() => { setSidePhoto(null); setEstimation(null); }}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  background: '#fff', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, cursor: 'pointer', fontWeight: 700,
                }}
              >
                x
              </button>
            </div>
          ) : (
            <label className="photo-capture-btn" style={{ height: 120 }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSidePhoto}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 12 }}>{t.records.takeSidePhoto || 'Take Side Photo'}</span>
            </label>
          )}
        </div>
      </div>

      {/* Estimate Button */}
      {topPhoto && sidePhoto && !estimation && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={runEstimation}
          disabled={estimating}
          style={{ width: '100%', marginBottom: 16 }}
        >
          {estimating
            ? (t.records.estimatingAI || 'Analysing photos...')
            : (t.records.runEstimation || 'Estimate Weight & Purity')}
        </button>
      )}

      {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Estimation Result Card */}
      {estimation && (
        <div
          className="card"
          style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            {t.records.aiEstimation || 'AI Estimation'}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{t.records.weightGrams || 'Weight'}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {estimation.estimated_weight != null ? `${estimation.estimated_weight}g` : 'N/A'}
              </div>
              <span style={{
                fontSize: 11,
                color: CONFIDENCE_COLORS[estimation.weight_confidence] || '#666',
                fontWeight: 600,
              }}>
                {estimation.weight_confidence}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{t.records.estimatedPurity || 'Purity'}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {estimation.estimated_purity != null ? `${estimation.estimated_purity}%` : 'N/A'}
              </div>
              <span style={{
                fontSize: 11,
                color: CONFIDENCE_COLORS[estimation.purity_confidence] || '#666',
                fontWeight: 600,
              }}>
                {estimation.purity_confidence}
              </span>
            </div>
          </div>

          {estimation.reference_object && (
            <div style={{ fontSize: 12, color: '#555' }}>
              Reference: {estimation.reference_object}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
