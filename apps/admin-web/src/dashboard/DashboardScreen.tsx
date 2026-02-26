import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { AdminDashboardStats } from '@asm-kyc/shared';

interface DashboardScreenProps {
  onNavigateRecords: () => void;
  onNavigateCompliance: () => void;
  onNavigateUsers: () => void;
}

export function DashboardScreen({ onNavigateRecords, onNavigateCompliance, onNavigateUsers }: DashboardScreenProps) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminDashboardStats>('/admin/dashboard')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-loading">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="page-error">Failed to load dashboard data</div>;
  }

  const getStatusCount = (status: string) =>
    stats.records_by_status.find((r) => r.status === status)?.count ?? 0;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <button type="button" className="stat-card stat-card-clickable" onClick={onNavigateUsers}>
          <div className="stat-value">{stats.total_users}</div>
          <div className="stat-label">Total Users</div>
          <div className="stat-breakdown">
            {stats.total_miners} miners, {stats.total_traders} traders, {stats.total_refiners} refiners
          </div>
        </button>

        <button type="button" className="stat-card stat-card-clickable" onClick={onNavigateRecords}>
          <div className="stat-value">{stats.total_records}</div>
          <div className="stat-label">Total Records</div>
          <div className="stat-breakdown">
            {getStatusCount('DRAFT')} draft, {getStatusCount('SUBMITTED')} submitted, {getStatusCount('PURCHASED')} purchased
          </div>
        </button>

        <div className="stat-card">
          <div className="stat-value">{stats.total_purchases}</div>
          <div className="stat-label">Total Purchases</div>
        </div>

        <button
          type="button"
          className={`stat-card stat-card-clickable ${stats.pending_reviews > 0 ? 'stat-card-alert' : ''}`}
          onClick={onNavigateCompliance}
        >
          <div className="stat-value">{stats.pending_reviews}</div>
          <div className="stat-label">Pending Reviews</div>
          <div className="stat-breakdown">
            {stats.total_compliance_reviews} total reviews
          </div>
        </button>
      </div>
    </div>
  );
}
