// Phase 7: Master survey question definitions
// These are hardcoded in code — questions, options, conditional logic, and i18n keys
// The database stores only survey definitions (with configurable reward amounts) and responses

export type QuestionType =
  | 'text'
  | 'number'
  | 'yes_no'
  | 'yes_no_sometimes'
  | 'yes_no_notsure'
  | 'yes_no_mostly'
  | 'dropdown'
  | 'multi_select'
  | 'range';

export interface QuestionOption {
  value: string;
  i18nKey: string;
}

export interface SurveyQuestionDef {
  id: string;
  type: QuestionType;
  i18nKey: string;        // label key, e.g. "surveys.aboutYou.homeAddress"
  placeholderKey?: string; // placeholder key
  required: boolean;
  options?: QuestionOption[];
  dependsOn?: {
    questionId: string;
    values: string[];  // show when parent answer matches one of these
  };
}

export interface SurveyDef {
  slug: string;
  i18nTitleKey: string;
  i18nDescKey: string;
  i18nIconKey: string;
  estimatedMinutes: number;
  questions: SurveyQuestionDef[];
}

// ─── Survey 1: About You ──────────────────────────────────

const aboutYou: SurveyDef = {
  slug: 'about-you',
  i18nTitleKey: 'surveys.aboutYou.title',
  i18nDescKey: 'surveys.aboutYou.description',
  i18nIconKey: '🏠',
  estimatedMinutes: 3,
  questions: [
    {
      id: 'home_address',
      type: 'text',
      i18nKey: 'surveys.aboutYou.homeAddress',
      placeholderKey: 'surveys.aboutYou.homeAddressPlaceholder',
      required: true,
    },
    {
      id: 'province_district',
      type: 'dropdown',
      i18nKey: 'surveys.aboutYou.provinceDistrict',
      required: true,
      options: [
        { value: 'central', i18nKey: 'surveys.provinces.central' },
        { value: 'copperbelt', i18nKey: 'surveys.provinces.copperbelt' },
        { value: 'eastern', i18nKey: 'surveys.provinces.eastern' },
        { value: 'luapula', i18nKey: 'surveys.provinces.luapula' },
        { value: 'lusaka', i18nKey: 'surveys.provinces.lusaka' },
        { value: 'muchinga', i18nKey: 'surveys.provinces.muchinga' },
        { value: 'northern', i18nKey: 'surveys.provinces.northern' },
        { value: 'northwestern', i18nKey: 'surveys.provinces.northwestern' },
        { value: 'southern', i18nKey: 'surveys.provinces.southern' },
        { value: 'western', i18nKey: 'surveys.provinces.western' },
      ],
    },
    {
      id: 'second_id',
      type: 'yes_no',
      i18nKey: 'surveys.aboutYou.secondId',
      required: true,
    },
    {
      id: 'second_id_detail',
      type: 'text',
      i18nKey: 'surveys.aboutYou.secondIdDetail',
      placeholderKey: 'surveys.aboutYou.secondIdDetailPlaceholder',
      required: false,
      dependsOn: { questionId: 'second_id', values: ['Yes'] },
    },
    {
      id: 'dependents_count',
      type: 'number',
      i18nKey: 'surveys.aboutYou.dependentsCount',
      placeholderKey: 'surveys.aboutYou.dependentsPlaceholder',
      required: true,
    },
  ],
};

// ─── Survey 2: Your Mining Operation ──────────────────────

const miningOperation: SurveyDef = {
  slug: 'mining-operation',
  i18nTitleKey: 'surveys.miningOperation.title',
  i18nDescKey: 'surveys.miningOperation.description',
  i18nIconKey: '⛏️',
  estimatedMinutes: 4,
  questions: [
    {
      id: 'mining_type',
      type: 'multi_select',
      i18nKey: 'surveys.miningOperation.miningType',
      required: true,
      options: [
        { value: 'alluvial', i18nKey: 'surveys.miningTypes.alluvial' },
        { value: 'hard_rock', i18nKey: 'surveys.miningTypes.hardRock' },
        { value: 'surface', i18nKey: 'surveys.miningTypes.surface' },
      ],
    },
    {
      id: 'processing_method',
      type: 'multi_select',
      i18nKey: 'surveys.miningOperation.processingMethod',
      required: true,
      options: [
        { value: 'gravity', i18nKey: 'surveys.processingMethods.gravity' },
        { value: 'amalgamation', i18nKey: 'surveys.processingMethods.amalgamation' },
        { value: 'cyanidation', i18nKey: 'surveys.processingMethods.cyanidation' },
        { value: 'other', i18nKey: 'surveys.processingMethods.other' },
      ],
    },
    {
      id: 'worker_count',
      type: 'range',
      i18nKey: 'surveys.miningOperation.workerCount',
      required: true,
      options: [
        { value: '1-5', i18nKey: 'surveys.workerRanges.1to5' },
        { value: '6-20', i18nKey: 'surveys.workerRanges.6to20' },
        { value: '21-50', i18nKey: 'surveys.workerRanges.21to50' },
        { value: '50+', i18nKey: 'surveys.workerRanges.50plus' },
      ],
    },
    {
      id: 'monthly_production',
      type: 'range',
      i18nKey: 'surveys.miningOperation.monthlyProduction',
      required: true,
      options: [
        { value: '<10g', i18nKey: 'surveys.productionRanges.under10' },
        { value: '10-50g', i18nKey: 'surveys.productionRanges.10to50' },
        { value: '50-200g', i18nKey: 'surveys.productionRanges.50to200' },
        { value: '200g-1kg', i18nKey: 'surveys.productionRanges.200to1kg' },
        { value: '>1kg', i18nKey: 'surveys.productionRanges.over1kg' },
      ],
    },
    {
      id: 'registered_cooperative',
      type: 'yes_no',
      i18nKey: 'surveys.miningOperation.registeredCooperative',
      required: true,
    },
    {
      id: 'cooperative_registration',
      type: 'text',
      i18nKey: 'surveys.miningOperation.cooperativeRegistration',
      placeholderKey: 'surveys.miningOperation.cooperativeRegistrationPlaceholder',
      required: false,
      dependsOn: { questionId: 'registered_cooperative', values: ['Yes'] },
    },
  ],
};

// ─── Survey 3: Environmental Practices ────────────────────

const environmentalPractices: SurveyDef = {
  slug: 'environmental-practices',
  i18nTitleKey: 'surveys.environmental.title',
  i18nDescKey: 'surveys.environmental.description',
  i18nIconKey: '🌍',
  estimatedMinutes: 4,
  questions: [
    {
      id: 'use_mercury',
      type: 'yes_no_sometimes',
      i18nKey: 'surveys.environmental.useMercury',
      required: true,
    },
    {
      id: 'mercury_storage',
      type: 'multi_select',
      i18nKey: 'surveys.environmental.mercuryStorage',
      required: true,
      options: [
        { value: 'sealed_container', i18nKey: 'surveys.mercuryStorage.sealed' },
        { value: 'open_container', i18nKey: 'surveys.mercuryStorage.open' },
        { value: 'dont_store', i18nKey: 'surveys.mercuryStorage.dontStore' },
      ],
      dependsOn: { questionId: 'use_mercury', values: ['Yes', 'Sometimes'] },
    },
    {
      id: 'mercury_recovery',
      type: 'yes_no_sometimes',
      i18nKey: 'surveys.environmental.mercuryRecovery',
      required: true,
      dependsOn: { questionId: 'use_mercury', values: ['Yes', 'Sometimes'] },
    },
    {
      id: 'near_water',
      type: 'yes_no',
      i18nKey: 'surveys.environmental.nearWater',
      required: true,
    },
    {
      id: 'near_protected_area',
      type: 'yes_no_notsure',
      i18nKey: 'surveys.environmental.nearProtectedArea',
      required: true,
    },
    {
      id: 'near_world_heritage',
      type: 'yes_no_notsure',
      i18nKey: 'surveys.environmental.nearWorldHeritage',
      required: true,
    },
  ],
};

// ─── Survey 4: Safety & Rights ────────────────────────────

const safetyRights: SurveyDef = {
  slug: 'safety-rights',
  i18nTitleKey: 'surveys.safety.title',
  i18nDescKey: 'surveys.safety.description',
  i18nIconKey: '🛡️',
  estimatedMinutes: 3,
  questions: [
    {
      id: 'workers_under_18',
      type: 'yes_no',
      i18nKey: 'surveys.safety.workersUnder18',
      required: true,
    },
    {
      id: 'forced_labour',
      type: 'yes_no',
      i18nKey: 'surveys.safety.forcedLabour',
      required: true,
    },
    {
      id: 'armed_groups',
      type: 'yes_no_notsure',
      i18nKey: 'surveys.safety.armedGroups',
      required: true,
    },
    {
      id: 'security_forces',
      type: 'yes_no',
      i18nKey: 'surveys.safety.securityForces',
      required: true,
    },
    {
      id: 'politicians_stake',
      type: 'yes_no',
      i18nKey: 'surveys.safety.politiciansStake',
      required: true,
    },
    {
      id: 'feel_safe',
      type: 'yes_no_mostly',
      i18nKey: 'surveys.safety.feelSafe',
      required: true,
    },
  ],
};

// ─── Survey 5: Your Gold Journey ──────────────────────────

const goldJourney: SurveyDef = {
  slug: 'gold-journey',
  i18nTitleKey: 'surveys.goldJourney.title',
  i18nDescKey: 'surveys.goldJourney.description',
  i18nIconKey: '🚚',
  estimatedMinutes: 3,
  questions: [
    {
      id: 'transport_method',
      type: 'multi_select',
      i18nKey: 'surveys.goldJourney.transportMethod',
      required: true,
      options: [
        { value: 'carry_personally', i18nKey: 'surveys.transportMethods.carry' },
        { value: 'motorcycle', i18nKey: 'surveys.transportMethods.motorcycle' },
        { value: 'vehicle', i18nKey: 'surveys.transportMethods.vehicle' },
        { value: 'bus_public', i18nKey: 'surveys.transportMethods.bus' },
        { value: 'courier', i18nKey: 'surveys.transportMethods.courier' },
      ],
    },
    {
      id: 'distance_to_buyer',
      type: 'range',
      i18nKey: 'surveys.goldJourney.distanceToBuyer',
      required: true,
      options: [
        { value: '<10km', i18nKey: 'surveys.distanceRanges.under10' },
        { value: '10-50km', i18nKey: 'surveys.distanceRanges.10to50' },
        { value: '50-200km', i18nKey: 'surveys.distanceRanges.50to200' },
        { value: '>200km', i18nKey: 'surveys.distanceRanges.over200' },
      ],
    },
    {
      id: 'storage_method',
      type: 'multi_select',
      i18nKey: 'surveys.goldJourney.storageMethod',
      required: true,
      options: [
        { value: 'at_home', i18nKey: 'surveys.storageMethods.atHome' },
        { value: 'at_mine', i18nKey: 'surveys.storageMethods.atMine' },
        { value: 'lockbox', i18nKey: 'surveys.storageMethods.lockbox' },
        { value: 'bank_safe', i18nKey: 'surveys.storageMethods.bankSafe' },
        { value: 'other', i18nKey: 'surveys.storageMethods.other' },
      ],
    },
    {
      id: 'sell_unregistered',
      type: 'yes_no_sometimes',
      i18nKey: 'surveys.goldJourney.sellUnregistered',
      required: true,
    },
    {
      id: 'receive_from_others',
      type: 'yes_no_sometimes',
      i18nKey: 'surveys.goldJourney.receiveFromOthers',
      required: true,
    },
  ],
};

// ─── Survey 6: Governance & Compliance ────────────────────

const governanceCompliance: SurveyDef = {
  slug: 'governance-compliance',
  i18nTitleKey: 'surveys.governance.title',
  i18nDescKey: 'surveys.governance.description',
  i18nIconKey: '📜',
  estimatedMinutes: 3,
  questions: [
    {
      id: 'pay_taxes',
      type: 'yes_no_notsure',
      i18nKey: 'surveys.governance.payTaxes',
      required: true,
    },
    {
      id: 'mining_licence_status',
      type: 'range',
      i18nKey: 'surveys.governance.miningLicenceStatus',
      required: true,
      options: [
        { value: 'have_one', i18nKey: 'surveys.licenceStatus.haveOne' },
        { value: 'applied', i18nKey: 'surveys.licenceStatus.applied' },
        { value: 'no', i18nKey: 'surveys.licenceStatus.no' },
      ],
    },
    {
      id: 'bribery',
      type: 'yes_no',
      i18nKey: 'surveys.governance.bribery',
      required: true,
    },
    {
      id: 'import_export_licence',
      type: 'yes_no_notsure',
      i18nKey: 'surveys.governance.importExportLicence',
      required: true,
    },
    {
      id: 'willing_compliance_visit',
      type: 'yes_no_notsure',
      i18nKey: 'surveys.governance.willingComplianceVisit',
      required: true,
    },
  ],
};

// ─── Export all surveys ───────────────────────────────────

export const SURVEY_DEFINITIONS: SurveyDef[] = [
  aboutYou,
  miningOperation,
  environmentalPractices,
  safetyRights,
  goldJourney,
  governanceCompliance,
];

/** Look up a survey by slug */
export function getSurveyBySlug(slug: string): SurveyDef | undefined {
  return SURVEY_DEFINITIONS.find((s) => s.slug === slug);
}

/**
 * Get visible questions for a survey given current answers.
 * Evaluates dependsOn conditions and filters out hidden questions.
 */
export function getVisibleQuestions(
  survey: SurveyDef,
  answers: Record<string, unknown>,
): SurveyQuestionDef[] {
  return survey.questions.filter((q) => {
    if (!q.dependsOn) return true;
    const parentAnswer = answers[q.dependsOn.questionId];
    if (parentAnswer === undefined || parentAnswer === null || parentAnswer === '') return false;
    return q.dependsOn.values.includes(String(parentAnswer));
  });
}
