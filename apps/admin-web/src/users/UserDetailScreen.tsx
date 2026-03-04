import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { AdminUserDetail, DocumentResponse } from '@asm-kyc/shared';
import { DOCUMENT_TYPES } from '@asm-kyc/shared';
import { RiskBadge } from './RiskBadge';

interface UserDetailScreenProps {
  userId: string;
  onBack: () => void;
}

export function UserDetailScreen({ userId, onBack }: UserDetailScreenProps) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminUserDetail>(`/admin/users/${userId}`);
      setUser(res);
      // Load documents for non-admin users
      if (res.role !== 'ADMIN_USER') {
        try {
          const docRes = await apiFetch<{ documents: DocumentResponse[] }>(`/admin/users/${userId}/documents`);
          setDocuments(docRes.documents);
        } catch {
          // ignore — documents may not exist
        }
      }
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
    AGGREGATOR_USER: 'Aggregator',
    MELTER_USER: 'Melter',
    ADMIN_USER: 'Admin',
  };

  const docTypeLabels: Record<string, string> = {
    NRC: 'National Registration Card',
    MINING_LICENSE: 'Mining License',
    PASSPORT: 'Passport',
    COOPERATIVE_CERT: 'Cooperative Certificate',
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
        <div style={{ display: 'flex', gap: 8 }}>
          {user.role !== 'ADMIN_USER' && (
            <a
              href={`/api/admin/users/${userId}/entity-pack`}
              className="btn btn-secondary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Entity Pack
            </a>
          )}
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
          <div className="detail-field">
            <label>Surveys Completed</label>
            <div className="value">{user.survey_count} / 6</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Risk Assessment</h2>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Risk Level</label>
            <div className="value"><RiskBadge level={user.risk_level} /></div>
          </div>
        </div>
        {user.risk_flags.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Triggered Flags</label>
            <table className="data-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Flag</th>
                  <th>Survey</th>
                  <th>Question</th>
                </tr>
              </thead>
              <tbody>
                {user.risk_flags.map((flag, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: flag.severity === 'CRITICAL' ? '#fde8e8'
                            : flag.severity === 'HIGH' ? '#fff3e0' : '#fef9c3',
                          color: flag.severity === 'CRITICAL' ? '#dc2626'
                            : flag.severity === 'HIGH' ? '#ea580c' : '#ca8a04',
                          fontWeight: 600,
                        }}
                      >
                        {flag.severity}
                      </span>
                    </td>
                    <td>{flag.label_key.replace('risk.', '')}</td>
                    <td>{flag.survey_slug}</td>
                    <td>{flag.question_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#6b7280', marginTop: 8 }}>No risk flags triggered.</p>
        )}
      </div>

      {user.role !== 'ADMIN_USER' && (
        <div className="card">
          <h2 className="card-title">Documents</h2>
          {documents.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No documents uploaded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DOCUMENT_TYPES.map((docType) => {
                const doc = documents.find((d) => d.doc_type === docType);
                return (
                  <div
                    key={docType}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      border: doc ? '1px solid #16a34a' : '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: doc ? '#f0fdf4' : '#fafafa',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {docTypeLabels[docType] ?? docType}
                      </div>
                      {doc ? (
                        <>
                          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                            Uploaded · AI confidence: {doc.ai_confidence || 'N/A'}
                          </div>
                          {doc.ai_extracted && (
                            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                              {Object.entries(doc.ai_extracted)
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                  <span key={k} style={{ marginRight: 12 }}>
                                    <strong>{k}:</strong> {String(v)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Not uploaded</div>
                      )}
                    </div>
                    {doc?.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
