import type { SurveyQuestionDef } from '@asm-kyc/shared';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  question: SurveyQuestionDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Get a nested translation value from the i18n object by dotted key path */
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

export function SurveyQuestion({ question, value, onChange }: Props) {
  const { t } = useI18n();

  const label = resolveKey(t as unknown as Record<string, unknown>, question.i18nKey);
  const placeholder = question.placeholderKey
    ? resolveKey(t as unknown as Record<string, unknown>, question.placeholderKey)
    : '';

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            className="form-input"
            type="text"
            value={typeof value === 'string' ? value : ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            className="form-input"
            type="number"
            inputMode="numeric"
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        );

      case 'yes_no':
        return (
          <div className="survey-radio-group">
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Yes' ? 'active' : ''}`}
              onClick={() => onChange('Yes')}
            >
              {t.surveys.yes}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'No' ? 'active' : ''}`}
              onClick={() => onChange('No')}
            >
              {t.surveys.no}
            </button>
          </div>
        );

      case 'yes_no_sometimes':
        return (
          <div className="survey-radio-group">
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Yes' ? 'active' : ''}`}
              onClick={() => onChange('Yes')}
            >
              {t.surveys.yes}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'No' ? 'active' : ''}`}
              onClick={() => onChange('No')}
            >
              {t.surveys.no}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Sometimes' ? 'active' : ''}`}
              onClick={() => onChange('Sometimes')}
            >
              {t.surveys.sometimes}
            </button>
          </div>
        );

      case 'yes_no_notsure':
        return (
          <div className="survey-radio-group">
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Yes' ? 'active' : ''}`}
              onClick={() => onChange('Yes')}
            >
              {t.surveys.yes}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'No' ? 'active' : ''}`}
              onClick={() => onChange('No')}
            >
              {t.surveys.no}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Not Sure' ? 'active' : ''}`}
              onClick={() => onChange('Not Sure')}
            >
              {t.surveys.notSure}
            </button>
          </div>
        );

      case 'yes_no_mostly':
        return (
          <div className="survey-radio-group">
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Yes' ? 'active' : ''}`}
              onClick={() => onChange('Yes')}
            >
              {t.surveys.yes}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'Mostly' ? 'active' : ''}`}
              onClick={() => onChange('Mostly')}
            >
              {t.surveys.mostly}
            </button>
            <button
              type="button"
              className={`survey-radio-btn ${value === 'No' ? 'active' : ''}`}
              onClick={() => onChange('No')}
            >
              {t.surveys.no}
            </button>
          </div>
        );

      case 'dropdown':
        return (
          <select
            className="form-select"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">--</option>
            {question.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {resolveKey(t as unknown as Record<string, unknown>, opt.i18nKey)}
              </option>
            ))}
          </select>
        );

      case 'range':
        return (
          <div className="survey-radio-group survey-radio-vertical">
            {question.options?.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`survey-radio-btn ${value === opt.value ? 'active' : ''}`}
                onClick={() => onChange(opt.value)}
              >
                {resolveKey(t as unknown as Record<string, unknown>, opt.i18nKey)}
              </button>
            ))}
          </div>
        );

      case 'multi_select': {
        const selected = Array.isArray(value) ? value as string[] : [];
        return (
          <div className="survey-checkbox-group">
            {question.options?.map((opt) => {
              const isChecked = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`survey-checkbox-btn ${isChecked ? 'active' : ''}`}
                  onClick={() => {
                    const next = isChecked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value];
                    onChange(next);
                  }}
                >
                  <span className="survey-checkbox-indicator">{isChecked ? '✓' : ''}</span>
                  {resolveKey(t as unknown as Record<string, unknown>, opt.i18nKey)}
                </button>
              );
            })}
          </div>
        );
      }

      default:
        return <p>Unsupported question type: {question.type}</p>;
    }
  };

  return (
    <div className="survey-question">
      <label className="survey-question-label">{label}</label>
      {renderInput()}
    </div>
  );
}
