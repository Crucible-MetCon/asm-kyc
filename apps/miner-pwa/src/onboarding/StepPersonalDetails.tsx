import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ProfileStep1Schema } from '@asm-kyc/shared';

function getLicenceLabel(role: string, t: ReturnType<typeof useI18n>['t']): string {
  switch (role) {
    case 'REFINER_USER': return t.onboarding.refiningLicence;
    case 'AGGREGATOR_USER': return t.onboarding.aggregatorLicence;
    case 'MELTER_USER': return t.onboarding.melterLicence;
    case 'TRADER_USER': return t.onboarding.traderLicence;
    default: return t.onboarding.licenceNumber;
  }
}

interface Props {
  data: {
    full_name: string;
    nrc_number: string;
    date_of_birth: string;
    gender: string;
    mining_license_number?: string;
  };
  onChange: (fields: Partial<Props['data']>) => void;
  onNext: () => void;
  role?: string;
}

export function StepPersonalDetails({ data, onChange, onNext, role }: Props) {
  const { t } = useI18n();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isMiner = role === 'MINER_USER';

  const validate = () => {
    const result = ProfileStep1Schema.safeParse(data);
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
        <label className="form-label" htmlFor="full_name">
          {t.auth.fullName}
        </label>
        <input
          id="full_name"
          type="text"
          className={`form-input${errors.full_name ? ' input-error' : ''}`}
          value={data.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
        />
        {errors.full_name && <span className="field-error">{errors.full_name}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="nrc_number">
          {t.onboarding.nrcNumber}
        </label>
        <input
          id="nrc_number"
          type="text"
          className={`form-input${errors.nrc_number ? ' input-error' : ''}`}
          placeholder={t.onboarding.nrcPlaceholder}
          value={data.nrc_number}
          onChange={(e) => onChange({ nrc_number: e.target.value })}
        />
        {errors.nrc_number && <span className="field-error">{errors.nrc_number}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="date_of_birth">
          {t.onboarding.dateOfBirth}
        </label>
        <input
          id="date_of_birth"
          type="date"
          className={`form-input${errors.date_of_birth ? ' input-error' : ''}`}
          value={data.date_of_birth}
          onChange={(e) => onChange({ date_of_birth: e.target.value })}
        />
        {errors.date_of_birth && (
          <span className="field-error">{errors.date_of_birth}</span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="gender">
          {t.onboarding.gender}
        </label>
        <select
          id="gender"
          className={`form-select${errors.gender ? ' input-error' : ''}`}
          value={data.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
        >
          <option value="">--</option>
          <option value="MALE">{t.onboarding.genderMale}</option>
          <option value="FEMALE">{t.onboarding.genderFemale}</option>
          <option value="OTHER">{t.onboarding.genderOther}</option>
          <option value="PREFER_NOT_TO_SAY">{t.onboarding.genderPreferNot}</option>
        </select>
        {errors.gender && <span className="field-error">{errors.gender}</span>}
      </div>

      {!isMiner && role && (
        <div className="form-group">
          <label className="form-label" htmlFor="mining_license_number">
            {getLicenceLabel(role, t)}{' '}
            <span className="optional-hint">({t.common.optional})</span>
          </label>
          <input
            id="mining_license_number"
            type="text"
            className="form-input"
            value={data.mining_license_number ?? ''}
            onChange={(e) => onChange({ mining_license_number: e.target.value })}
          />
        </div>
      )}

      <button type="button" className="btn btn-primary btn-full" onClick={handleNext}>
        {t.common.next}
      </button>
    </div>
  );
}
