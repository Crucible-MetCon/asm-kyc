import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import type { PurchaseListResponse, PurchaseListItem } from '@asm-kyc/shared';

interface Props {
  onViewPurchase: (purchaseId: string) => void;
}

export function PurchasesList({ onViewPurchase }: Props) {
  const { t } = useI18n();
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PurchaseListResponse>('/purchases')
      .then((data) => setPurchases(data.purchases))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  return (
    <div className="screen">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{t.trader.purchasesTitle}</h1>

      {purchases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <div className="empty-state-title">{t.trader.noPurchases}</div>
          <p className="empty-state-hint">{t.trader.noPurchasesHint}</p>
        </div>
      ) : (
        <div>
          {purchases.map((p) => (
            <div
              key={p.id}
              className="purchase-card"
              onClick={() => onViewPurchase(p.id)}
            >
              <span className="card-icon">🛒</span>
              <div className="purchase-card-body">
                <div className="purchase-card-title">
                  {p.total_weight}g — {p.total_items} record(s)
                </div>
                <div className="purchase-card-meta">
                  {formatDate(p.purchased_at)}
                  {p.notes && ` · ${p.notes.substring(0, 50)}${p.notes.length > 50 ? '...' : ''}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
