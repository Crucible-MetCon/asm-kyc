import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiFetch, ApiError } from '../api/client';
import { RecordCreateSchema, RecordSubmitSchema } from '@asm-kyc/shared';
import type { RecordResponse, RecordPhotoResponse } from '@asm-kyc/shared';
import { PhotoCapture } from './PhotoCapture';

interface Props {
  record?: RecordResponse;
  onSaved: (record: RecordResponse) => void;
  onBack: () => void;
}

const GOLD_TYPE_OPTIONS = [
  { value: 'RAW_GOLD', icon: '🪨' },
  { value: 'BAR', icon: '🧱' },
  { value: 'LOT', icon: '📦' },
] as const;

export function RecordForm({ record, onSaved, onBack }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isEdit = !!record;

  const [form, setForm] = useState({
    weight_grams: record?.weight_grams?.toString() ?? '',
    estimated_purity: record?.estimated_purity?.toString() ?? '',
    origin_mine_site: record?.origin_mine_site ?? user?.profile?.mine_site_name ?? '',
    extraction_date: record?.extraction_date ? record.extraction_date.split('T')[0] : '',
    gold_type: record?.gold_type ?? '',
    notes: record?.notes ?? '',
  });

  const [photos, setPhotos] = useState<Array<{ id?: string; photo_data: string }>>(
    record?.photos?.map((p: RecordPhotoResponse) => ({ id: p.id, photo_data: p.photo_data })) ?? [],
  );
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState('');

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const goldTypeLabel = (val: string) => {
    const map: Record<string, string> = {
      RAW_GOLD: t.records.goldTypeRaw,
      BAR: t.records.goldTypeBar,
      LOT: t.records.goldTypeLot,
    };
    return map[val] || val;
  };

  const buildPayload = () => ({
    weight_grams: form.weight_grams ? parseFloat(form.weight_grams) : undefined,
    estimated_purity: form.estimated_purity ? parseFloat(form.estimated_purity) : undefined,
    origin_mine_site: form.origin_mine_site || undefined,
    extraction_date: form.extraction_date || undefined,
    gold_type: form.gold_type || undefined,
    notes: form.notes || undefined,
  });

  const handlePhotoAdd = (dataUri: string) => {
    setPhotos((prev) => [...prev, { photo_data: dataUri }]);
    setNewPhotos((prev) => [...prev, dataUri]);
  };

  const handlePhotoRemove = (index: number) => {
    const photo = photos[index];
    if (photo.id) {
      setRemovedPhotoIds((prev) => [...prev, photo.id!]);
    } else {
      setNewPhotos((prev) => prev.filter((p) => p !== photo.photo_data));
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (recordId: string) => {
    // Remove deleted photos
    for (const photoId of removedPhotoIds) {
      try {
        await apiFetch(`/records/${recordId}/photos/${photoId}`, { method: 'DELETE' });
      } catch {
        // continue on error
      }
    }
    // Upload new photos
    for (const photoData of newPhotos) {
      try {
        await apiFetch(`/records/${recordId}/photos`, {
          method: 'POST',
          body: JSON.stringify({ photo_data: photoData }),
        });
      } catch {
        // continue on error
      }
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveDraft = async () => {
    const payload = buildPayload();
    const parsed = RecordCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString();
        if (key) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      let saved: RecordResponse;
      if (isEdit && record) {
        saved = await apiFetch<RecordResponse>(`/records/${record.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        await uploadPhotos(record.id);
      } else {
        saved = await apiFetch<RecordResponse>('/records', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await uploadPhotos(saved.id);
      }
      // Re-fetch to get updated photos
      const refreshed = await apiFetch<RecordResponse>(`/records/${saved.id}`);
      showToast(t.records.draftSaved);
      onSaved(refreshed);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string | unknown[] } | null;
        if (typeof body?.message === 'string') {
          setErrors({ _form: body.message });
        } else {
          setErrors({ _form: 'Failed to save record' });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // First validate with strict submit schema
    const payload = buildPayload();
    const parsed = RecordSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString();
        if (key) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      // Save first
      const payload = buildPayload();
      let saved: RecordResponse;
      if (isEdit && record) {
        saved = await apiFetch<RecordResponse>(`/records/${record.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        await uploadPhotos(record.id);
      } else {
        saved = await apiFetch<RecordResponse>('/records', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await uploadPhotos(saved.id);
      }
      // Then submit
      const submitted = await apiFetch<RecordResponse>(`/records/${saved.id}/submit`, {
        method: 'POST',
      });
      showToast(t.records.recordSubmitted);
      onSaved(submitted);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string | unknown[] } | null;
        if (typeof body?.message === 'string') {
          setErrors({ _form: body.message });
        } else if (Array.isArray(body?.message)) {
          const fieldErrors: Record<string, string> = {};
          (body.message as { path: string[]; message: string }[]).forEach((issue) => {
            const key = issue.path?.[0];
            if (key) fieldErrors[key] = issue.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ _form: 'Failed to submit record' });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <div className="record-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← {t.common.back}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>
          {isEdit ? t.records.editTitle : t.records.createTitle}
        </h1>
        <div style={{ width: 60 }} />
      </div>

      {errors._form && <div className="error-message">{errors._form}</div>}

      {/* Gold Type Selector */}
      <div className="form-group">
        <label>{t.records.goldType}</label>
        <div className="gold-type-selector">
          {GOLD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`gold-type-option${form.gold_type === opt.value ? ' selected' : ''}`}
              onClick={() => update('gold_type', opt.value)}
            >
              <span className="gold-type-icon">{opt.icon}</span>
              {goldTypeLabel(opt.value)}
            </button>
          ))}
        </div>
        {errors.gold_type && <span className="field-error">{errors.gold_type}</span>}
      </div>

      {/* Weight */}
      <div className="form-group">
        <label htmlFor="weight_grams">{t.records.weightGrams}</label>
        <input
          id="weight_grams"
          type="number"
          step="0.001"
          min="0"
          className={`form-input${errors.weight_grams ? ' input-error' : ''}`}
          placeholder={t.records.weightPlaceholder}
          value={form.weight_grams}
          onChange={(e) => update('weight_grams', e.target.value)}
        />
        {errors.weight_grams && <span className="field-error">{errors.weight_grams}</span>}
      </div>

      {/* Purity */}
      <div className="form-group">
        <label htmlFor="estimated_purity">{t.records.estimatedPurity}</label>
        <input
          id="estimated_purity"
          type="number"
          step="0.01"
          min="0"
          max="100"
          className={`form-input${errors.estimated_purity ? ' input-error' : ''}`}
          placeholder={t.records.purityPlaceholder}
          value={form.estimated_purity}
          onChange={(e) => update('estimated_purity', e.target.value)}
        />
        {errors.estimated_purity && <span className="field-error">{errors.estimated_purity}</span>}
      </div>

      {/* Origin Mine Site */}
      <div className="form-group">
        <label htmlFor="origin_mine_site">{t.records.originMineSite}</label>
        <input
          id="origin_mine_site"
          type="text"
          className={`form-input${errors.origin_mine_site ? ' input-error' : ''}`}
          placeholder={t.records.originPlaceholder}
          value={form.origin_mine_site}
          onChange={(e) => update('origin_mine_site', e.target.value)}
        />
        {errors.origin_mine_site && <span className="field-error">{errors.origin_mine_site}</span>}
      </div>

      {/* Extraction Date */}
      <div className="form-group">
        <label htmlFor="extraction_date">{t.records.extractionDate}</label>
        <input
          id="extraction_date"
          type="date"
          className={`form-input${errors.extraction_date ? ' input-error' : ''}`}
          value={form.extraction_date}
          onChange={(e) => update('extraction_date', e.target.value)}
        />
        {errors.extraction_date && <span className="field-error">{errors.extraction_date}</span>}
      </div>

      {/* Notes */}
      <div className="form-group">
        <label htmlFor="notes">
          {t.records.notes} <span className="optional-hint">({t.common.optional})</span>
        </label>
        <textarea
          id="notes"
          className="form-textarea"
          placeholder={t.records.notesPlaceholder}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          maxLength={2000}
        />
      </div>

      {/* Photos */}
      <div className="form-group">
        <PhotoCapture
          photos={photos}
          onAdd={handlePhotoAdd}
          onRemove={handlePhotoRemove}
          maxPhotos={5}
        />
      </div>

      {/* Actions */}
      <div className="step-buttons" style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSaveDraft}
          disabled={saving || submitting}
        >
          {saving ? t.records.saving : t.records.saveDraft}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={saving || submitting}
        >
          {submitting ? t.records.submitting : t.records.submitRecord}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>{t.records.confirmSubmit}</p>
            <div className="confirm-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                {t.common.cancel}
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmSubmit}>
                {t.records.submitRecord}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
