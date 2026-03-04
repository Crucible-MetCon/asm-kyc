// Phase 7: Risk assessment rules derived from survey answers

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface RiskFlagDef {
  surveySlug: string;
  questionId: string;
  triggerValues: string[];
  severity: RiskSeverity;
  labelKey: string;  // i18n key for the flag description
}

/**
 * Risk flags that trigger based on specific survey answer values.
 * When a miner's answer matches a trigger value, the flag is raised.
 */
export const RISK_FLAGS: RiskFlagDef[] = [
  // CRITICAL — immediate escalation required
  {
    surveySlug: 'safety-rights',
    questionId: 'workers_under_18',
    triggerValues: ['Yes'],
    severity: 'CRITICAL',
    labelKey: 'risk.childLabour',
  },
  {
    surveySlug: 'safety-rights',
    questionId: 'forced_labour',
    triggerValues: ['Yes'],
    severity: 'CRITICAL',
    labelKey: 'risk.forcedLabour',
  },
  {
    surveySlug: 'safety-rights',
    questionId: 'armed_groups',
    triggerValues: ['Yes'],
    severity: 'CRITICAL',
    labelKey: 'risk.armedGroups',
  },
  // HIGH — enhanced due diligence required
  {
    surveySlug: 'environmental-practices',
    questionId: 'use_mercury',
    triggerValues: ['Yes', 'Sometimes'],
    severity: 'HIGH',
    labelKey: 'risk.mercuryUse',
  },
  {
    surveySlug: 'safety-rights',
    questionId: 'politicians_stake',
    triggerValues: ['Yes'],
    severity: 'HIGH',
    labelKey: 'risk.pepIndicator',
  },
  // MEDIUM — standard monitoring
  {
    surveySlug: 'gold-journey',
    questionId: 'sell_unregistered',
    triggerValues: ['Yes'],
    severity: 'MEDIUM',
    labelKey: 'risk.unregisteredSales',
  },
  {
    surveySlug: 'gold-journey',
    questionId: 'receive_from_others',
    triggerValues: ['Yes'],
    severity: 'MEDIUM',
    labelKey: 'risk.thirdPartyGold',
  },
  {
    surveySlug: 'governance-compliance',
    questionId: 'bribery',
    triggerValues: ['Yes'],
    severity: 'MEDIUM',
    labelKey: 'risk.bribery',
  },
];

export interface TriggeredFlag {
  surveySlug: string;
  questionId: string;
  severity: RiskSeverity;
  labelKey: string;
}

/**
 * Evaluate risk flags against a user's survey answers.
 * @param answersBySlug Map of survey slug → { questionId: answer }
 * @returns triggered flags and computed risk level
 */
export function evaluateRisk(answersBySlug: Record<string, Record<string, unknown>>): {
  level: RiskLevel;
  flags: TriggeredFlag[];
} {
  const triggered: TriggeredFlag[] = [];

  for (const flag of RISK_FLAGS) {
    const surveyAnswers = answersBySlug[flag.surveySlug];
    if (!surveyAnswers) continue;

    const answer = surveyAnswers[flag.questionId];
    if (answer === undefined || answer === null) continue;

    if (flag.triggerValues.includes(String(answer))) {
      triggered.push({
        surveySlug: flag.surveySlug,
        questionId: flag.questionId,
        severity: flag.severity,
        labelKey: flag.labelKey,
      });
    }
  }

  return {
    level: computeRiskLevel(triggered),
    flags: triggered,
  };
}

function computeRiskLevel(flags: TriggeredFlag[]): RiskLevel {
  if (flags.some((f) => f.severity === 'CRITICAL')) return 'CRITICAL';
  if (flags.length >= 4) return 'HIGH';
  if (flags.length >= 2) return 'MEDIUM';
  return 'LOW';
}
