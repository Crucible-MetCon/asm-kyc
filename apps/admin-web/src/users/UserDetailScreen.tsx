import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { AdminUserDetail } from '@asm-kyc/shared';

interface UserDetailScreenProps {
  userId: string;
  onBack: () => void;
}

export function UserDetailScreen({ userId, onBack }: UserDetailScreenProps) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminUserDetail>(`/admin/users/${userId}`);
      setUser(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  const handleToggleDisable = async () => {
    if (!user) return;
    const action = user.is_disabled ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} user "${user.username}"?`)) return;

    setToggling(true);
    try {
      await apiFetch(`/admin/users/${userId}/disable`, {
        method: 'PATCH',
        body: JSON.stringify({ is_disabled: !user.is_disabled }),
      });
      await loadUser();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="page-loading">Loading user...</div>;
  if (!user) return <div className="page-error">User not found</div>;

  const roleName: Record<string, string> = {
    MINER_USER: 'Miner',
    TRADER_USER: 'Trader',
    REFINER_USER: 'Refiner',
    ADMIN_USER: 'Admin',
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
            Back
          </button>
          <h1>{user.profile?.full_name ?? user.username}</h1>
          <span className={`role-tag role-tag-${(user.role.split('_')[0] ?? '').toLowerCase()}`}>
            {roleName[user.role] ?? user.role}
          </span>
          {user.is_disabled ? (
            <span className="badge badge-disabled">Disabled</span>
          ) : (
            <span className="badge badge-active">Active</span>
          )}
        </div>
        {user.role !== 'ADMIN_USER' && (
          <button
            type="button"
            className={`btn btn-sm ${user.is_disabled ? 'btn-primary' : 'btn-danger'}`}
            onClick={handleToggleDisable}
            disabled={toggling}
          >
            {toggling ? '...' : user.is_disabled ? 'Enable User' : 'Disable User'}
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Account Details</h2>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Username</label>
            <div className="value">{user.username}</div>
          </div>
          <div className="detail-field">
            <label>Phone</label>
            <div className="value">{user.phone_e164}</div>
          </div>
          <div className="detail-field">
            <label>Role</label>
            <div className="value">{roleName[user.role] ?? user.role}</div>
          </div>
          <div className="detail-field">
            <label>Registered</label>
            <div className="value">{new Date(user.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {user.profile && (
        <div className="card">
          <h2 className="card-title">Profile</h2>
          <div className="detail-grid">
            <div className="detail-field">
              <label>Full Name</label>
              <div className="value">{user.profile.full_name}</div>
            </div>
            <div className="detail-field">
              <label>Type</label>
              <div className="value">{user.profile.counterparty_type.replace(/_/g, ' ')}</div>
            </div>
            <div className="detail-field">
              <label>NRC Number</label>
              <div className="value">{user.profile.nrc_number ?? '—'}</div>
            </div>
            <div className="detail-field">
              <label>Date of Birth</label>
              <div className="value">
                {user.profile.date_of_birth
                  ? new Date(user.profile.date_of_birth).toLocaleDateString()
                  : '—'}
              </div>
            </div>
            <div className="detail-field">
              <label>Gender</label>
              <div className="value">{user.profile.gender ?? '—'}</div>
            </div>
            <div className="detail-field">
              <label>Language</label>
              <div className="value">{user.profile.home_language === 'bem' ? 'Bemba' : 'English'}</div>
            </div>
            <div className="detail-field">
              <label>Mine Site</label>
              <div className="value">{user.profile.mine_site_name ?? '—'}</div>
            </div>
            <div className="detail-field">
              <label>Mine Location</label>
              <div className="value">{user.profile.mine_site_location ?? '—'}</div>
            </div>
            <div className="detail-field">
              <label>Mining License</label>
              <div className="value">{user.profile.mining_license_number ?? '—'}</div>
            </div>
            <div className="detail-field">
              <label>Profile Completed</label>
              <div className="value">
                {user.profile.profile_completed_at
                  ? new Date(user.profile.profile_completed_at).toLocaleString()
                  : 'Not completed'}
              </div>
            </div>
            <div className="detail-field">
              <label>Consent</label>
              <div className="value">
                {user.profile.consented_at
                  ? `v${user.profile.consent_version} on ${new Date(user.profile.consented_at).toLocaleDateString()}`
                  : 'Not consented'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Activity</h2>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Records Created</label>
            <div className="value">{user.record_count}</div>
          </div>
          <div className="detail-field">
            <label>Purchases Made</label>
            <div className="value">{user.purchase_count}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
