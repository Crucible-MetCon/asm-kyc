import { useState, useEffect } from 'react';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { apiFetch, NetworkError } from '../api/client';
import { getListCache, setListCache } from '../offline/db';
import { SURVEY_DEFINITIONS } from '@asm-kyc/shared';
import type { SurveyListResponse, SurveyStatusResponse } from '@asm-kyc/shared';
import { Home, Pickaxe, Globe, ShieldCheck, Truck, Scale, ClipboardList, type LucideIcon } from 'lucide-react';

interface Props {
  onStartSurvey: (slug: string) => void;
}

/** Resolve a translation key like "surveys.aboutYou.title" from the t object */
function resolveKey(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}

const SURVEY_ICONS: Record<string, LucideIcon> = {
  'about-you': Home,
  'mining-operation': Pickaxe,
  'environmental-practices': Globe,
  'safety-rights': ShieldCheck,
  'gold-journey': Truck,
  'governance-compliance': Scale,
};

export function SurveyListScreen({ onStartSurvey }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<SurveyListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Try cache first
      const cached = await getListCache<SurveyListResponse>('surveys-list');
      if (cached && !cancelled) {
        setData(cached);
        setLoading(false);
      }

      try {
        const fresh = await apiFetch<SurveyListResponse>('/surveys');
        if (!cancelled) {
          setData(fresh);
          setLoading(false);
          await setListCache('surveys-list', fresh);
        }
      } catch (err) {
        if (err instanceof NetworkError && cached) {
          // Use cached data offline
        } else if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading && !data) {
    return <div className="screen-centered">{t.common.loading}</div>;
  }

  const surveys = data?.surveys ?? [];

  return (
    <div className="survey-list-screen">
      <h1>{t.surveys.title}</h1>
      <p className="subtitle">{t.surveys.subtitle}</p>

      {data && (
        <div className="survey-earnings-summary">
          <div className="survey-earnings-item">
            <span className="survey-earnings-label">{t.surveys.totalEarned}</span>
            <span className="survey-earnings-value">${data.total_earned.toFixed(2)}</span>
          </div>
          <div className="survey-earnings-item">
            <span className="survey-earnings-label">{t.surveys.totalAvailable}</span>
            <span className="survey-earnings-value">${data.total_available.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="survey-card-list">
        {surveys.map((s) => (
          <SurveyCard key={s.survey.slug} status={s} onStart={() => onStartSurvey(s.survey.slug)} t={t} />
        ))}
      </div>
    </div>
  );
}

function SurveyCard({
  status,
  onStart,
  t,
}: {
  status: SurveyStatusResponse;
  onStart: () => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const def = SURVEY_DEFINITIONS.find((d) => d.slug === status.survey.slug);
  const title = def
    ? resolveKey(t as unknown as Record<string, unknown>, def.i18nTitleKey)
    : status.survey.slug;
  const desc = def
    ? resolveKey(t as unknown as Record<string, unknown>, def.i18nDescKey)
    : '';
  const IconComponent = SURVEY_ICONS[status.survey.slug] ?? ClipboardList;
  const minutes = def?.estimatedMinutes ?? 3;

  return (
    <div
      className={`survey-card ${status.completed ? 'survey-card-completed' : ''}`}
      onClick={status.completed ? undefined : onStart}
      style={{ cursor: status.completed ? 'default' : 'pointer' }}
    >
      <div className="survey-card-icon"><IconComponent size={22} /></div>
      <div className="survey-card-content">
        <div className="survey-card-header">
          <h3 className="survey-card-title">{title}</h3>
          {status.completed ? (
            <span className="survey-badge survey-badge-completed">{t.surveys.completed}</span>
          ) : (
            <span className="survey-badge survey-badge-new">{t.surveys.notStarted}</span>
          )}
        </div>
        <p className="survey-card-desc">{desc}</p>
        <div className="survey-card-meta">
          <span>{interpolate(t.surveys.estimatedTime, { minutes })}</span>
          <span className="survey-card-reward">
            {t.surveys.reward}: ${status.survey.reward_amount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
