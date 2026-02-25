import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { apiFetch, ApiError } from '../api/client';
import { StepPersonalDetails } from './StepPersonalDetails';
import { StepMiningDetails } from './StepMiningDetails';
import { StepConsent } from './StepConsent';
import { ProgressIndicator } from './ProgressIndicator';

interface OnboardingData {
  full_name: string;
  nrc_number: string;
  date_of_birth: string;
  gender: string;
  mine_site_name: string;
  mine_site_location: string;
  mining_license_number: string;
  consent_accepted: boolean;
  consent_version: string;
}

interface Props {
  onComplete: () => void;
  initialData?: Partial<OnboardingData>;
  isEdit?: boolean;
}

const TOTAL_STEPS = 3;

export function OnboardingFlow({ onComplete, initialData, isEdit }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    full_name: initialData?.full_name ?? '',
    nrc_number: initialData?.nrc_number ?? '',
    date_of_birth: initialData?.date_of_birth ?? '',
    gender: initialData?.gender ?? '',
    mine_site_name: initialData?.mine_site_name ?? '',
    mine_site_location: initialData?.mine_site_location ?? '',
    mining_license_number: initialData?.mining_license_number ?? '',
    consent_accepted: false,
    consent_version: initialData?.consent_version ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateData = (fields: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: data.full_name,
          nrc_number: data.nrc_number,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          mine_site_name: data.mine_site_name,
          mine_site_location: data.mine_site_location,
          mining_license_number: data.mining_license_number,
        }),
      });

      if (data.consent_accepted && data.consent_version) {
        await apiFetch('/me/consent', {
          method: 'POST',
          body: JSON.stringify({ consent_version: data.consent_version }),
        });
      }

      onComplete();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setError(typeof body?.message === 'string' ? body.message : 'Failed to save profile');
      } else {
        setError(t.auth.connectionError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <h1>{isEdit ? t.profile.editProfile : t.onboarding.title}</h1>
      <ProgressIndicator current={step} total={TOTAL_STEPS} />

      {error && <div className="error-message">{error}</div>}

      {step === 1 && (
        <StepPersonalDetails
          data={data}
          onChange={updateData}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepMiningDetails
          data={data}
          onChange={updateData}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepConsent
          data={data}
          onChange={updateData}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
