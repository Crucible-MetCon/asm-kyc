import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import type { RecordResponse } from '@asm-kyc/shared';

interface Props {
  recordId: string;
  onBack: () => void;
  onEdit: (recordId: string) => void;
}

export function RecordDetail({ recordId, onBack, onEdit }: Props) {
  const { t } = useI18n();
  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RecordResponse>(`/records/${recordId}`)
      .then(setRecord)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [recordId]);

  const goldTypeLabel = (val: string | null) => {
    if (!val) return t.profile.notProvided;
    const map: Record<string, string> = {
      RAW_GOLD: t.records.goldTypeRaw,
      BAR: t.records.goldTypeBar,
      LOT: t.records.goldTypeLot,
    };
    return map[val] || val;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return t.profile.notProvided;
    return new Date(iso).toLocaleDateString();
  };

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  if (!record) {
    return (
      <div className="screen">
        <button type="button" className="back-button" onClick={onBack}>← {t.common.back}</button>
        <p>Record not found</p>
      </div>
    );
  }

  const isDraft = record.status === 'DRAFT';
  const isPurchased = record.status === 'PURCHASED';

  const statusLabel = isDraft
    ? t.records.statusDraft
    : isPurchased
    ? t.records.statusPurchased
    : t.records.statusSubmitted;

  return (
    <div className="screen">
      <div className="record-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← {t.common.back}
        </button>
        <span className={`status-badge status-${record.status.toLowerCase()}`}>
          {statusLabel}
        </span>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{t.records.detailTitle}</h1>

      {/* Gold Details */}
      <div className="profile-section">
        <h2>{t.records.goldType}</h2>
        <div className="profile-field">
          <span className="profile-field-label">{t.records.goldType}</span>
          <span className="profile-field-value">{goldTypeLabel(record.gold_type)}</span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">{t.records.weightGrams}</span>
          <span className={`profile-field-value${record.weight_grams == null ? ' not-provided' : ''}`}>
            {record.weight_grams != null ? `${record.weight_grams}g` : t.profile.notProvided}
          </span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">{t.records.estimatedPurity}</span>
          <span className={`profile-field-value${record.estimated_purity == null ? ' not-provided' : ''}`}>
            {record.estimated_purity != null ? `${record.estimated_purity}%` : t.profile.notProvided}
          </span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">{t.records.originMineSite}</span>
          <span className={`profile-field-value${!record.origin_mine_site ? ' not-provided' : ''}`}>
            {record.origin_mine_site || t.profile.notProvided}
          </span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">{t.records.extractionDate}</span>
          <span className={`profile-field-value${!record.extraction_date ? ' not-provided' : ''}`}>
            {formatDate(record.extraction_date)}
          </span>
        </div>
        {record.notes && (
          <div className="profile-field" style={{ flexDirection: 'column', gap: 4 }}>
            <span className="profile-field-label">{t.records.notes}</span>
            <span className="profile-field-value" style={{ textAlign: 'left', maxWidth: '100%' }}>
              {record.notes}
            </span>
          </div>
        )}
      </div>

      {/* Photos */}
      {record.photos.length > 0 && (
        <div className="profile-section">
          <h2>{t.records.photos} ({record.photos.length})</h2>
          <div className="photo-gallery">
            {record.photos.map((photo) => (
              <div key={photo.id} className="photo-gallery-item">
                <img src={photo.photo_data} alt="" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="profile-section">
        <div className="profile-field">
          <span className="profile-field-label">{t.records.createdAt}</span>
          <span className="profile-field-value">{formatDate(record.created_at)}</span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">{t.records.updatedAt}</span>
          <span className="profile-field-value">{formatDate(record.updated_at)}</span>
        </div>
      </div>

      {/* Purchase Information — shown when record is PURCHASED */}
      {isPurchased && record.purchased_by_name && (
        <div className="profile-section">
          <h2>{t.records.purchaseInfo}</h2>
          <div className="purchase-info-section">
            <div className="profile-field">
              <span className="profile-field-label">{t.records.purchasedBy}</span>
              <span className="profile-field-value">{record.purchased_by_name}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">{t.records.purchaseDate}</span>
              <span className="profile-field-value">{formatDate(record.purchased_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit button for drafts */}
      {isDraft && (
        <button
          type="button"
          className="btn btn-primary btn-full"
          style={{ marginTop: 24 }}
          onClick={() => onEdit(record.id)}
        >
          {t.records.editDraft}
        </button>
      )}
    </div>
  );
}
