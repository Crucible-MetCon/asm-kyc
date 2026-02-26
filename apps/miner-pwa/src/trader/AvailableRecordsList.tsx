import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n, interpolate } from '../i18n/I18nContext';
import type { AvailableRecordListResponse, AvailableRecordListItem } from '@asm-kyc/shared';
import rawGoldIcon from '../assets/gold-types/raw-gold.png';
import barIcon from '../assets/gold-types/bar.png';
import lotIcon from '../assets/gold-types/lot.png';

const GOLD_TYPE_ICONS: Record<string, string> = {
  RAW_GOLD: rawGoldIcon,
  BAR: barIcon,
  LOT: lotIcon,
};

interface Props {
  onPurchase: (recordIds: string[]) => void;
}

export function AvailableRecordsList({ onPurchase }: Props) {
  const { t } = useI18n();
  const [records, setRecords] = useState<AvailableRecordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<AvailableRecordListResponse>('/records/available')
      .then((data) => setRecords(data.records))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const goldTypeLabel = (val: string | null) => {
    if (!val) return '';
    const map: Record<string, string> = {
      RAW_GOLD: t.records.goldTypeRaw,
      BAR: t.records.goldTypeBar,
      LOT: t.records.goldTypeLot,
    };
    return map[val] || val;
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedWeight = records
    .filter((r) => selected.has(r.id))
    .reduce((sum, r) => sum + (r.weight_grams ?? 0), 0);

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  return (
    <>
      <div className="screen" style={selected.size > 0 ? { paddingBottom: 140 } : undefined}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{t.trader.availableTitle}</h1>

        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">{t.trader.noAvailable}</div>
            <p className="empty-state-hint">{t.trader.noAvailableHint}</p>
          </div>
        ) : (
          <div className="card-grid">
            {records.map((rec) => (
              <div
                key={rec.id}
                className={`record-card-selectable${selected.has(rec.id) ? ' selected' : ''}`}
                onClick={() => toggle(rec.id)}
              >
                <input
                  type="checkbox"
                  className="record-card-checkbox"
                  checked={selected.has(rec.id)}
                  onChange={() => toggle(rec.id)}
                />
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
                    {rec.origin_mine_site || '—'}
                    {rec.estimated_purity != null && ` · ${rec.estimated_purity}%`}
                  </div>
                  <div className="record-card-meta">
                    {t.trader.minerName}: {rec.miner_name}
                    {rec.photo_count > 0 && ` · 📷 ${rec.photo_count}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="purchase-footer">
          <div className="purchase-footer-info">
            <strong>{interpolate(t.trader.selectedCount, { count: String(selected.size) })}</strong>
            <br />
            {interpolate(t.trader.totalWeight, { weight: selectedWeight.toFixed(1) })}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: 14 }}
            onClick={() => onPurchase(Array.from(selected))}
          >
            {interpolate(t.trader.purchaseSelected, { count: String(selected.size) })}
          </button>
        </div>
      )}
    </>
  );
}
