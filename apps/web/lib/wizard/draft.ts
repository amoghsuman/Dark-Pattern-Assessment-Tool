import {
  CONFIG_TYPE_LABELS,
  ConfigTypeSchema,
  CustomerTestDataSchema,
  FULL_COMMIT_SHA,
  type ClientAccessItem,
  type ConfigType,
  type CredentialRef,
  type JourneyStage,
  type JourneyStepAction,
  type NewArtifactInput,
  type NewAssessmentInput,
  type NewTargetInput,
  type OtpHandling,
  type PatternId,
  type RepositoryProvider,
  type StoredUpload,
  type TestDataSet,
} from '@dpat/shared';

/**
 * Wizard state for a new assessment. Kept in localStorage so a half-finished assessment survives
 * leaving the page. Uploads and secrets are already stored (upload metadata, vault references)
 * by the time they appear here; the draft never holds file contents or secret values.
 */

export type TargetKind = 'website' | 'android' | 'ios' | 'source' | 'backend_config';
export type JourneyTargetKind = 'website' | 'android' | 'ios';

export const TARGET_KIND_ORDER: readonly TargetKind[] = [
  'website',
  'android',
  'ios',
  'source',
  'backend_config',
];

export const TARGET_KIND_LABELS: Record<TargetKind, string> = {
  website: 'Website',
  android: 'Android app',
  ios: 'iOS app',
  source: 'Source code',
  backend_config: 'Backend configuration',
};

export interface StepDraft {
  id: string;
  action: JourneyStepAction;
  label: string;
  target: string;
  value: string;
  waitMs: string;
  stageId: string;
}

export interface JourneyDraft {
  id: string;
  name: string;
  targetKind: JourneyTargetKind;
  steps: StepDraft[];
}

export interface CaptureDraft {
  id: string;
  upload: StoredUpload;
  /** Draft journey ID, or '' when the capture is not tied to a journey. */
  journeyId: string;
  stageId: string;
  note: string;
}

export interface ExclusionDraft {
  id: string;
  stageId: string;
  /** Empty means every pattern in scope. */
  patternIds: PatternId[];
  reason: string;
}

export interface WizardDraft {
  version: 2;
  step: number;
  name: string;
  description: string;
  targetKinds: TargetKind[];
  website: {
    name: string;
    baseUrl: string;
    environment: 'production' | 'uat';
    environmentLabel: string;
    credentials: CredentialRef[];
    testDataSetIds: string[];
    otp: OtpHandling;
  };
  android: {
    name: string;
    appId: string;
    version: string;
    environment: 'production' | 'uat';
    build: StoredUpload | null;
    appIdSource: 'read_from_file' | 'entered';
  };
  ios: {
    name: string;
    appId: string;
    version: string;
    environment: 'production' | 'uat';
    build: StoredUpload | null;
    decryptedConfirmed: boolean;
  };
  source: {
    name: string;
    mode: 'repository' | 'archive';
    provider: RepositoryProvider;
    repoUrl: string;
    branch: string;
    commitSha: string;
    token: CredentialRef | null;
    readOnlyConfirmed: boolean;
    archive: StoredUpload | null;
    languages: string;
  };
  backendConfig: {
    name: string;
    files: { upload: StoredUpload; configType: ConfigType | '' }[];
  };
  journeys: JourneyDraft[];
  captures: CaptureDraft[];
  patternIds: PatternId[];
  stageIds: string[];
  exclusions: ExclusionDraft[];
  acknowledgeOutstanding: boolean;
}

export const WIZARD_STEPS = [
  { id: 'scope', title: 'Scope', description: 'Name the assessment and choose what to assess' },
  {
    id: 'targets',
    title: 'Targets and inputs',
    description: 'Where each target lives, and the builds, access and files it needs',
  },
  { id: 'journeys', title: 'Journeys', description: 'Scripted user journeys and stage tags' },
  {
    id: 'captures',
    title: 'Manual captures',
    description: 'Screenshots and recordings captured by hand',
  },
  {
    id: 'patterns',
    title: 'Patterns, stages and exclusions',
    description: 'What to assess against and what is out of scope',
  },
  {
    id: 'review',
    title: 'Review and launch',
    description: 'Check inputs, client access and start the run',
  },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

let seq = 0;
export const draftId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function emptyDraft(allPatterns: readonly PatternId[]): WizardDraft {
  return {
    version: 2,
    step: 0,
    name: '',
    description: '',
    targetKinds: [],
    website: {
      name: 'Public website',
      baseUrl: 'https://',
      environment: 'production',
      environmentLabel: '',
      credentials: [],
      testDataSetIds: [],
      otp: { mode: 'not_required' },
    },
    android: {
      name: 'Android app',
      appId: '',
      version: '',
      environment: 'production',
      build: null,
      appIdSource: 'entered',
    },
    ios: {
      name: 'iOS app',
      appId: '',
      version: '',
      environment: 'production',
      build: null,
      decryptedConfirmed: false,
    },
    source: {
      name: '',
      mode: 'repository',
      provider: 'github',
      repoUrl: '',
      branch: 'main',
      commitSha: '',
      token: null,
      readOnlyConfirmed: false,
      archive: null,
      languages: 'TypeScript, Java',
    },
    backendConfig: { name: 'Backend configuration', files: [] },
    journeys: [],
    captures: [],
    patternIds: [...allPatterns],
    stageIds: [],
    exclusions: [],
    acknowledgeOutstanding: false,
  };
}

export function journeyTargetKinds(draft: WizardDraft): JourneyTargetKind[] {
  return draft.targetKinds.filter(
    (k): k is JourneyTargetKind => k === 'website' || k === 'android' || k === 'ios',
  );
}

export function newStep(stageId: string, action: JourneyStepAction = 'navigate'): StepDraft {
  return { id: draftId('stp'), action, label: '', target: '', value: '', waitMs: '1000', stageId };
}

/** A starter journey so the builder is never empty: open, fill, submit, capture. */
export function templateJourney(
  targetKind: JourneyTargetKind,
  stages: JourneyStage[],
  baseUrl: string,
): JourneyDraft {
  const stage = (key: string) => stages.find((s) => s.key === key)?.id ?? stages[0]?.id ?? '';
  const quote = stage('quote_comparison');
  const proposal = stage('proposal_onboarding');
  const web = targetKind === 'website';
  const start = web ? baseUrl.replace(/\/$/, '') || 'https://' : 'app://home';
  const step = (
    s: Partial<StepDraft> & Pick<StepDraft, 'action' | 'label' | 'stageId'>,
  ): StepDraft => ({
    ...newStep(s.stageId, s.action),
    ...s,
  });
  return {
    id: draftId('jrn'),
    name: `Quote to proposal (${TARGET_KIND_LABELS[targetKind].toLowerCase()})`,
    targetKind,
    steps: [
      step({
        action: 'navigate',
        label: 'Open quote page',
        target: web ? `${start}/quote` : start,
        stageId: quote,
      }),
      step({
        action: 'fill',
        label: 'Enter date of birth',
        target: '#dob',
        value: '{{customer.dateOfBirth}}',
        stageId: quote,
      }),
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

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const PACKAGE_NAME = /^[a-zA-Z][\w]*(\.[a-zA-Z_][\w]*)+$/;

export function splitLanguages(value: string): string[] {
  return value
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Test data values referenced in fill steps, e.g. {{customer.mobile}}. */
export const TEST_DATA_TOKENS = [
  ...Object.keys(CustomerTestDataSchema.shape).map((k) => `{{customer.${k}}}`),
  '{{payment.cardNumber}}',
  '{{payment.cardExpiry}}',
  '{{payment.upiId}}',
  '{{credential.username}}',
  '{{credential.password}}',
  '{{otp}}',
];

export function validateStep(draft: WizardDraft, step: WizardStepId): StepErrors {
  const errors: StepErrors = {};
  const has = (k: TargetKind) => draft.targetKinds.includes(k);

  switch (step) {
    case 'scope':
      if (draft.name.trim().length < 3) errors.name = 'Enter a name of at least 3 characters.';
      if (draft.targetKinds.length === 0) errors.targetKinds = 'Choose at least one target.';
      break;

    case 'targets': {
      if (has('website')) {
        const w = draft.website;
        if (!w.name.trim()) errors['website.name'] = 'Enter a name.';
        if (!isHttpUrl(w.baseUrl))
          errors['website.baseUrl'] = 'Enter a full URL, e.g. https://uat.example.com';
        if (w.otp.mode === 'live_assessor_entry' && !w.otp.assessorUserId)
          errors['website.otp'] = 'Choose the assessor who will enter OTPs.';
      }
      if (has('android')) {
        const a = draft.android;
        if (!a.name.trim()) errors['android.name'] = 'Enter a name.';
        if (!PACKAGE_NAME.test(a.appId.trim()))
          errors['android.appId'] = 'Enter a package name, e.g. com.example.app';
        if (!a.version.trim()) errors['android.version'] = 'Enter the app version.';
      }
      if (has('ios')) {
        const i = draft.ios;
        if (!i.name.trim()) errors['ios.name'] = 'Enter a name.';
        if (!PACKAGE_NAME.test(i.appId.trim()))
          errors['ios.appId'] = 'Enter a bundle ID, e.g. com.example.app';
        if (!i.version.trim()) errors['ios.version'] = 'Enter the app version.';
        if (i.build && !i.decryptedConfirmed)
          errors['ios.decrypted'] = 'Confirm this IPA is a decrypted build supplied by the client.';
      }
      if (has('source')) {
        const s = draft.source;
        if (!s.name.trim()) errors['source.name'] = 'Enter a name.';
        if (splitLanguages(s.languages).length === 0)
          errors['source.languages'] = 'List at least one language.';
        if (s.mode === 'repository') {
          if (!isHttpUrl(s.repoUrl)) errors['source.repoUrl'] = 'Enter the repository URL.';
          if (!s.branch.trim()) errors['source.branch'] = 'Enter the branch.';
          if (!FULL_COMMIT_SHA.test(s.commitSha.trim())) {
            errors['source.commitSha'] =
              'Pin the full 40-character commit SHA for audit traceability.';
          }
        } else if (!s.archive) {
          errors['source.archive'] = 'Upload a ZIP archive of the source.';
        }
      }
      if (has('backend_config')) {
        const c = draft.backendConfig;
        if (!c.name.trim()) errors['backend.name'] = 'Enter a name.';
        if (c.files.length === 0)
          errors['backend.files'] = 'Upload at least one configuration file.';
        if (c.files.some((f) => !f.configType))
          errors['backend.types'] = 'Tag every configuration file with its type.';
      }
      break;
    }

    case 'journeys': {
      for (const kind of journeyTargetKinds(draft)) {
        if (!draft.journeys.some((j) => j.targetKind === kind)) {
          errors[`journeys.${kind}`] =
            `Add at least one journey for the ${TARGET_KIND_LABELS[kind].toLowerCase()}.`;
        }
      }
      for (const j of draft.journeys) {
        if (!journeyTargetKinds(draft).includes(j.targetKind)) continue;
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
      }
      break;
    }

    case 'captures':
      draft.captures.forEach((c, i) => {
        if (!c.stageId)
          errors[`capture.${c.id}.stageId`] = `Capture ${i + 1}: choose a journey stage.`;
        if (c.note.trim().length < 5)
          errors[`capture.${c.id}.note`] =
            `Capture ${i + 1}: add a note, e.g. "captured manually: OTP-gated screen".`;
      });
      break;

    case 'patterns':
      if (draft.patternIds.length === 0) errors.patternIds = 'Choose at least one pattern.';
      if (draft.stageIds.length === 0) errors.stageIds = 'Choose at least one journey stage.';
      draft.exclusions.forEach((e, i) => {
        if (!e.stageId) errors[`exclusion.${e.id}.stageId`] = `Exclusion ${i + 1}: choose a stage.`;
        else if (!draft.stageIds.includes(e.stageId))
          errors[`exclusion.${e.id}.stageId`] = `Exclusion ${i + 1}: the stage is not in scope.`;
        if (e.reason.trim().length < 5)
          errors[`exclusion.${e.id}.reason`] = `Exclusion ${i + 1}: explain why it is excluded.`;
      });
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

// ------------------------------------------------------------------ client access checklist

/**
 * What the client has provided and what is still outstanding. Outstanding items do not block the
 * wizard, but launching with any requires an explicit acknowledgement, which is recorded.
 */
export function deriveClientAccessChecklist(
  draft: WizardDraft,
  context: { stages: JourneyStage[]; testDataSets: TestDataSet[] },
): ClientAccessItem[] {
  const items: ClientAccessItem[] = [];
  const has = (k: TargetKind) => draft.targetKinds.includes(k);
  const push = (item: ClientAccessItem) => items.push(item);
  const provided = (ok: boolean) => (ok ? 'provided' : 'outstanding');

  if (has('website')) {
    const w = draft.website;
    const sets = context.testDataSets.filter((t) => w.testDataSetIds.includes(t.id));
    const paymentStage = context.stages.find((s) => s.key === 'payment');
    const paymentInScope = !!paymentStage && draft.stageIds.includes(paymentStage.id);
    push({
      id: 'website-url',
      category: 'website',
      label: 'Website URL and environment',
      status: provided(isHttpUrl(w.baseUrl)),
      detail: `${w.baseUrl} (${w.environmentLabel || (w.environment === 'uat' ? 'UAT' : 'Production')})`,
    });
    push({
      id: 'website-credentials',
      category: 'website',
      label: 'Test credentials',
      status: provided(w.credentials.length > 0),
      ...(w.credentials.length > 0 ? { detail: `${w.credentials.length} stored` } : {}),
    });
    const customer = sets.find((t) => t.kind === 'customer');
    push({
      id: 'website-test-data',
      category: 'website',
      label: 'Test customer data',
      status: provided(!!customer),
      ...(customer ? { detail: customer.name } : {}),
    });
    const payment = sets.find((t) => t.kind === 'payment_sandbox');
    push({
      id: 'website-payment-sandbox',
      category: 'website',
      label: 'Payment sandbox details',
      status: payment ? 'provided' : paymentInScope ? 'outstanding' : 'not_required',
      ...(payment
        ? { detail: payment.name }
        : paymentInScope
          ? {}
          : { detail: 'Payment stage not in scope' }),
    });
    push({
      id: 'website-otp',
      category: 'website',
      label: 'OTP handling',
      status: w.otp.mode === 'not_required' ? 'not_required' : 'provided',
      detail:
        w.otp.mode === 'fixed_test_otp'
          ? `Fixed test OTP (${w.otp.otpLength} digits)`
          : w.otp.mode === 'live_assessor_entry'
            ? 'Assessor enters OTPs live during the run'
            : 'No OTP in scope',
    });
  }
  if (has('android')) {
    push({
      id: 'android-build',
      category: 'android',
      label: 'Android build (APK or AAB)',
      status: provided(!!draft.android.build),
      ...(draft.android.build ? { detail: draft.android.build.fileName } : {}),
    });
  }
  if (has('ios')) {
    const ok = !!draft.ios.build && draft.ios.decryptedConfirmed;
    push({
      id: 'ios-build',
      category: 'ios',
      label: 'Decrypted iOS build (IPA) from the client',
      status: provided(ok),
      ...(draft.ios.build ? { detail: draft.ios.build.fileName } : {}),
    });
  }
  if (has('source')) {
    const s = draft.source;
    if (s.mode === 'repository') {
      push({
        id: 'source-access',
        category: 'source',
        label: 'Read-only repository access',
        status: provided(!!s.token && s.readOnlyConfirmed),
        ...(s.token ? { detail: `Token ${s.token.maskedHint}` } : {}),
      });
      push({
        id: 'source-commit',
        category: 'source',
        label: 'Pinned commit',
        status: provided(FULL_COMMIT_SHA.test(s.commitSha.trim())),
        ...(s.commitSha ? { detail: s.commitSha.trim().slice(0, 12) } : {}),
      });
    } else {
      push({
        id: 'source-archive',
        category: 'source',
        label: 'Source archive',
        status: provided(!!s.archive),
        ...(s.archive ? { detail: s.archive.fileName } : {}),
      });
    }
  }
  if (has('backend_config')) {
    for (const type of ConfigTypeSchema.options) {
      const files = draft.backendConfig.files.filter((f) => f.configType === type);
      push({
        id: `config-${type}`,
        category: 'backend_config',
        label: CONFIG_TYPE_LABELS[type],
        status: provided(files.length > 0),
        ...(files.length > 0 ? { detail: files.map((f) => f.upload.fileName).join(', ') } : {}),
      });
    }
  }
  return items;
}

// ------------------------------------------------------------------ conversion

export function toNewAssessmentInput(
  draft: WizardDraft,
  context: { stages: JourneyStage[]; testDataSets: TestDataSet[] },
): NewAssessmentInput {
  const targets: NewTargetInput[] = [];
  const artifacts: NewArtifactInput[] = [];
  const indexOf: Partial<Record<TargetKind, number>> = {};
  const has = (k: TargetKind) => draft.targetKinds.includes(k);

  if (has('website')) {
    const w = draft.website;
    indexOf.website = targets.length;
    targets.push({
      type: 'website',
      name: w.name.trim(),
      baseUrl: w.baseUrl.trim(),
      environment: w.environment,
      ...(w.environmentLabel.trim() ? { environmentLabel: w.environmentLabel.trim() } : {}),
      credentials: w.credentials,
      testDataSetIds: w.testDataSetIds,
      otpHandling: w.otp,
    });
  }
  if (has('android')) {
    const a = draft.android;
    indexOf.android = targets.length;
    targets.push({
      type: 'mobile_app',
      platform: 'android',
      name: a.name.trim(),
      appId: a.appId.trim(),
      version: a.version.trim(),
      environment: a.environment,
      appIdSource: a.appIdSource,
      ...(a.build ? { buildArtifactId: a.build.uploadId } : {}),
    });
    if (a.build) artifacts.push({ upload: a.build, targetIndex: indexOf.android });
  }
  if (has('ios')) {
    const i = draft.ios;
    indexOf.ios = targets.length;
    targets.push({
      type: 'mobile_app',
      platform: 'ios',
      name: i.name.trim(),
      appId: i.appId.trim(),
      version: i.version.trim(),
      environment: i.environment,
      appIdSource: 'entered',
      ...(i.build
        ? { buildArtifactId: i.build.uploadId, decryptedBuild: i.decryptedConfirmed }
        : {}),
    });
    if (i.build) artifacts.push({ upload: i.build, targetIndex: indexOf.ios });
  }
  if (has('source')) {
    const s = draft.source;
    indexOf.source = targets.length;
    targets.push({
      type: 'code_repository',
      name: s.name.trim(),
      languages: splitLanguages(s.languages),
      source:
        s.mode === 'archive' && s.archive
          ? { kind: 'archive', artifactId: s.archive.uploadId }
          : {
              kind: 'repository',
              provider: s.provider,
              repoUrl: s.repoUrl.trim(),
              branch: s.branch.trim(),
              commitSha: s.commitSha.trim(),
              access: 'read_only',
              ...(s.token ? { tokenRef: s.token } : {}),
            },
    });
    if (s.mode === 'archive' && s.archive)
      artifacts.push({ upload: s.archive, targetIndex: indexOf.source });
  }
  if (has('backend_config')) {
    const c = draft.backendConfig;
    indexOf.backend_config = targets.length;
    targets.push({
      type: 'backend_config',
      name: c.name.trim(),
      configUploadIds: c.files.map((f) => f.upload.uploadId),
    });
    for (const f of c.files) {
      artifacts.push({
        upload: f.upload,
        targetIndex: indexOf.backend_config,
        ...(f.configType ? { configType: f.configType } : {}),
      });
    }
  }

  const journeys = draft.journeys.filter((j) => indexOf[j.targetKind] !== undefined);
  const journeyInputs = journeys.map((j) => ({
    targetIndex: indexOf[j.targetKind] ?? 0,
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

  for (const c of draft.captures) {
    const journeyIndex = journeys.findIndex((j) => j.id === c.journeyId);
    const journey = journeys[journeyIndex];
    const targetIndex = journey ? indexOf[journey.targetKind] : undefined;
    artifacts.push({
      upload: c.upload,
      ...(targetIndex !== undefined ? { targetIndex } : {}),
      manual: {
        ...(journeyIndex >= 0 ? { journeyIndex } : {}),
        stageId: c.stageId,
        note: c.note.trim(),
      },
    });
  }

  const clientAccess = deriveClientAccessChecklist(draft, context);
  return {
    name: draft.name.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    targets,
    journeys: journeyInputs,
    patternIds: draft.patternIds,
    stageIds: draft.stageIds,
    artifacts,
    coverageGaps: draft.exclusions.map((e) => ({
      stageId: e.stageId,
      ...(e.patternIds.length > 0 ? { patternIds: e.patternIds } : {}),
      reason: e.reason.trim(),
    })),
    clientAccess,
    launchedWithOutstanding: clientAccess.some((i) => i.status === 'outstanding'),
  };
}

// ------------------------------------------------------------------ persistence

export const WIZARD_STORAGE_KEY = 'dpat.wizard-draft.v2';

export function loadDraft(): WizardDraft | null {
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;
    return parsed.version === 2 ? (parsed as WizardDraft) : null;
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
