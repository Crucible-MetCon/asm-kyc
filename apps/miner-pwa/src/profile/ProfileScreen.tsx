import { useAuth } from '../auth/AuthContext';
import { useI18n, interpolate, type Language } from '../i18n/I18nContext';
import { apiFetch } from '../api/client';
import type { UserProfile } from '@asm-kyc/shared';

interface Props {
  onEdit: () => void;
  onManageSites?: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function genderLabel(
  gender: string | null,
  t: ReturnType<typeof useI18n>['t'],
): string | null {
  if (!gender) return null;
  const map: Record<string, string> = {
    MALE: t.onboarding.genderMale,
    FEMALE: t.onboarding.genderFemale,
    OTHER: t.onboarding.genderOther,
    PREFER_NOT_TO_SAY: t.onboarding.genderPreferNot,
  };
  return map[gender] ?? gender;
}

export function ProfileScreen({ onEdit, onManageSites }: Props) {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const profile = user?.profile as UserProfile | null | undefined;

  const requiredFields: (keyof UserProfile)[] = [
    'full_name',
    'nrc_number',
    'date_of_birth',
    'gender',
    'mine_site_name',
    'mine_site_location',
  ];
  const filledFields = requiredFields.filter((f) => profile?.[f]);
  const hasConsent = !!profile?.consent_version;
  const totalRequired = requiredFields.length + 1;
  const totalFilled = filledFields.length + (hasConsent ? 1 : 0);
  const percentage = Math.round((totalFilled / totalRequired) * 100);

  const handleLanguageChange = async (newLang: Language) => {
    setLang(newLang);
    try {
      await apiFetch('/me/language', {
        method: 'PUT',
        body: JSON.stringify({ home_language: newLang }),
      });
    } catch {
      // optimistic — language already set locally
    }
  };

  return (
    <div className="screen">
      <h1>{t.profile.title}</h1>

      <div className="completeness-card">
        <div className="completeness-header">
          <span>{t.profile.completeness}</span>
          <span>{percentage}%</span>
        </div>
        <div className="completeness-bar">
          <div className="completeness-fill" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <div className="profile-section">
        <h2>{t.profile.language}</h2>
        <div className="language-switcher">
          <button
            className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleLanguageChange('en')}
          >
            {t.profile.languageEnglish}
          </button>
          <button
            className={`btn ${lang === 'bem' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleLanguageChange('bem')}
          >
            {t.profile.languageBemba}
          </button>
        </div>
      </div>

      <div className="profile-section">
        <h2>{t.profile.personalDetails}</h2>
        <ProfileField label={t.auth.fullName} value={profile?.full_name} t={t} />
        <ProfileField label={t.onboarding.nrcNumber} value={profile?.nrc_number} t={t} />
        <ProfileField
          label={t.onboarding.dateOfBirth}
          value={profile?.date_of_birth ? formatDate(profile.date_of_birth) : null}
          t={t}
        />
        <ProfileField
          label={t.onboarding.gender}
          value={genderLabel(profile?.gender ?? null, t)}
          t={t}
        />
      </div>

      <div className="profile-section">
        <h2>{t.profile.miningDetails}</h2>
        <ProfileField
          label={t.onboarding.mineSiteName}
          value={profile?.mine_site_name}
          t={t}
        />
        <ProfileField
          label={t.onboarding.mineSiteLocation}
          value={profile?.mine_site_location}
          t={t}
        />
        <ProfileField
          label={t.onboarding.miningLicense}
          value={profile?.mining_license_number}
          t={t}
        />
      </div>

      {onManageSites && (
        <button
          className="btn btn-secondary btn-full"
          style={{ marginTop: 12, marginBottom: 4 }}
          onClick={onManageSites}
        >
          {'\u26CF\uFE0F'} {t.mineSites.manageSites}
        </button>
      )}

      <div className="profile-section">
        <h2>{t.profile.consentStatus}</h2>
        {profile?.consent_version ? (
          <div className="consent-badge consent-accepted">
            {t.onboarding.consentAccepted} —{' '}
            {interpolate(t.onboarding.consentVersion, {
              version: profile.consent_version,
            })}
            {profile.consented_at && (
              <>
                <br />
                <small>
                  {interpolate(t.onboarding.consentDate, {
                    date: formatDate(profile.consented_at),
                  })}
                </small>
              </>
            )}
          </div>
        ) : (
          <div className="consent-badge consent-pending">{t.profile.incomplete}</div>
        )}
      </div>

      <button className="btn btn-primary btn-full" onClick={onEdit} style={{ marginTop: 24 }}>
        {t.profile.editProfile}
      </button>
    </div>
  );
}

function ProfileField({
  label,
  value,
  t,
}: {
  label: string;
  value: string | null | undefined;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <div className="profile-field">
      <span className="profile-field-label">{label}</span>
      <span className={`profile-field-value${!value ? ' not-provided' : ''}`}>
        {value || t.profile.notProvided}
      </span>
    </div>
  );
}
