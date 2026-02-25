import { useI18n, interpolate } from '../i18n/I18nContext';

interface Props {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: Props) {
  const { t } = useI18n();
  const stepLabels = [
    t.onboarding.step1Title,
    t.onboarding.step2Title,
    t.onboarding.step3Title,
  ];

  return (
    <div className="progress-indicator">
      <div className="progress-steps">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === current;
          const isCompleted = stepNum < current;
          return (
            <div
              key={i}
              className={`progress-step${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
            >
              <div className="progress-dot">
                {isCompleted ? '\u2713' : stepNum}
              </div>
              <span className="progress-label">{stepLabels[i]}</span>
            </div>
          );
        })}
      </div>
      <p className="progress-text">
        {interpolate(t.onboarding.stepOf, { step: current, total })}
      </p>
    </div>
  );
}
