import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import type { ComplianceReviewListResponse, ComplianceReviewListItem } from '@asm-kyc/shared';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

interface ComplianceScreenProps {
  onSelectRecord: (id: string) => void;
}

const LIMIT = 20;
const STATUS_TABS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'];

export function ComplianceScreen({ onSelectRecord }: ComplianceScreenProps) {
  const [reviews, setReviews] = useState<ComplianceReviewListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status) params.set('status', status);
      const res = await apiFetch<ComplianceReviewListResponse>(`/admin/compliance?${params}`);
      setReviews(res.reviews);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <h1>Compliance Reviews</h1>
        <span className="page-header-count">{total} total</span>
      </div>

      <div className="tab-bar">
        {STATUS_TABS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`tab-item ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">No reviews found</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Miner</th>
                <th>Weight (g)</th>
                <th>Gold Type</th>
                <th>Mine Site</th>
                <th>Notes</th>
                <th>Reviewer</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} onClick={() => onSelectRecord(r.record_id)}>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="td-bold">{r.miner_name}</td>
                  <td>{r.record_weight ?? '—'}</td>
                  <td>{r.record_gold_type?.replace('_', ' ') ?? '—'}</td>
                  <td>{r.record_mine_site ?? '—'}</td>
                  <td className="td-truncate">{r.notes ?? '—'}</td>
                  <td>{r.reviewer_name}</td>
                  <td>{new Date(r.reviewed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
