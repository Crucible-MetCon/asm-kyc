import { useState, useEffect } from 'react';
import { apiFetch, NetworkError } from '../api/client';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { setListCache, getListCache, getAllDrafts, type DraftRecord } from '../offline/db';
import type { RecordListResponse, RecordListItem } from '@asm-kyc/shared';
import rawGoldIcon from '../assets/gold-types/raw-gold.png';
import barIcon from '../assets/gold-types/bar.png';
import lotIcon from '../assets/gold-types/lot.png';

const GOLD_TYPE_ICONS: Record<string, string> = {
  RAW_GOLD: rawGoldIcon,
  BAR: barIcon,
  LOT: lotIcon,
};

interface Props {
  onCreateNew: () => void;
  onViewRecord: (recordId: string) => void;
}

export function RecordsList({ onCreateNew, onViewRecord }: Props) {
  const { t } = useI18n();
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Load local drafts (pending sync)
      try {
        const localDrafts = await getAllDrafts();
        setDrafts(localDrafts.filter((d) => d.syncStatus !== 'synced'));
      } catch { /* ignore */ }

      // Load server records
      try {
        const data = await apiFetch<RecordListResponse>('/records');
        setRecords(data.records);
        await setListCache('records-list', data.records);
      } catch (err) {
        if (err instanceof NetworkError) {
          const cached = await getListCache<RecordListItem[]>('records-list');
          if (cached) setRecords(cached);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
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
          {/* Offline drafts pending sync */}
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="record-card"
              style={{ opacity: 0.85 }}
            >
              <img
                src={GOLD_TYPE_ICONS[draft.data.gold_type || 'RAW_GOLD'] || rawGoldIcon}
                alt={goldTypeLabel(draft.data.gold_type)}
                className="record-card-icon"
              />
              <div className="record-card-body">
                <div className="record-card-title">
                  {goldTypeLabel(draft.data.gold_type) || t.records.createTitle}
                  {draft.data.weight_grams != null && ` — ${draft.data.weight_grams}g`}
                </div>
                <div className="record-card-meta">
                  {draft.data.origin_mine_site || '—'} · {formatDate(draft.createdAt)}
                </div>
              </div>
              <span className="status-badge status-pending-sync">
                {t.sync.pendingSync}
              </span>
            </div>
          ))}
          {/* Server records */}
          {records.map((rec) => (
            <div
              key={rec.id}
              className="record-card"
              onClick={() => onViewRecord(rec.id)}
            >
              <img
                src={GOLD_TYPE_ICONS[rec.gold_type || 'RAW_GOLD'] || rawGoldIcon}
                alt={goldTypeLabel(rec.gold_type)}
                className="record-card-icon"
              />
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
                {rec.status === 'PURCHASED'
                  ? t.records.statusPurchased
                  : rec.status === 'SUBMITTED'
                  ? t.records.statusSubmitted
                  : t.records.statusDraft}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
