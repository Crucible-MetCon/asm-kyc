import { useState, useEffect } from 'react';
import { apiFetch, NetworkError } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { setCachedRecordDetail, getCachedRecordDetail } from '../offline/db';
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
    const load = async () => {
      try {
        const data = await apiFetch<RecordResponse>(`/records/${recordId}`);
        setRecord(data);
        await setCachedRecordDetail(data);
      } catch (err) {
        if (err instanceof NetworkError) {
          const cached = await getCachedRecordDetail(recordId);
          if (cached) setRecord(cached);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
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

      {/* Record Number & Enhanced Fields */}
      {(record.record_number || record.mine_site || record.country) && (
        <div className="profile-section">
          <h2>{t.vision.recordNumber}</h2>
          {record.record_number && (
            <div className="profile-field">
              <span className="profile-field-label">{t.vision.recordNumber}</span>
              <span className="profile-field-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.record_number}</span>
            </div>
          )}
          {record.mine_site && (
            <div className="profile-field">
              <span className="profile-field-label">{t.vision.selectMineSite}</span>
              <span className="profile-field-value">{record.mine_site.name}</span>
            </div>
          )}
          {record.intended_buyer_name && (
            <div className="profile-field">
              <span className="profile-field-label">{t.vision.selectBuyer}</span>
              <span className="profile-field-value">{record.intended_buyer_name}</span>
            </div>
          )}
          {record.country && (
            <div className="profile-field">
              <span className="profile-field-label">{t.vision.location}</span>
              <span className="profile-field-value">{record.locality ? `${record.locality}, ${record.country}` : record.country}</span>
            </div>
          )}
          {record.gps_latitude != null && record.gps_longitude != null && (
            <div className="profile-field">
              <span className="profile-field-label">GPS</span>
              <span className="profile-field-value" style={{ fontSize: 12 }}>{record.gps_latitude.toFixed(4)}, {record.gps_longitude.toFixed(4)}</span>
            </div>
          )}
        </div>
      )}

      {/* Metal Purities */}
      {record.metal_purities && record.metal_purities.length > 0 && (
        <div className="profile-section">
          <h2>{t.vision.metalPurities}</h2>
          {record.metal_purities.map((p) => (
            <div key={p.id} className="profile-field">
              <span className="profile-field-label" style={{ fontWeight: p.element === 'Au' ? 700 : 400, color: p.element === 'Au' ? '#b45309' : undefined }}>{p.element}</span>
              <span className="profile-field-value">{p.purity.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Scale & XRF Photos */}
      {(record.has_scale_photo || record.has_xrf_photo) && (
        <div className="profile-section">
          <h2>Capture Photos</h2>
          <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#6b7280' }}>
            {record.has_scale_photo && <span>⚖️ Scale photo captured</span>}
            {record.has_xrf_photo && <span>🔬 XRF photo captured</span>}
          </div>
        </div>
      )}

      {/* Receipts */}
      {record.receipts && record.receipts.length > 0 && (
        <div className="profile-section">
          <h2>{t.receipt.title}</h2>
          {record.receipts.map((receipt) => (
            <div key={receipt.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, marginBottom: 8 }}>
              <div className="profile-field">
                <span className="profile-field-label">{t.trader.minerName}</span>
                <span className="profile-field-value">{receipt.receiver_name}</span>
              </div>
              {receipt.receipt_weight != null && (
                <div className="profile-field">
                  <span className="profile-field-label">{t.receipt.receiptWeight}</span>
                  <span className="profile-field-value">{receipt.receipt_weight}g</span>
                </div>
              )}
              {receipt.purities.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {receipt.purities.map((p) => (
                    <div key={p.id} className="profile-field" style={{ fontSize: 13 }}>
                      <span className="profile-field-label">{p.element}</span>
                      <span className="profile-field-value">{p.purity.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
              {receipt.country && (
                <div className="profile-field" style={{ fontSize: 12, color: '#6b7280' }}>
                  <span className="profile-field-label">{t.vision.location}</span>
                  <span className="profile-field-value">{receipt.locality ? `${receipt.locality}, ${receipt.country}` : receipt.country}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
