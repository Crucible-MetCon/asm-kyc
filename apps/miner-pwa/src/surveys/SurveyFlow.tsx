import { useState, useCallback } from 'react';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { apiFetch, ApiError } from '../api/client';
import { getSurveyBySlug, getVisibleQuestions } from '@asm-kyc/shared';
import type { SurveyDef, SurveyQuestionDef } from '@asm-kyc/shared';
import { SurveyQuestion } from './SurveyQuestion';
import { SurveyProgressBar } from './SurveyProgressBar';
import { PartyPopper } from 'lucide-react';
import { getListCache, setListCache } from '../offline/db';

interface Props {
  slug: string;
  onComplete: () => void;
  onBack: () => void;
}

/** Resolve a translation key from the t object */
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

type AnswerMap = Record<string, unknown>;

export function SurveyFlow({ slug, onComplete, onBack }: Props) {
  const { t } = useI18n();
  const surveyDef = getSurveyBySlug(slug);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);

  const visibleQuestions = surveyDef ? getVisibleQuestions(surveyDef, answers) : [];
  const currentQuestion = visibleQuestions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === visibleQuestions.length - 1;

  const handleAnswer = useCallback((value: unknown) => {
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestion!.id]: value };

      // Clear answers for dependent questions that are no longer visible
      if (surveyDef) {
        const newVisible = getVisibleQuestions(surveyDef, next);
        const visibleIds = new Set(newVisible.map((q) => q.id));
        for (const key of Object.keys(next)) {
          if (!visibleIds.has(key) && key !== currentQuestion!.id) {
            delete next[key];
          }
        }
      }

      return next;
    });
  }, [currentQuestion, surveyDef]);

  const handleNext = () => {
    // Validate required
    if (currentQuestion?.required) {
      const val = answers[currentQuestion.id];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        setError(t.surveys.requiredField);
        return;
      }
    }
    setError(null);

    if (isLastQuestion) {
      handleSubmit();
    } else {
      // Recalculate visible questions with current answers before advancing
      const newVisible = surveyDef ? getVisibleQuestions(surveyDef, answers) : [];
      const nextIdx = Math.min(currentIndex + 1, newVisible.length - 1);
      setCurrentIndex(nextIdx);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    // Build submission payload — only include visible question answers
    const submitAnswers: Record<string, unknown> = {};
    for (const q of visibleQuestions) {
      if (answers[q.id] !== undefined) {
        submitAnswers[q.id] = answers[q.id];
      }
    }

    try {
      const result = await apiFetch<{ reward_amount: number }>(`/surveys/${slug}`, {
        method: 'POST',
        body: JSON.stringify({ answers: submitAnswers }),
      });
      setRewardAmount(result.reward_amount);
      setCompleted(true);

      // Save draft answers to cache for offline review
      await setListCache(`survey-draft-${slug}`, null);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setError(t.surveys.alreadyCompleted);
      } else {
        setError(err instanceof Error ? err.message : 'Submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Save draft answers on each change
  const saveDraft = useCallback(async (a: AnswerMap) => {
    try {
      await setListCache(`survey-draft-${slug}`, a);
    } catch {
      // Ignore draft save errors
    }
  }, [slug]);

  // Load draft on mount
  useState(() => {
    (async () => {
      try {
        const draft = await getListCache<AnswerMap>(`survey-draft-${slug}`);
        if (draft && Object.keys(draft).length > 0) {
          setAnswers(draft);
        }
      } catch {
        // Ignore
      }
    })();
  });

  // Save draft whenever answers change
  const handleAnswerWithDraft = useCallback((value: unknown) => {
    handleAnswer(value);
    // Save draft after state update
    setTimeout(() => {
      setAnswers((current) => {
        saveDraft(current);
        return current;
      });
    }, 100);
  }, [handleAnswer, saveDraft]);

  if (!surveyDef) {
    return (
      <div className="screen-centered">
        <p>Survey not found</p>
        <button className="btn btn-primary" onClick={onBack}>{t.common.back}</button>
      </div>
    );
  }

  // Thank you screen
  if (completed) {
    return (
      <div className="survey-thankyou">
        <div className="survey-thankyou-icon"><PartyPopper size={40} /></div>
        <h2>{t.surveys.thankYou}</h2>
        <p>{t.surveys.thankYouMessage}</p>
        {rewardAmount !== null && (
          <div className="survey-reward-display">
            <span className="survey-reward-label">{t.surveys.reward}</span>
            <span className="survey-reward-amount">${rewardAmount.toFixed(2)}</span>
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={onComplete} style={{ marginTop: 24 }}>
          {t.common.back}
        </button>
      </div>
    );
  }

  const surveyTitle = resolveKey(t as unknown as Record<string, unknown>, surveyDef.i18nTitleKey);

  return (
    <div className="survey-flow">
      <div className="survey-flow-header">
        <button className="btn btn-text" onClick={handleBack}>{t.common.back}</button>
        <h2>{surveyTitle}</h2>
      </div>

      <SurveyProgressBar current={currentIndex + 1} total={visibleQuestions.length} />

      <p className="survey-question-counter">
        {interpolate(t.surveys.questionOf, {
          current: currentIndex + 1,
          total: visibleQuestions.length,
        })}
      </p>

      {currentQuestion && (
        <div className="survey-question-container">
          <SurveyQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={handleAnswerWithDraft}
          />
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="survey-flow-actions">
        <button
          className="btn btn-primary btn-full"
          onClick={handleNext}
          disabled={submitting}
        >
          {submitting
            ? t.surveys.submitting
            : isLastQuestion
              ? t.surveys.submit
              : t.common.next}
        </button>
      </div>
    </div>
  );
}
