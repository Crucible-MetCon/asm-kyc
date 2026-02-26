import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import type { PurchaseResponse } from '@asm-kyc/shared';
import rawGoldIcon from '../assets/gold-types/raw-gold.png';
import barIcon from '../assets/gold-types/bar.png';
import lotIcon from '../assets/gold-types/lot.png';

const GOLD_TYPE_ICONS: Record<string, string> = {
  RAW_GOLD: rawGoldIcon,
  BAR: barIcon,
  LOT: lotIcon,
};

interface Props {
  purchaseId: string;
  onBack: () => void;
}

export function PurchaseDetail({ purchaseId, onBack }: Props) {
  const { t } = useI18n();
  const [purchase, setPurchase] = useState<PurchaseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PurchaseResponse>(`/purchases/${purchaseId}`)
      .then(setPurchase)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [purchaseId]);

  const goldTypeLabel = (val: string | null) => {
    if (!val) return '';
    const map: Record<string, string> = {
      RAW_GOLD: t.records.goldTypeRaw,
      BAR: t.records.goldTypeBar,
      LOT: t.records.goldTypeLot,
    };
    return map[val] || val;
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  if (!purchase) {
    return (
      <div className="screen">
        <button type="button" className="back-button" onClick={onBack}>← {t.common.back}</button>
        <p>Purchase not found</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="record-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← {t.common.back}
        </button>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{t.trader.purchaseDetailTitle}</h1>

      {/* Summary */}
      <div className="purchase-summary">
        <div className="purchase-summary-row">
          <span>{t.records.purchaseDate}</span>
          <span>{formatDate(purchase.purchased_at)}</span>
        </div>
        <div className="purchase-summary-row">
          <span>{t.records.weightGrams}</span>
          <span>{purchase.total_weight}g</span>
        </div>
        <div className="purchase-summary-row">
          <span>{t.trader.purchasedRecords}</span>
          <span>{purchase.total_items}</span>
        </div>
        {purchase.notes && (
          <div className="purchase-summary-row" style={{ flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{t.trader.purchaseNotes}</span>
            <span style={{ fontSize: 14 }}>{purchase.notes}</span>
          </div>
        )}
      </div>

      {/* Records */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
        {t.trader.purchasedRecords}
      </h2>
      <div className="card-grid" style={{ marginTop: 0 }}>
        {purchase.items.map((item) => (
          <div key={item.id} className="record-card">
            <img
              src={GOLD_TYPE_ICONS[item.record.gold_type || 'RAW_GOLD'] || rawGoldIcon}
              alt={goldTypeLabel(item.record.gold_type)}
              className="record-card-icon"
            />
            <div className="record-card-body">
              <div className="record-card-title">
                {goldTypeLabel(item.record.gold_type) || 'Gold'}
                {item.record.weight_grams != null && ` — ${item.record.weight_grams}g`}
              </div>
              <div className="record-card-meta">
                {t.trader.minerName}: {item.record.miner_name}
              </div>
              <div className="record-card-meta">
                {item.record.origin_mine_site || '—'}
                {item.record.estimated_purity != null && ` · ${item.record.estimated_purity}%`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
