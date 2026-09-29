import { PATTERN_IDS } from '@dpat/rules';
import { loadSampleFixtures, type StoredUpload } from '@dpat/shared';
import { describe, expect, it } from 'vitest';

import {
  deriveClientAccessChecklist,
  emptyDraft,
  taggedStageIds,
  templateJourney,
  toNewAssessmentInput,
  validateStep,
  type WizardDraft,
} from './draft';

const fx = loadSampleFixtures();
const stages = fx.organization.journeyStages;
const context = { stages, testDataSets: fx.testDataSets };
const SHA = 'a3f9c21e8b4d7c2f5a6e9d0b1c4f7a8e2d5b6c9f';

const upload = (uploadId: string, fileName: string, kind: StoredUpload['kind']): StoredUpload => ({
  uploadId,
  fileName,
  sizeBytes: 4096,
  mimeType: 'application/octet-stream',
  kind,
  sha256: 'c'.repeat(64),
  storage: 'metadata_only',
  completedAt: '2026-09-29T06:00:00Z',
});

function fullDraft(): WizardDraft {
  const d = emptyDraft(PATTERN_IDS);
  d.name = 'Motor renewal journeys';
  d.targetKinds = ['website', 'android', 'ios', 'source', 'backend_config'];
  d.website = {
    ...d.website,
    baseUrl: 'https://uat.motor.examplelife.example',
    environment: 'uat',
    environmentLabel: 'UAT-2',
    credentials: [
      {
        id: 'cred-1',
        label: 'Customer',
        username: 'qa.user',
        secretRef: 'not-stored',
        maskedHint: '••••42',
        storage: 'not_stored',
        storedAt: '2026-09-29T06:00:00Z',
      },
    ],
    testDataSetIds: ['tds-customer-anita', 'tds-payment-sandbox'],
    otp: { mode: 'live_assessor_entry', assessorUserId: 'usr-arjun', timeoutSeconds: 180 },
  };
  d.android = {
    ...d.android,
    appId: 'com.examplelife.motor',
    version: '2.1.0',
    build: upload('upl-apk', 'motor.apk', 'apk'),
    appIdSource: 'read_from_file',
  };
  d.ios = {
    ...d.ios,
    appId: 'com.examplelife.motor',
    version: '2.1.0',
    build: upload('upl-ipa', 'motor.ipa', 'ipa'),
    decryptedConfirmed: true,
  };
  d.source = {
    ...d.source,
    name: 'Motor platform',
    provider: 'gitlab',
    repoUrl: 'https://git.examplelife.example/motor',
    commitSha: SHA,
    readOnlyConfirmed: true,
  };
  d.backendConfig = {
    name: 'Motor configuration',
    files: [
      {
        upload: upload('upl-cfg-1', 'pricing-rules.yaml', 'config_file'),
        configType: 'pricing_rules',
      },
      {
        upload: upload('upl-cfg-2', 'reminders.yaml', 'config_file'),
        configType: 'notification_schedule',
      },
    ],
  };
  d.journeys = [
    templateJourney('website', stages, d.website.baseUrl),
    templateJourney('android', stages, ''),
    templateJourney('ios', stages, ''),
  ];
  d.captures = [
    {
      id: 'cap-1',
      upload: upload('upl-shot', 'otp.png', 'screenshot'),
      journeyId: d.journeys[0]!.id,
      stageId: 'stg-payment',
      note: 'Captured manually: OTP-gated screen',
    },
  ];
  d.stageIds = [...taggedStageIds(d, stages), 'stg-payment'];
  d.exclusions = [
    {
      id: 'ex-1',
      stageId: 'stg-payment',
      patternIds: ['saas_billing'],
      reason: 'Billing handled by the gateway',
    },
  ];
  return d;
}

describe('wizard validation', () => {
  it('accepts a complete draft', () => {
    expect(validateStep(fullDraft(), 'review')).toEqual({});
  });

  it('requires a name and at least one target', () => {
    expect(Object.keys(validateStep(emptyDraft(PATTERN_IDS), 'scope')).sort()).toEqual([
      'name',
      'targetKinds',
    ]);
  });

  it('validates each target panel', () => {
    const d = fullDraft();
    d.website.baseUrl = 'motor';
    d.android.appId = 'motor';
    d.ios.decryptedConfirmed = false;
    d.source.commitSha = 'a3f9c21';
    d.backendConfig.files[0]!.configType = '';
    const errors = validateStep(d, 'targets');
    expect(errors['website.baseUrl']).toBeDefined();
    expect(errors['android.appId']).toBeDefined();
    expect(errors['ios.decrypted']).toMatch(/decrypted build/);
    expect(errors['source.commitSha']).toMatch(/40-character/);
    expect(errors['backend.types']).toBeDefined();
  });

  it('requires an archive when source comes as a ZIP', () => {
    const d = fullDraft();
    d.source.mode = 'archive';
    expect(validateStep(d, 'targets')['source.archive']).toBeDefined();
    d.source.archive = upload('upl-zip', 'src.zip', 'source_archive');
    expect(validateStep(d, 'targets')).toEqual({});
  });

  it('requires journeys with captures for website and app targets', () => {
    const d = fullDraft();
    d.journeys = d.journeys.filter((j) => j.targetKind !== 'ios');
    expect(validateStep(d, 'journeys')['journeys.ios']).toMatch(/ios app/i);
  });

  it('requires a stage and a note on manual captures', () => {
    const d = fullDraft();
    d.captures[0]!.stageId = '';
    d.captures[0]!.note = '';
    expect(Object.keys(validateStep(d, 'captures'))).toHaveLength(2);
  });

  it('checks exclusions against the stages in scope', () => {
    const d = fullDraft();
    d.exclusions[0]!.stageId = 'stg-claims';
    expect(validateStep(d, 'patterns')['exclusion.ex-1.stageId']).toMatch(/not in scope/);
  });
});

describe('client access checklist', () => {
  it('marks what is provided and what is outstanding', () => {
    const items = deriveClientAccessChecklist(fullDraft(), context);
    const byId = Object.fromEntries(items.map((i) => [i.id, i.status]));
    expect(byId).toMatchObject({
      'website-url': 'provided',
      'website-credentials': 'provided',
      'website-test-data': 'provided',
      'website-payment-sandbox': 'provided',
      'website-otp': 'provided',
      'android-build': 'provided',
      'ios-build': 'provided',
      'source-access': 'outstanding', // no read-only token stored yet
      'source-commit': 'provided',
      'config-pricing_rules': 'provided',
      'config-cms_export': 'outstanding',
    });
  });

  it('only requires payment sandbox details when the payment stage is in scope', () => {
    const d = fullDraft();
    d.website.testDataSetIds = ['tds-customer-anita'];
    const status = () =>
      deriveClientAccessChecklist(d, context).find((i) => i.id === 'website-payment-sandbox')
        ?.status;
    expect(status()).toBe('outstanding');
    d.stageIds = d.stageIds.filter((s) => s !== 'stg-payment');
    expect(status()).toBe('not_required');
  });
});

describe('toNewAssessmentInput', () => {
  it('builds targets, artifacts, captures, exclusions and the checklist', () => {
    const input = toNewAssessmentInput(fullDraft(), context);
    expect(
      input.targets.map((t) => (t.type === 'mobile_app' ? `mobile_app:${t.platform}` : t.type)),
    ).toEqual([
      'website',
      'mobile_app:android',
      'mobile_app:ios',
      'code_repository',
      'backend_config',
    ]);
    const ios = input.targets[2];
    expect(ios?.type === 'mobile_app' && ios.decryptedBuild).toBe(true);
    expect(input.targets[3]).toMatchObject({
      source: { kind: 'repository', provider: 'gitlab', commitSha: SHA, access: 'read_only' },
    });
    expect(input.targets[4]).toMatchObject({ configUploadIds: ['upl-cfg-1', 'upl-cfg-2'] });
    expect(input.artifacts.map((a) => a.upload.uploadId)).toEqual([
      'upl-apk',
      'upl-ipa',
      'upl-cfg-1',
      'upl-cfg-2',
      'upl-shot',
    ]);
    expect(input.artifacts.at(-1)).toMatchObject({
      targetIndex: 0,
      manual: { journeyIndex: 0, stageId: 'stg-payment' },
    });
    expect(input.coverageGaps).toEqual([
      {
        stageId: 'stg-payment',
        patternIds: ['saas_billing'],
        reason: 'Billing handled by the gateway',
      },
    ]);
    expect(input.launchedWithOutstanding).toBe(true);
  });

  it('records an archive source as an artifact of the code target', () => {
    const d = fullDraft();
    d.source.mode = 'archive';
    d.source.archive = upload('upl-zip', 'src.zip', 'source_archive');
    const input = toNewAssessmentInput(d, context);
    expect(input.targets[3]).toMatchObject({ source: { kind: 'archive', artifactId: 'upl-zip' } });
    expect(input.artifacts.find((a) => a.upload.uploadId === 'upl-zip')?.targetIndex).toBe(3);
  });
});
