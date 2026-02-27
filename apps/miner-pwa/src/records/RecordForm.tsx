import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiFetch, ApiError, NetworkError } from '../api/client';
import { useOnlineStatus } from '../offline/connectivity';
import { enqueueRecordSync } from '../offline/syncQueue';
import type { DraftRecord } from '../offline/db';
import { RecordCreateSchema, RecordSubmitSchema } from '@asm-kyc/shared';
import type { RecordResponse, RecordPhotoResponse } from '@asm-kyc/shared';
import { PhotoCapture } from './PhotoCapture';
import { ScaleCapture } from './components/ScaleCapture';
import { XrfCapture } from './components/XrfCapture';
import { MetalPurityTable } from './components/MetalPurityTable';
import { LocationFields } from './components/LocationFields';
import type { MineSiteListResponse, SalesPartnerListResponse, MineSiteResponse, SalesPartnerListItem } from '@asm-kyc/shared';
import rawGoldIcon from '../assets/gold-types/raw-gold.png';
import barIcon from '../assets/gold-types/bar.png';
import lotIcon from '../assets/gold-types/lot.png';

interface Props {
  record?: RecordResponse;
  onSaved: (record: RecordResponse) => void;
  onBack: () => void;
}

const GOLD_TYPE_OPTIONS = [
  { value: 'RAW_GOLD', icon: rawGoldIcon },
  { value: 'BAR', icon: barIcon },
  { value: 'LOT', icon: lotIcon },
] as const;

export function RecordForm({ record, onSaved, onBack }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
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

  // Phase 6: enhanced fields
  const [scalePhoto, setScalePhoto] = useState<{ data: string; mime: string } | null>(null);
  const [xrfPhoto, setXrfPhoto] = useState<{ data: string; mime: string } | null>(null);
  const [purities, setPurities] = useState<Array<{ element: string; purity: number }>>([]);
  const [country, setCountry] = useState(record?.country ?? '');
  const [locality, setLocality] = useState(record?.locality ?? '');
  const [latitude, setLatitude] = useState(record?.gps_latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(record?.gps_longitude?.toString() ?? '');
  const [mineSiteId, setMineSiteId] = useState(record?.mine_site?.id ?? '');
  const [buyerId, setBuyerId] = useState('');
  const [mineSites, setMineSites] = useState<MineSiteResponse[]>([]);
  const [partners, setPartners] = useState<SalesPartnerListItem[]>([]);

  useEffect(() => {
    // Load mine sites
    apiFetch<MineSiteListResponse>('/mine-sites')
      .then((data) => {
        setMineSites(data.sites);
        if (!mineSiteId && data.sites.length > 0) {
          const defaultSite = data.sites.find((s) => s.is_default);
          if (defaultSite) setMineSiteId(defaultSite.id);
        }
      })
      .catch(() => {});

    // Load sales partners for buyer selection
    apiFetch<SalesPartnerListResponse>('/sales-partners')
      .then((data) => {
        setPartners(data.partners);
        if (!buyerId && data.partners.length > 0) {
          setBuyerId(data.partners[0].partner_id);
        }
      })
      .catch(() => {});
  }, []);

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
    // Phase 6: enhanced fields
    scale_photo_data: scalePhoto?.data || undefined,
    scale_photo_mime: scalePhoto?.mime || undefined,
    xrf_photo_data: xrfPhoto?.data || undefined,
    xrf_photo_mime: xrfPhoto?.mime || undefined,
    gps_latitude: latitude ? parseFloat(latitude) : undefined,
    gps_longitude: longitude ? parseFloat(longitude) : undefined,
    country: country || undefined,
    locality: locality || undefined,
    mine_site_id: mineSiteId || undefined,
    buyer_id: buyerId || undefined,
    metal_purities: purities.length > 0 ? purities : undefined,
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

  /** Save offline as a draft in IndexedDB + enqueue for sync */
  const saveOffline = async (submitAfterSync: boolean) => {
    const payload = buildPayload();
    const draft: DraftRecord = {
      id: crypto.randomUUID(),
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      data: {
        weight_grams: payload.weight_grams ?? null,
        estimated_purity: payload.estimated_purity ?? null,
        origin_mine_site: payload.origin_mine_site ?? null,
        extraction_date: payload.extraction_date ?? null,
        gold_type: payload.gold_type ?? null,
        notes: payload.notes ?? null,
      },
      photos: newPhotos.map((data) => ({ data, mime_type: 'image/jpeg' })),
      submitAfterSync,
    };
    await enqueueRecordSync(draft);
    showToast(t.sync.savedOffline);
    onBack();
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

    // Offline path: save locally and enqueue for sync
    if (!isOnline && !isEdit) {
      await saveOffline(false);
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
      if (err instanceof NetworkError && !isEdit) {
        // Went offline during save — fall back to offline storage
        await saveOffline(false);
        return;
      }
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

    // Offline path: save locally with submit flag
    if (!isOnline && !isEdit) {
      await saveOffline(true);
      return;
    }

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
      if (err instanceof NetworkError && !isEdit) {
        // Went offline during submit — fall back to offline storage
        await saveOffline(true);
        return;
      }
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
              <img src={opt.icon} alt={goldTypeLabel(opt.value)} className="gold-type-icon" />
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

      {/* Scale Photo Capture */}
      <ScaleCapture
        onWeightExtracted={(weight, photoData, mimeType) => {
          setScalePhoto({ data: photoData, mime: mimeType });
          if (weight != null) {
            update('weight_grams', weight.toString());
          }
        }}
        onPhotoOnly={(photoData, mimeType) => {
          setScalePhoto({ data: photoData, mime: mimeType });
        }}
      />

      {/* XRF Photo Capture */}
      <div style={{ marginTop: 16 }}>
        <XrfCapture
          onPuritiesExtracted={(extractedPurities, photoData, mimeType) => {
            setXrfPhoto({ data: photoData, mime: mimeType });
            setPurities(extractedPurities);
            // Auto-fill estimated purity from Au reading
            const au = extractedPurities.find((p) => p.element === 'Au');
            if (au) {
              update('estimated_purity', au.purity.toString());
            }
          }}
          onPhotoOnly={(photoData, mimeType) => {
            setXrfPhoto({ data: photoData, mime: mimeType });
          }}
        />
      </div>

      {/* Metal Purities Table */}
      {(purities.length > 0 || xrfPhoto) && (
        <div style={{ marginTop: 16 }}>
          <MetalPurityTable purities={purities} onChange={setPurities} />
        </div>
      )}

      {/* Location */}
      <div style={{ marginTop: 16 }}>
        <LocationFields
          country={country}
          locality={locality}
          latitude={latitude}
          longitude={longitude}
          onCountryChange={setCountry}
          onLocalityChange={setLocality}
          onLatitudeChange={setLatitude}
          onLongitudeChange={setLongitude}
        />
      </div>

      {/* Mine Site Selection */}
      {mineSites.length > 0 && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>{t.vision.selectMineSite}</label>
          <select
            className="form-input"
            value={mineSiteId}
            onChange={(e) => {
              setMineSiteId(e.target.value);
              // Auto-fill origin from mine site
              const site = mineSites.find((s) => s.id === e.target.value);
              if (site) {
                update('origin_mine_site', site.name);
              }
            }}
          >
            <option value="">—</option>
            {mineSites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}{site.is_default ? ' ★' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Buyer Selection */}
      {partners.length > 0 && (
        <div className="form-group" style={{ marginTop: 8 }}>
          <label>{t.vision.selectBuyer}</label>
          <select
            className="form-input"
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
          >
            <option value="">—</option>
            {partners.map((p) => (
              <option key={p.partner_id} value={p.partner_id}>{p.partner_name}</option>
            ))}
          </select>
        </div>
      )}

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
