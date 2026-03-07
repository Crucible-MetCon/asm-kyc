import { useState } from 'react';
import { apiFetch } from '../api/client';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { ScaleCapture } from '../records/components/ScaleCapture';
import { XrfCapture } from '../records/components/XrfCapture';
import type { RecordReceiptResponse } from '@asm-kyc/shared';

interface Props {
  recordId: string;
  minerWeight: number | null;
  onComplete: (receipt: RecordReceiptResponse) => void;
  onCancel: () => void;
}

type Step = 'scale' | 'xrf' | 'review';

interface PurityEntry {
  element: string;
  purity: number;
}

export function ReceiptCapture({ recordId, minerWeight, onComplete, onCancel }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('scale');

  // Scale data
  const [receiptWeight, setReceiptWeight] = useState<string>('');
  const [scalePhotoData, setScalePhotoData] = useState<string | null>(null);
  const [scalePhotoMime, setScalePhotoMime] = useState<string | null>(null);

  // XRF data
  const [purities, setPurities] = useState<PurityEntry[]>([]);
  const [xrfPhotoData, setXrfPhotoData] = useState<string | null>(null);
  const [xrfPhotoMime, setXrfPhotoMime] = useState<string | null>(null);

  // GPS
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Weight discrepancy check
  const weightNum = parseFloat(receiptWeight) || 0;
  const discrepancyPercent =
    minerWeight && weightNum > 0
      ? Math.abs(((weightNum - minerWeight) / minerWeight) * 100)
      : 0;
  const hasDiscrepancy = discrepancyPercent > 5;

  const detectGps = () => {
    if (!navigator.geolocation) return;
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(pos.coords.latitude);
        setGpsLongitude(pos.coords.longitude);
        setGpsDetecting(false);
      },
      () => {
        setGpsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = {};
      if (weightNum > 0) body.receipt_weight = weightNum;
      if (scalePhotoData) {
        body.scale_photo_data = scalePhotoData;
        body.scale_photo_mime = scalePhotoMime;
      }
      if (xrfPhotoData) {
        body.xrf_photo_data = xrfPhotoData;
        body.xrf_photo_mime = xrfPhotoMime;
      }
      if (gpsLatitude != null && gpsLongitude != null) {
        body.gps_latitude = gpsLatitude;
        body.gps_longitude = gpsLongitude;
      }
      if (purities.length > 0) {
        body.purities = purities;
      }

      const receipt = await apiFetch<RecordReceiptResponse>(`/records/${recordId}/receipt`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onComplete(receipt);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit receipt';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 1: Scale ──
  if (step === 'scale') {
    return (
      <div>
        <div className="receipt-step-label">{t.receipt.stepScale}</div>
        <ScaleCapture
          onWeightExtracted={(weight, photoData, mimeType) => {
            if (weight != null) setReceiptWeight(String(weight));
            setScalePhotoData(photoData);
            setScalePhotoMime(mimeType);
            setStep('xrf');
          }}
          onPhotoOnly={(photoData, mimeType) => {
            setScalePhotoData(photoData);
            setScalePhotoMime(mimeType);
            setStep('xrf');
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={() => setStep('xrf')}
          >
            {t.receipt.skipScale}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: XRF ──
  if (step === 'xrf') {
    return (
      <div>
        <div className="receipt-step-label">{t.receipt.stepXrf}</div>
        <XrfCapture
          onPuritiesExtracted={(purs, photoData, mimeType) => {
            setPurities(purs);
            setXrfPhotoData(photoData);
            setXrfPhotoMime(mimeType);
            setStep('review');
          }}
          onPhotoOnly={(photoData, mimeType) => {
            setXrfPhotoData(photoData);
            setXrfPhotoMime(mimeType);
            setStep('review');
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={() => setStep('scale')}
          >
            {t.common.back}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={() => setStep('review')}
          >
            {t.receipt.skipXrf}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Review & Submit ──
  return (
    <div>
      <div className="receipt-step-label">{t.receipt.stepReview}</div>

      {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Weight input */}
      <div className="form-group">
        <label className="form-label">{t.receipt.receiptWeight}</label>
        <input
          type="number"
          className="form-input"
          value={receiptWeight}
          onChange={(e) => setReceiptWeight(e.target.value)}
          min="0"
          step="0.1"
          placeholder="0.0"
        />
      </div>

      {hasDiscrepancy && (
        <div className="receipt-discrepancy-warning">
          {interpolate(t.receipt.discrepancyWarning, {
            percent: discrepancyPercent.toFixed(1),
          })}
        </div>
      )}

      {/* Purities display */}
      {purities.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="receipt-review-label">{t.receipt.receiptPurities}</div>
          <div className="receipt-purities-list">
            {purities.map((p, i) => (
              <span key={i} className="receipt-purity-tag">
                {p.element}: {p.purity.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Photos summary */}
      <div style={{ marginTop: 12 }}>
        <div className="receipt-review-field">
          <span className="receipt-review-label">{t.vision.captureScale}</span>
          <span>{scalePhotoData ? '\u2705' : '\u274C'}</span>
        </div>
        <div className="receipt-review-field">
          <span className="receipt-review-label">{t.vision.captureXrf}</span>
          <span>{xrfPhotoData ? '\u2705' : '\u274C'}</span>
        </div>
      </div>

      {/* GPS */}
      <div style={{ marginTop: 12 }}>
        {gpsLatitude != null ? (
          <div className="receipt-review-field">
            <span className="receipt-review-label">{t.receipt.receiptLocation}</span>
            <span style={{ fontSize: 13 }}>{t.receipt.gpsDetected}</span>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-full btn-sm"
            onClick={detectGps}
            disabled={gpsDetecting}
          >
            {gpsDetecting ? t.common.loading : t.receipt.detectGps}
          </button>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={() => setStep('xrf')}
        >
          {t.common.back}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t.receipt.submittingReceipt : t.receipt.submitReceipt}
        </button>
      </div>
    </div>
  );
}
