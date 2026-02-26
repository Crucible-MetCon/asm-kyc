import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n, interpolate } from '../i18n/I18nContext';
import type { AvailableRecordListResponse, AvailableRecordListItem, PurchaseResponse } from '@asm-kyc/shared';
import rawGoldIcon from '../assets/gold-types/raw-gold.png';
import barIcon from '../assets/gold-types/bar.png';
import lotIcon from '../assets/gold-types/lot.png';

const GOLD_TYPE_ICONS: Record<string, string> = {
  RAW_GOLD: rawGoldIcon,
  BAR: barIcon,
  LOT: lotIcon,
};

interface Props {
  recordIds: string[];
  onComplete: (purchaseId: string) => void;
  onBack: () => void;
}

export function PurchaseFlow({ recordIds, onComplete, onBack }: Props) {
  const { t } = useI18n();
  const [records, setRecords] = useState<AvailableRecordListItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<AvailableRecordListResponse>('/records/available')
      .then((data) => {
        setRecords(data.records.filter((r) => recordIds.includes(r.id)));
      })
      .catch(() => {});
  }, [recordIds]);

  const goldTypeLabel = (val: string | null) => {
    if (!val) return '';
    const map: Record<string, string> = {
      RAW_GOLD: t.records.goldTypeRaw,
      BAR: t.records.goldTypeBar,
      LOT: t.records.goldTypeLot,
    };
    return map[val] || val;
  };

  const totalWeight = records.reduce((sum, r) => sum + (r.weight_grams ?? 0), 0);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const purchase = await apiFetch<PurchaseResponse>('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          record_ids: recordIds,
          notes: notes || undefined,
        }),
      });
      onComplete(purchase.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      setShowConfirm(false);
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
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{t.trader.purchaseFlowTitle}</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="purchase-summary">
        <div className="purchase-summary-row">
          <span>{t.records.goldType}</span>
          <span>{records.length} record(s)</span>
        </div>
        <div className="purchase-summary-row">
          <span>{t.records.weightGrams}</span>
          <span>{totalWeight.toFixed(1)}g</span>
        </div>
      </div>

      {/* Record list */}
      <div className="card-grid" style={{ marginTop: 12 }}>
        {records.map((rec) => (
          <div key={rec.id} className="record-card">
            <img
              src={GOLD_TYPE_ICONS[rec.gold_type || 'RAW_GOLD'] || rawGoldIcon}
              alt={goldTypeLabel(rec.gold_type)}
              className="record-card-icon"
            />
            <div className="record-card-body">
              <div className="record-card-title">
                {goldTypeLabel(rec.gold_type) || 'Gold'}
                {rec.weight_grams != null && ` — ${rec.weight_grams}g`}
              </div>
              <div className="record-card-meta">
                {t.trader.minerName}: {rec.miner_name}
              </div>
              <div className="record-card-meta">
                {rec.origin_mine_site || '—'}
                {rec.estimated_purity != null && ` · ${rec.estimated_purity}%`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="form-group" style={{ marginTop: 20 }}>
        <label>{t.trader.purchaseNotes}</label>
        <textarea
          className="form-textarea"
          placeholder={t.trader.purchaseNotesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-full"
        style={{ marginTop: 16 }}
        onClick={() => setShowConfirm(true)}
        disabled={submitting || records.length === 0}
      >
        {t.trader.confirmPurchase}
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="confirm-overlay" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>
              {interpolate(t.trader.confirmPurchaseMessage, {
                count: String(records.length),
                weight: totalWeight.toFixed(1),
              })}
            </p>
            <div className="confirm-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? t.trader.purchasing : t.trader.confirmPurchase}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
