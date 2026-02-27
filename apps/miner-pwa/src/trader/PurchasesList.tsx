import { useState, useEffect } from 'react';
import { apiFetch, NetworkError } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { setListCache, getListCache } from '../offline/db';
import type { PurchaseListResponse, PurchaseListItem } from '@asm-kyc/shared';

interface Props {
  onViewPurchase: (purchaseId: string) => void;
}

export function PurchasesList({ onViewPurchase }: Props) {
  const { t } = useI18n();
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<PurchaseListResponse>('/purchases');
        setPurchases(data.purchases);
        await setListCache('purchases-list', data.purchases);
      } catch (err) {
        if (err instanceof NetworkError) {
          const cached = await getListCache<PurchaseListItem[]>('purchases-list');
          if (cached) setPurchases(cached);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  const getPaymentBadge = (status: string | null | undefined) => {
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

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{t.trader.purchasesTitle}</h1>

      {purchases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{'\uD83D\uDED2'}</div>
          <div className="empty-state-title">{t.trader.noPurchases}</div>
          <p className="empty-state-hint">{t.trader.noPurchasesHint}</p>
        </div>
      ) : (
        <div>
          {purchases.map((p) => {
            const badge = getPaymentBadge(p.payment_status);
            return (
              <div
                key={p.id}
                className="purchase-card"
                onClick={() => onViewPurchase(p.id)}
              >
                <span className="card-icon">{'\uD83D\uDED2'}</span>
                <div className="purchase-card-body">
                  <div className="purchase-card-title">
                    {p.total_weight}g — {p.total_items} record(s)
                    {badge && (
                      <span className={`status-badge ${badge.className}`} style={{ marginLeft: 8, fontSize: 11 }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="purchase-card-meta">
                    {formatDate(p.purchased_at)}
                    {p.notes && ` · ${p.notes.substring(0, 50)}${p.notes.length > 50 ? '...' : ''}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
