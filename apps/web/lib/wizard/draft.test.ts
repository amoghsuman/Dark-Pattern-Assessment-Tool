import { PATTERN_IDS } from '@dpat/rules';
import { loadSampleFixtures } from '@dpat/shared';
import { describe, expect, it } from 'vitest';

import {
  emptyDraft,
  taggedStageIds,
  templateJourney,
  toNewAssessmentInput,
  uploadKindFor,
  validateStep,
  type WizardDraft,
} from './draft';

const stages = loadSampleFixtures().organization.journeyStages;

function validDraft(): WizardDraft {
  const d = emptyDraft(PATTERN_IDS);
  d.name = 'Motor renewal check';
  d.targetTypes = ['website', 'code_repository'];
  d.website.baseUrl = 'https://motor.examplelife.example';
  d.code = {
    name: 'Motor platform',
    repoUrl: '',
    branch: 'main',
    commitSha: 'abc1234',
    languages: 'TypeScript, Kotlin',
  };
  d.uploads = [{ id: 'u1', fileName: 'motor-src.zip', sizeBytes: 2048, kind: 'source_archive' }];
  d.journeys = [templateJourney('website', stages, d.website.baseUrl)];
  d.stageIds = taggedStageIds(d, stages);
  return d;
}

describe('wizard validation', () => {
  it('accepts a complete draft', () => {
    expect(validateStep(validDraft(), 'review')).toEqual({});
  });

  it('requires a name and at least one target type', () => {
    const d = emptyDraft(PATTERN_IDS);
    expect(Object.keys(validateStep(d, 'scope')).sort()).toEqual(['name', 'targetTypes']);
  });

  it('validates target details per type', () => {
    const d = validDraft();
    d.targetTypes = ['website', 'mobile_app', 'code_repository'];
    d.website.baseUrl = 'examplelife';
    d.code.commitSha = 'not-a-sha';
    const errors = validateStep(d, 'targets');
    expect(errors['website.baseUrl']).toBeDefined();
    expect(errors['mobile.appId']).toBeDefined();
    expect(errors['mobile.version']).toBeDefined();
    expect(errors['code.commitSha']).toBeDefined();
  });

  it('needs source for a code target without a repository URL', () => {
    const d = validDraft();
    d.uploads = [];
    expect(validateStep(d, 'uploads').uploads).toMatch(/source archive/);
    d.code.repoUrl = 'https://git.examplelife.example/motor';
    expect(validateStep(d, 'uploads')).toEqual({});
  });

  it('requires a journey with a capture step for web and app targets', () => {
    const d = validDraft();
    d.journeys = [];
    expect(validateStep(d, 'journeys')['journeys.website']).toBeDefined();

    const j = templateJourney('website', stages, 'https://x.example');
    j.steps = j.steps.filter((s) => s.action !== 'capture');
    j.steps[0]!.target = '';
    d.journeys = [j];
    const errors = validateStep(d, 'journeys');
    expect(errors[`journey.${j.id}.capture`]).toBeDefined();
    expect(errors[`step.${j.steps[0]!.id}.target`]).toMatch(/Step 1: add a URL/);
  });

  it('requires patterns and stages', () => {
    const d = validDraft();
    d.patternIds = [];
    d.stageIds = [];
    expect(Object.keys(validateStep(d, 'patterns')).sort()).toEqual(['patternIds', 'stageIds']);
  });
});

describe('toNewAssessmentInput', () => {
  it('builds targets, journeys and uploads for the repository', () => {
    const input = toNewAssessmentInput(validDraft());
    expect(input.targets.map((t) => t.type)).toEqual(['website', 'code_repository']);
    expect(input.targets[1]).toMatchObject({
      commitSha: 'abc1234',
      languages: ['TypeScript', 'Kotlin'],
    });
    expect(input.targets[1]).not.toHaveProperty('repoUrl');
    expect(input.journeys[0]?.targetIndex).toBe(0);
    const wait = input.journeys[0]?.steps.find((s) => s.action === 'wait');
    expect(wait).toMatchObject({ waitMs: 2000 });
    expect(wait).not.toHaveProperty('target');
    expect(input.uploads).toEqual([
      { fileName: 'motor-src.zip', sizeBytes: 2048, kind: 'source_archive' },
    ]);
  });

  it('drops journeys for target types that were deselected', () => {
    const d = validDraft();
    d.journeys.push(templateJourney('mobile_app', stages, ''));
    expect(toNewAssessmentInput(d).journeys).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('suggests upload kinds from file names', () => {
    expect(uploadKindFor('ExampleLife-5.0.apk')).toBe('apk');
    expect(uploadKindFor('App.ipa')).toBe('ipa');
    expect(uploadKindFor('src.tar.gz')).toBe('source_archive');
    expect(uploadKindFor('payments-openapi.yaml')).toBe('api_spec');
    expect(uploadKindFor('pricing-rules.yaml')).toBe('config_file');
  });

  it('lists tagged stages in stage order', () => {
    const d = validDraft();
    expect(taggedStageIds(d, stages)).toEqual(['stg-quote', 'stg-proposal']);
  });
});
