import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n, interpolate } from '../i18n/I18nContext';
import type { RecordListResponse, RecordListItem } from '@asm-kyc/shared';

interface Props {
  onCreateNew: () => void;
  onViewRecord: (recordId: string) => void;
}

export function RecordsList({ onCreateNew, onViewRecord }: Props) {
  const { t } = useI18n();
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RecordListResponse>('/records')
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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString();
  };

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t.records.listTitle}</h1>
        <button type="button" className="btn btn-primary" onClick={onCreateNew} style={{ padding: '8px 16px', fontSize: 14 }}>
          + {t.home.newRecord}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">{t.records.noRecords}</div>
          <p className="empty-state-hint">{t.records.noRecordsHint}</p>
          <button type="button" className="btn btn-primary" onClick={onCreateNew}>
            + {t.home.newRecord}
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="record-card"
              onClick={() => onViewRecord(rec.id)}
            >
              <div style={{ fontSize: 28 }}>
                {rec.gold_type === 'BAR' ? '🧱' : rec.gold_type === 'LOT' ? '📦' : '🪨'}
              </div>
              <div className="record-card-body">
                <div className="record-card-title">
                  {goldTypeLabel(rec.gold_type) || t.records.createTitle}
                  {rec.weight_grams != null && ` — ${rec.weight_grams}g`}
                </div>
                <div className="record-card-meta">
                  {rec.origin_mine_site || '—'} · {formatDate(rec.updated_at)}
                  {rec.photo_count > 0 && ` · 📷 ${rec.photo_count}`}
                </div>
              </div>
              <span className={`status-badge status-${rec.status.toLowerCase()}`}>
                {rec.status === 'SUBMITTED' ? t.records.statusSubmitted : t.records.statusDraft}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
