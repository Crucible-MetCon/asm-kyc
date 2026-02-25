import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ProfileStep2Schema } from '@asm-kyc/shared';

interface Props {
  data: {
    mine_site_name: string;
    mine_site_location: string;
    mining_license_number: string;
  };
  onChange: (fields: Partial<Props['data']>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepMiningDetails({ data, onChange, onBack, onNext }: Props) {
  const { t } = useI18n();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const result = ProfileStep2Schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="onboarding-step">
      <div className="form-group">
        <label className="form-label" htmlFor="mine_site_name">
          {t.onboarding.mineSiteName}
        </label>
        <input
          id="mine_site_name"
          type="text"
          className={`form-input${errors.mine_site_name ? ' input-error' : ''}`}
          value={data.mine_site_name}
          onChange={(e) => onChange({ mine_site_name: e.target.value })}
        />
        {errors.mine_site_name && (
          <span className="field-error">{errors.mine_site_name}</span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="mine_site_location">
          {t.onboarding.mineSiteLocation}
        </label>
        <input
          id="mine_site_location"
          type="text"
          className={`form-input${errors.mine_site_location ? ' input-error' : ''}`}
          placeholder={t.onboarding.mineSiteLocationHint}
          value={data.mine_site_location}
          onChange={(e) => onChange({ mine_site_location: e.target.value })}
        />
        {errors.mine_site_location && (
          <span className="field-error">{errors.mine_site_location}</span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="mining_license_number">
          {t.onboarding.miningLicense}{' '}
          <span className="optional-hint">({t.common.optional})</span>
        </label>
        <input
          id="mining_license_number"
          type="text"
          className="form-input"
          value={data.mining_license_number}
          onChange={(e) => onChange({ mining_license_number: e.target.value })}
        />
      </div>

      <div className="step-buttons">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t.common.back}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          {t.common.next}
        </button>
      </div>
    </div>
  );
}
