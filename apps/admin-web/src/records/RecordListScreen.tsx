import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import type { AdminRecordListResponse, AdminRecordListItem } from '@asm-kyc/shared';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';

interface RecordListScreenProps {
  onSelectRecord: (id: string) => void;
}

const LIMIT = 20;

export function RecordListScreen({ onSelectRecord }: RecordListScreenProps) {
  const [records, setRecords] = useState<AdminRecordListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await apiFetch<AdminRecordListResponse>(`/admin/records?${params}`);
      setRecords(res.records);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <h1>Records</h1>
        <span className="page-header-count">{total} total</span>
      </div>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="PURCHASED">Purchased</option>
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search mine site or miner..." />
      </div>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">No records found</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Miner</th>
                <th>Weight (g)</th>
                <th>Purity (%)</th>
                <th>Gold Type</th>
                <th>Mine Site</th>
                <th>Status</th>
                <th>Review</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} onClick={() => onSelectRecord(r.id)}>
                  <td className="td-bold">{r.miner_name}</td>
                  <td>{r.weight_grams ?? '—'}</td>
                  <td>{r.estimated_purity ?? '—'}</td>
                  <td>{r.gold_type?.replace('_', ' ') ?? '—'}</td>
                  <td>{r.origin_mine_site ?? '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {r.review_status ? (
                      <StatusBadge status={r.review_status} />
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
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
