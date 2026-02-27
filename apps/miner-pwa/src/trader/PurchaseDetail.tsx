import { useState, useEffect } from 'react';
import { apiFetch, NetworkError } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { setCachedPurchaseDetail, getCachedPurchaseDetail } from '../offline/db';
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
    const load = async () => {
      try {
        const data = await apiFetch<PurchaseResponse>(`/purchases/${purchaseId}`);
        setPurchase(data);
        await setCachedPurchaseDetail(data);
      } catch (err) {
        if (err instanceof NetworkError) {
          const cached = await getCachedPurchaseDetail(purchaseId);
          if (cached) setPurchase(cached);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
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

  const getPaymentStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'PENDING': return { label: t.trader.statusPending, className: 'status-payment-pending' };
      case 'PROCESSING': return { label: t.trader.statusProcessing, className: 'status-payment-processing' };
      case 'COMPLETED': return { label: t.trader.statusCompleted, className: 'status-payment-completed' };
      case 'FAILED': return { label: t.trader.statusFailed, className: 'status-payment-failed' };
      default: return null;
    }
  };

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

  const paymentBadge = getPaymentStatusBadge(purchase.payment_status);

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

      {/* Payment Information (when present) */}
      {paymentBadge && (
        <div className="purchase-summary" style={{ marginTop: 12 }}>
          <div className="purchase-summary-row">
            <span>{t.trader.paymentStatus}</span>
            <span className={`status-badge ${paymentBadge.className}`}>{paymentBadge.label}</span>
          </div>
          {purchase.price_per_gram != null && (
            <div className="purchase-summary-row">
              <span>{t.trader.pricePerGram}</span>
              <span>{purchase.currency ?? 'ZMW'} {purchase.price_per_gram?.toFixed(2)}/g</span>
            </div>
          )}
          {purchase.total_price != null && (
            <div className="purchase-summary-row">
              <span>{t.trader.total}</span>
              <span>{purchase.currency ?? 'ZMW'} {purchase.total_price?.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

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
