import { useState, useEffect, useCallback } from 'react';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { apiFetch } from '../api/client';
import type {
  SalesPartnerListResponse,
  SalesPartnerListItem,
  AvailablePartnerListResponse,
  AvailablePartnerListItem,
} from '@asm-kyc/shared';

export function SalesPartnerScreen() {
  const { t } = useI18n();
  const [partners, setPartners] = useState<SalesPartnerListItem[]>([]);
  const [available, setAvailable] = useState<AvailablePartnerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [partnersRes, availableRes] = await Promise.all([
        apiFetch<SalesPartnerListResponse>('/sales-partners'),
        apiFetch<AvailablePartnerListResponse>('/sales-partners/available'),
      ]);
      setPartners(partnersRes.partners);
      setAvailable(availableRes.partners);
    } catch {
      setError(t.auth.connectionError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (partnerId: string) => {
    setAdding(partnerId);
    setError('');
    try {
      await apiFetch('/sales-partners', {
        method: 'POST',
        body: JSON.stringify({ partner_id: partnerId }),
      });
      await loadData();
      setShowAdd(false);
    } catch {
      setError(t.auth.connectionError);
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (partnerId: string, partnerName: string) => {
    const msg = interpolate(t.salesPartners.confirmRemove, { name: partnerName });
    if (!confirm(msg)) return;

    setRemoving(partnerId);
    setError('');
    try {
      await apiFetch(`/sales-partners/${partnerId}`, { method: 'DELETE' });
      await loadData();
    } catch {
      setError(t.auth.connectionError);
    } finally {
      setRemoving(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'REFINER_USER') return t.salesPartners.refiner;
    return t.salesPartners.trader;
  };

  if (loading) {
    return <div className="screen screen-centered"><p>{t.common.loading}</p></div>;
  }

  return (
    <div className="screen">
      <h1>{t.salesPartners.title}</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Current partners */}
      {partners.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">{t.salesPartners.noPartners}</p>
          <p className="empty-state-hint">{t.salesPartners.noPartnersHint}</p>
        </div>
      ) : (
        <div className="partner-list">
          {partners.map((sp) => (
            <div key={sp.id} className="partner-card">
              <div className="partner-card-info">
                <span className="partner-card-name">{sp.partner_name}</span>
                <span className={`role-badge role-badge-${sp.partner_role === 'REFINER_USER' ? 'refiner' : 'trader'}`}>
                  {getRoleBadge(sp.partner_role)}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemove(sp.partner_id, sp.partner_name)}
                disabled={removing === sp.partner_id}
              >
                {removing === sp.partner_id ? '...' : t.salesPartners.removePartner}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add partner button */}
      {!showAdd && (
        <button
          type="button"
          className="btn btn-primary btn-full"
          onClick={() => setShowAdd(true)}
          style={{ marginTop: '1rem' }}
        >
          {t.salesPartners.addPartner}
        </button>
      )}

      {/* Add partner picker */}
      {showAdd && (
        <div className="partner-picker">
          <h2>{t.salesPartners.addPartner}</h2>
          {available.length === 0 ? (
            <p className="empty-state-hint">{t.salesPartners.noAvailablePartners}</p>
          ) : (
            <div className="partner-selection-list">
              {available.map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  className="partner-select-card"
                  onClick={() => handleAdd(partner.id)}
                  disabled={adding === partner.id}
                >
                  <div className="partner-select-info">
                    <span className="partner-select-name">{partner.full_name}</span>
                    <span className={`role-badge role-badge-${partner.role === 'REFINER_USER' ? 'refiner' : 'trader'}`}>
                      {getRoleBadge(partner.role)}
                    </span>
                  </div>
                  <span className="partner-add-icon">
                    {adding === partner.id ? '...' : '+'}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={() => setShowAdd(false)}
            style={{ marginTop: '0.5rem' }}
          >
            {t.common.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
