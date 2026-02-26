import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { apiFetch } from '../api/client';
import type { AvailablePartnerListResponse, SalesPartnerListResponse } from '@asm-kyc/shared';

interface Props {
  onBack: () => void;
  onNext: () => void;
}

interface PartnerOption {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

export function StepSalesPartners({ onBack, onNext }: Props) {
  const { t } = useI18n();
  const [available, setAvailable] = useState<PartnerOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [alreadyAdded, setAlreadyAdded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [availRes, existingRes] = await Promise.all([
          apiFetch<AvailablePartnerListResponse>('/sales-partners/available'),
          apiFetch<SalesPartnerListResponse>('/sales-partners'),
        ]);
        if (cancelled) return;
        setAvailable(availRes.partners);
        setAlreadyAdded(new Set(existingRes.partners.map((p) => p.partner_id)));
      } catch {
        if (!cancelled) setError(t.auth.connectionError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [t]);

  const togglePartner = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    if (selected.size === 0) {
      onNext();
      return;
    }

    setSaving(true);
    setError('');
    try {
      for (const partnerId of selected) {
        await apiFetch('/sales-partners', {
          method: 'POST',
          body: JSON.stringify({ partner_id: partnerId }),
        });
      }
      onNext();
    } catch {
      setError(t.auth.connectionError);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'REFINER_USER') return t.salesPartners.refiner;
    return t.salesPartners.trader;
  };

  if (loading) {
    return <div className="onboarding-step"><p>{t.common.loading}</p></div>;
  }

  const allPartners = available.filter((p) => !alreadyAdded.has(p.id));

  return (
    <div className="onboarding-step">
      <p className="step-hint">{t.salesPartners.selectHint}</p>

      {error && <div className="error-message">{error}</div>}

      {allPartners.length === 0 && alreadyAdded.size === 0 ? (
        <div className="empty-state">
          <p>{t.salesPartners.noAvailablePartners}</p>
        </div>
      ) : (
        <div className="partner-selection-list">
          {alreadyAdded.size > 0 && (
            <p className="partner-already-added-hint">
              {alreadyAdded.size} partner(s) already selected
            </p>
          )}
          {allPartners.map((partner) => (
            <button
              key={partner.id}
              type="button"
              className={`partner-select-card${selected.has(partner.id) ? ' selected' : ''}`}
              onClick={() => togglePartner(partner.id)}
            >
              <div className="partner-select-checkbox">
                {selected.has(partner.id) ? '✓' : ''}
              </div>
              <div className="partner-select-info">
                <span className="partner-select-name">{partner.full_name}</span>
                <span className={`role-badge role-badge-${partner.role === 'REFINER_USER' ? 'refiner' : 'trader'}`}>
                  {getRoleBadge(partner.role)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="step-buttons">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t.common.back}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleNext}
          disabled={saving}
        >
          {saving ? t.onboarding.submitting : (selected.size === 0 ? t.salesPartners.skipForNow : t.common.next)}
        </button>
      </div>
    </div>
  );
}
