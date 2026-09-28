import type {
  ArtifactKind,
  JourneyStage,
  JourneyStepAction,
  NewAssessmentInput,
  NewTargetInput,
  PatternId,
  TargetType,
} from '@dpat/shared';

/** Wizard state. Kept in localStorage so a half-finished assessment survives leaving the page. */
export interface WizardDraft {
  version: 1;
  step: number;
  name: string;
  description: string;
  targetTypes: TargetType[];
  website: { name: string; baseUrl: string; environment: 'production' | 'uat' };
  mobile: {
    name: string;
    platform: 'android' | 'ios';
    appId: string;
    version: string;
    environment: 'production' | 'uat';
  };
  code: { name: string; repoUrl: string; branch: string; commitSha: string; languages: string };
  uploads: { id: string; fileName: string; sizeBytes: number; kind: ArtifactKind }[];
  journeys: JourneyDraft[];
  patternIds: PatternId[];
  stageIds: string[];
}

export type JourneyTargetType = Exclude<TargetType, 'code_repository'>;

export interface JourneyDraft {
  id: string;
  name: string;
  targetType: JourneyTargetType;
  steps: StepDraft[];
}

export interface StepDraft {
  id: string;
  action: JourneyStepAction;
  label: string;
  target: string;
  value: string;
  waitMs: string;
  stageId: string;
}

export const WIZARD_STEPS = [
  { id: 'scope', title: 'Scope', description: 'Name the assessment and choose what to assess' },
  { id: 'targets', title: 'Target details', description: 'Where the website, app or code lives' },
  { id: 'uploads', title: 'Uploads', description: 'App packages, source and configuration' },
  { id: 'journeys', title: 'Journeys', description: 'Scripted user journeys and stage tags' },
  { id: 'patterns', title: 'Patterns and stages', description: 'What to assess against' },
  { id: 'review', title: 'Review and launch', description: 'Check everything and start the run' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

let seq = 0;
export const draftId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function emptyDraft(allPatterns: readonly PatternId[]): WizardDraft {
  return {
    version: 1,
    step: 0,
    name: '',
    description: '',
    targetTypes: [],
    website: { name: 'Public website', baseUrl: 'https://', environment: 'production' },
    mobile: {
      name: 'Android app',
      platform: 'android',
      appId: '',
      version: '',
      environment: 'production',
    },
    code: { name: '', repoUrl: '', branch: 'main', commitSha: '', languages: 'TypeScript, Java' },
    uploads: [],
    journeys: [],
    patternIds: [...allPatterns],
    stageIds: [],
  };
}

export function newStep(stageId: string, action: JourneyStepAction = 'navigate'): StepDraft {
  return { id: draftId('stp'), action, label: '', target: '', value: '', waitMs: '1000', stageId };
}

/** A starter journey so the builder is never empty: open, fill, submit, capture. */
export function templateJourney(
  targetType: JourneyTargetType,
  stages: JourneyStage[],
  baseUrl: string,
): JourneyDraft {
  const stage = (key: string) => stages.find((s) => s.key === key)?.id ?? stages[0]?.id ?? '';
  const quote = stage('quote_comparison');
  const proposal = stage('proposal_onboarding');
  const web = targetType === 'website';
  const start = web ? baseUrl.replace(/\/$/, '') || 'https://' : 'app://home';
  const step = (
    s: Partial<StepDraft> & Pick<StepDraft, 'action' | 'label' | 'stageId'>,
  ): StepDraft => ({
    ...newStep(s.stageId, s.action),
    ...s,
  });
  return {
    id: draftId('jrn'),
    name: web ? 'Quote to proposal (website)' : 'Quote to proposal (app)',
    targetType,
    steps: [
      step({
        action: 'navigate',
        label: 'Open quote page',
        target: web ? `${start}/quote` : start,
        stageId: quote,
      }),
      step({ action: 'fill', label: 'Enter age', target: '#age', value: '34', stageId: quote }),
      step({ action: 'click', label: 'Get quote', target: 'button[type=submit]', stageId: quote }),
      step({ action: 'wait', label: 'Wait for quote', waitMs: '2000', stageId: quote }),
      step({ action: 'capture', label: 'Capture quote', stageId: quote }),
      step({ action: 'click', label: 'Buy now', target: 'text=Buy now', stageId: proposal }),
      step({ action: 'capture', label: 'Capture proposal form', stageId: proposal }),
    ],
  };
}

// ------------------------------------------------------------------ validation

export type StepErrors = Record<string, string>;

const isUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export function journeyTargetTypes(draft: WizardDraft): JourneyTargetType[] {
  return draft.targetTypes.filter((t): t is JourneyTargetType => t !== 'code_repository');
}

export function validateStep(draft: WizardDraft, step: WizardStepId): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case 'scope':
      if (draft.name.trim().length < 3) errors.name = 'Enter a name of at least 3 characters.';
      if (draft.targetTypes.length === 0) errors.targetTypes = 'Choose at least one target type.';
      break;
    case 'targets':
      if (draft.targetTypes.includes('website')) {
        if (!draft.website.name.trim()) errors['website.name'] = 'Enter a name.';
        if (!isUrl(draft.website.baseUrl))
          errors['website.baseUrl'] = 'Enter a full URL, e.g. https://www.example.com';
      }
      if (draft.targetTypes.includes('mobile_app')) {
        if (!draft.mobile.name.trim()) errors['mobile.name'] = 'Enter a name.';
        if (!/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(draft.mobile.appId.trim())) {
          errors['mobile.appId'] = 'Enter a package or bundle ID, e.g. com.example.app';
        }
        if (!draft.mobile.version.trim()) errors['mobile.version'] = 'Enter the app version.';
      }
      if (draft.targetTypes.includes('code_repository')) {
        if (!draft.code.name.trim()) errors['code.name'] = 'Enter a name.';
        if (draft.code.repoUrl.trim() && !isUrl(draft.code.repoUrl.trim()))
          errors['code.repoUrl'] = 'Enter a valid URL or leave blank.';
        if (draft.code.commitSha.trim() && !/^[0-9a-f]{7,40}$/.test(draft.code.commitSha.trim())) {
          errors['code.commitSha'] = 'A commit SHA has 7 to 40 hexadecimal characters.';
        }
        if (splitLanguages(draft.code.languages).length === 0)
          errors['code.languages'] = 'List at least one language.';
      }
      break;
    case 'uploads':
      if (
        draft.targetTypes.includes('code_repository') &&
        !draft.code.repoUrl.trim() &&
        !draft.uploads.some((u) => u.kind === 'source_archive')
      ) {
        errors.uploads = 'Add a source archive, or go back and enter a repository URL.';
      }
      break;
    case 'journeys': {
      const needsJourney = journeyTargetTypes(draft);
      for (const type of needsJourney) {
        if (!draft.journeys.some((j) => j.targetType === type)) {
          errors[`journeys.${type}`] =
            `Add at least one journey for the ${type === 'website' ? 'website' : 'mobile app'}.`;
        }
      }
      draft.journeys.forEach((j) => {
        if (!j.name.trim()) errors[`journey.${j.id}.name`] = 'Name the journey.';
        if (j.steps.length === 0) errors[`journey.${j.id}.steps`] = 'Add at least one step.';
        if (!j.steps.some((s) => s.action === 'capture'))
          errors[`journey.${j.id}.capture`] = 'Include at least one capture step.';
        j.steps.forEach((s, i) => {
          const key = `step.${s.id}`;
          if (!s.label.trim()) errors[`${key}.label`] = `Step ${i + 1}: add a label.`;
          if (
            (s.action === 'navigate' || s.action === 'click' || s.action === 'fill') &&
            !s.target.trim()
          ) {
            errors[`${key}.target`] =
              `Step ${i + 1}: add a ${s.action === 'navigate' ? 'URL' : 'selector'}.`;
          }
          if (s.action === 'fill' && !s.value)
            errors[`${key}.value`] = `Step ${i + 1}: add a value to fill.`;
          if (s.action === 'wait' && !(Number(s.waitMs) > 0))
            errors[`${key}.waitMs`] =
              `Step ${i + 1}: wait must be a positive number of milliseconds.`;
          if (!s.stageId) errors[`${key}.stageId`] = `Step ${i + 1}: choose a journey stage.`;
        });
      });
      break;
    }
    case 'patterns':
      if (draft.patternIds.length === 0) errors.patternIds = 'Choose at least one pattern.';
      if (draft.stageIds.length === 0) errors.stageIds = 'Choose at least one journey stage.';
      break;
    case 'review':
      for (const s of WIZARD_STEPS.slice(0, -1)) Object.assign(errors, validateStep(draft, s.id));
      break;
  }
  return errors;
}

/** Stages tagged on any journey step, in stage order. */
export function taggedStageIds(draft: WizardDraft, stages: JourneyStage[]): string[] {
  const tagged = new Set(draft.journeys.flatMap((j) => j.steps.map((s) => s.stageId)));
  return stages.filter((s) => tagged.has(s.id)).map((s) => s.id);
}

function splitLanguages(value: string): string[] {
  return value
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
}

// ------------------------------------------------------------------ conversion

export function toNewAssessmentInput(draft: WizardDraft): NewAssessmentInput {
  const targets: NewTargetInput[] = [];
  const indexOf: Partial<Record<TargetType, number>> = {};

  if (draft.targetTypes.includes('website')) {
    indexOf.website = targets.length;
    targets.push({
      type: 'website',
      name: draft.website.name.trim(),
      baseUrl: draft.website.baseUrl.trim(),
      environment: draft.website.environment,
    });
  }
  if (draft.targetTypes.includes('mobile_app')) {
    indexOf.mobile_app = targets.length;
    targets.push({
      type: 'mobile_app',
      name: draft.mobile.name.trim(),
      platform: draft.mobile.platform,
      appId: draft.mobile.appId.trim(),
      version: draft.mobile.version.trim(),
      environment: draft.mobile.environment,
    });
  }
  if (draft.targetTypes.includes('code_repository')) {
    indexOf.code_repository = targets.length;
    const { repoUrl, branch, commitSha } = draft.code;
    targets.push({
      type: 'code_repository',
      name: draft.code.name.trim(),
      ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      ...(branch.trim() ? { branch: branch.trim() } : {}),
      ...(commitSha.trim() ? { commitSha: commitSha.trim() } : {}),
      languages: splitLanguages(draft.code.languages),
    });
  }

  const journeys = draft.journeys
    .filter((j) => indexOf[j.targetType] !== undefined)
    .map((j) => ({
      targetIndex: indexOf[j.targetType] ?? 0,
      name: j.name.trim(),
      steps: j.steps.map((s, order) => ({
        order,
        action: s.action,
        stageId: s.stageId,
        label: s.label.trim(),
        ...(s.action === 'navigate' || s.action === 'click' || s.action === 'fill'
          ? { target: s.target.trim() }
          : {}),
        ...(s.action === 'fill' ? { value: s.value } : {}),
        ...(s.action === 'wait' ? { waitMs: Number(s.waitMs) } : {}),
      })),
    }));

  return {
    name: draft.name.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    targets,
    journeys,
    patternIds: draft.patternIds,
    stageIds: draft.stageIds,
    uploads: draft.uploads.map(({ fileName, sizeBytes, kind }) => ({ fileName, sizeBytes, kind })),
  };
}

/** Suggests the upload kind from a file name. */
export function uploadKindFor(fileName: string): ArtifactKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.apk') || lower.endsWith('.aab')) return 'apk';
  if (lower.endsWith('.ipa')) return 'ipa';
  if (/\.(zip|tar|tgz|gz)$/.test(lower)) return 'source_archive';
  if (/(openapi|swagger)/.test(lower) || lower.endsWith('.graphql')) return 'api_spec';
  return 'config_file';
}

// ------------------------------------------------------------------ persistence

export const WIZARD_STORAGE_KEY = 'dpat.wizard-draft.v1';

export function loadDraft(): WizardDraft | null {
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;
    return parsed.version === 1 ? (parsed as WizardDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: WizardDraft): void {
  try {
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable: the draft lives only in memory for this visit.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
