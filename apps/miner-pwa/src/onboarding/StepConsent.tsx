import { useState, useEffect } from 'react';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { apiFetch } from '../api/client';
import type { ConsentVersionResponse } from '@asm-kyc/shared';

interface Props {
  data: { consent_accepted: boolean; consent_version: string };
  onChange: (fields: { consent_accepted: boolean; consent_version: string }) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function StepConsent({ data, onChange, onBack, onSubmit, submitting }: Props) {
  const { t } = useI18n();
  const [consentText, setConsentText] = useState('');
  const [consentVersion, setConsentVersion] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ConsentVersionResponse>('/consent/latest')
      .then((res) => {
        setConsentText(res.text);
        setConsentVersion(res.version);
        onChange({ consent_accepted: false, consent_version: res.version });
      })
      .catch(() => setConsentText('Failed to load consent text.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckbox = (checked: boolean) => {
    onChange({ consent_accepted: checked, consent_version: consentVersion });
  };

  return (
    <div className="onboarding-step">
      <h2>{t.onboarding.consentTitle}</h2>

      {loading ? (
        <div className="loading-text">{t.common.loading}</div>
      ) : (
        <>
          <div className="consent-text">{consentText}</div>
          <p className="consent-version-label">
            {interpolate(t.onboarding.consentVersion, { version: consentVersion })}
          </p>

          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={data.consent_accepted}
              onChange={(e) => handleCheckbox(e.target.checked)}
            />
            <span>{t.onboarding.consentAccept}</span>
          </label>
        </>
      )}

      <div className="step-buttons">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t.common.back}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={!data.consent_accepted || submitting}
        >
          {submitting ? t.onboarding.submitting : t.onboarding.submitProfile}
        </button>
      </div>
    </div>
  );
}
