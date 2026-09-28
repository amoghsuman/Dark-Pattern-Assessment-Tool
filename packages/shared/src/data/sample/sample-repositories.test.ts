import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRepositories } from '../create-repositories';
import { NotFoundError, PermissionError } from '../errors';
import type { NewAssessmentInput } from '../repositories';
import { createLocalStorageOverlayStore, createMemoryOverlayStore, emptyOverlay } from './overlay';
import { createSampleRepositories } from './sample-repositories';

const NOW = new Date('2026-09-29T06:00:00Z');
const A1 = 'asm-digital-h1';

function setup(role: Parameters<typeof emptyOverlay>[0] = 'admin') {
  const store = createMemoryOverlayStore(emptyOverlay(role));
  let n = 0;
  const repos = createSampleRepositories({
    store,
    latencyMs: 0,
    replayFrameMs: 10,
    now: () => NOW,
    newId: (prefix) => `${prefix}-t${++n}`,
  });
  return { repos, store };
}

describe('sample repositories: reads', () => {
  it('lists assessments with risk summaries, newest first', async () => {
    const { repos } = setup();
    const list = await repos.assessments.list();
    expect(list.map((s) => s.assessment.id)).toEqual(['asm-renewal-prelaunch', A1]);
    const h1 = list.find((s) => s.assessment.id === A1)!;
    expect(h1.targets).toHaveLength(3);
    expect(h1.risk.rating).toBe('critical');
    expect(h1.risk.totalFindings).toBe(41);
  });

  it('returns assessment detail with journeys', async () => {
    const { repos } = setup();
    const detail = await repos.assessments.get(A1);
    expect(detail.journeys.map((j) => j.id).sort()).toEqual([
      'jrn-app-service',
      'jrn-web-buy',
      'jrn-web-service',
    ]);
  });

  it('throws NotFoundError for unknown IDs', async () => {
    const { repos } = setup();
    await expect(repos.assessments.get('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(repos.findings.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('filters findings and synthesises a review for findings without history', async () => {
    const { repos } = setup();
    const critical = await repos.findings.list(A1, { severities: ['critical'] });
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.every((f) => f.severity === 'critical')).toBe(true);
    const review = await repos.findings.getReview('fnd-rn-001');
    expect(review.history).toHaveLength(1);
    expect(review.history[0]?.to).toBe('detected');
  });

  it('returns copies so callers cannot mutate the fixtures', async () => {
    const { repos } = setup();
    const f = await repos.findings.get('fnd-h1-001');
    f.title = 'changed';
    expect((await repos.findings.get('fnd-h1-001')).title).not.toBe('changed');
  });

  it('serves rule packs', async () => {
    const { repos } = setup();
    expect(await repos.rules.listPacks()).toHaveLength(13);
    expect((await repos.rules.getPack('nagging')).name).toBe('Nagging');
    expect(await repos.rules.getPackSetVersion()).toBe('ccpa-2023@0.1.0-draft');
  });

  it('maps the selected role to a fixture user', async () => {
    const { repos } = setup();
    expect((await repos.organizations.getCurrentUser()).name).toBe('Priya Raman');
    repos.controls.setRole('viewer');
    expect((await repos.organizations.getCurrentUser()).role).toBe('viewer');
  });
});

describe('sample repositories: review workflow', () => {
  it('updates status and appends history for the acting user', async () => {
    const { repos } = setup('reviewer');
    const result = await repos.findings.updateStatus(['fnd-h1-003'], 'confirmed', '  Verified  ');
    expect(result.skipped).toEqual([]);
    expect(result.updated[0]?.status).toBe('confirmed');
    expect((await repos.findings.get('fnd-h1-003')).status).toBe('confirmed');
    const review = await repos.findings.getReview('fnd-h1-003');
    expect(review.history.at(-1)).toMatchObject({
      from: 'under_review',
      to: 'confirmed',
      by: 'usr-kavya',
      at: NOW.toISOString(),
      note: 'Verified',
    });
  });

  it('skips invalid or unauthorised changes in a bulk update', async () => {
    const { repos } = setup('assessor');
    const result = await repos.findings.updateStatus(
      ['fnd-h1-008', 'fnd-h1-003', 'missing'],
      'under_review',
    );
    expect(result.updated.map((f) => f.id)).toEqual(['fnd-h1-008']);
    expect(result.skipped).toEqual([
      { findingId: 'fnd-h1-003', reason: 'Already in that status' },
      { findingId: 'missing', reason: 'Finding not found' },
    ]);
    const confirm = await repos.findings.updateStatus(['fnd-h1-008'], 'confirmed');
    expect(confirm.skipped[0]?.reason).toMatch(/assessor role/);
  });

  it('keeps viewers read-only', async () => {
    const { repos } = setup('viewer');
    const result = await repos.findings.updateStatus(['fnd-h1-008'], 'under_review');
    expect(result.updated).toEqual([]);
    await expect(repos.findings.addComment('fnd-h1-008', 'hello')).rejects.toBeInstanceOf(
      PermissionError,
    );
  });

  it('adds comments and rejects empty ones', async () => {
    const { repos } = setup('assessor');
    const review = await repos.findings.addComment('fnd-h1-008', ' Reproduced on Android 15. ');
    expect(review.comments.at(-1)).toMatchObject({
      by: 'usr-arjun',
      body: 'Reproduced on Android 15.',
    });
    await expect(repos.findings.addComment('fnd-h1-008', '   ')).rejects.toThrow(/empty/);
  });

  it('reflects status changes in the risk summary', async () => {
    const { repos } = setup('reviewer');
    const before = (await repos.assessments.list()).find(
      (s) => s.assessment.id === 'asm-renewal-prelaunch',
    )!;
    await repos.findings.updateStatus(['fnd-rn-001'], 'dismissed');
    const after = (await repos.assessments.list()).find(
      (s) => s.assessment.id === 'asm-renewal-prelaunch',
    )!;
    expect(after.risk.openFindings).toBe(before.risk.openFindings - 1);
  });

  it('resets to the fixture state but keeps the selected role', async () => {
    const { repos } = setup('reviewer');
    await repos.findings.updateStatus(['fnd-h1-003'], 'confirmed');
    repos.controls.reset();
    expect((await repos.findings.get('fnd-h1-003')).status).toBe('under_review');
    expect(repos.controls.getRole()).toBe('reviewer');
  });
});

describe('sample repositories: settings', () => {
  it('lets admins rename and reorder stages but not remove stages with findings', async () => {
    const { repos } = setup();
    const org = await repos.organizations.getCurrent();
    const reordered = [...org.journeyStages]
      .reverse()
      .map((s) => (s.id === 'stg-claims' ? { ...s, name: 'Claims Intimation' } : s));
    const saved = await repos.organizations.saveJourneyStages(reordered);
    expect(saved[0]?.id).toBe('stg-consent');
    expect(saved.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(
      (await repos.organizations.getCurrent()).journeyStages.find((s) => s.id === 'stg-claims')
        ?.name,
    ).toBe('Claims Intimation');
    await expect(
      repos.organizations.saveJourneyStages(saved.filter((s) => s.id !== 'stg-payment')),
    ).rejects.toThrow(/Payment/);
  });

  it('restricts settings to admins', async () => {
    const { repos } = setup('reviewer');
    await expect(
      repos.organizations.update({ name: 'Renamed', sector: 'insurance' }),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it('updates the organisation and users', async () => {
    const { repos } = setup();
    await repos.organizations.update({ name: 'Example Life Insurance Ltd', sector: 'insurance' });
    const org = await repos.organizations.getCurrent();
    expect(org.name).toBe('Example Life Insurance Ltd');
    expect(org.regulator).toBeUndefined();
    const user = await repos.organizations.upsertUser({
      name: 'New Reviewer',
      email: 'new.reviewer@examplelife.example',
      role: 'reviewer',
      active: true,
    });
    expect((await repos.organizations.listUsers()).some((u) => u.id === user.id)).toBe(true);
  });
});

describe('sample repositories: new assessments and runs', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const input: NewAssessmentInput = {
    name: 'Motor renewal check',
    targets: [
      {
        type: 'website',
        name: 'Motor site',
        baseUrl: 'https://motor.examplelife.example',
        environment: 'uat',
      },
    ],
    journeys: [
      {
        targetIndex: 0,
        name: 'Renewal',
        steps: [
          {
            order: 0,
            action: 'navigate',
            stageId: 'stg-renewal',
            label: 'Open',
            target: 'https://motor.examplelife.example',
          },
          { order: 1, action: 'capture', stageId: 'stg-renewal', label: 'Capture' },
        ],
      },
    ],
    patternIds: ['false_urgency', 'nagging'],
    stageIds: ['stg-renewal'],
    uploads: [{ fileName: 'motor.apk', sizeBytes: 1024, kind: 'apk' }],
  };

  it('creates an assessment whose run replays to completion and persists', async () => {
    const { repos } = setup('assessor');
    const assessment = await repos.assessments.create(input);
    expect(assessment).toMatchObject({
      status: 'running',
      createdBy: 'usr-arjun',
      progress: { totalSteps: 2 },
    });
    expect((await repos.assessments.listArtifacts(assessment.id))[0]?.fileName).toBe('motor.apk');

    const run = await repos.assessments.getLatestRun(assessment.id);
    expect(run?.status).toBe('queued');
    const updates: string[] = [];
    repos.assessments.subscribeToRun(run!.id, (r) => updates.push(r.status));
    await vi.runAllTimersAsync();

    expect(updates[0]).toBe('running');
    expect(updates.at(-1)).toBe('succeeded');
    const detail = await repos.assessments.get(assessment.id);
    expect(detail.assessment.status).toBe('in_review');
    expect(detail.journeys[0]?.stageIds).toEqual(['stg-renewal']);
    expect((await repos.assessments.getLatestRun(assessment.id))?.status).toBe('succeeded');
  });

  it('stops emitting after unsubscribe', async () => {
    const { repos } = setup();
    const updates: number[] = [];
    const stop = repos.assessments.subscribeToRun('run-digital-h1', () => updates.push(1));
    await vi.advanceTimersByTimeAsync(25);
    stop();
    const seen = updates.length;
    await vi.runAllTimersAsync();
    expect(updates.length).toBe(seen);
    expect(seen).toBeGreaterThan(0);
  });

  it('does not let viewers create assessments', async () => {
    const { repos } = setup('viewer');
    await expect(repos.assessments.create(input)).rejects.toBeInstanceOf(PermissionError);
  });
});

describe('overlay stores', () => {
  it('fall back to memory when localStorage is unavailable (Node)', () => {
    const store = createLocalStorageOverlayStore('test-key');
    const state = emptyOverlay('reviewer');
    store.save(state);
    expect(store.load().role).toBe('reviewer');
    store.clear();
    expect(store.load().role).toBe('admin');
  });

  it('persist to localStorage when available', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => data.set(k, v),
        removeItem: (k: string) => data.delete(k),
      },
    });
    try {
      createLocalStorageOverlayStore('k').save(emptyOverlay('viewer'));
      expect(JSON.parse(data.get('k') ?? '{}')).toMatchObject({ version: 1, role: 'viewer' });
      expect(createLocalStorageOverlayStore('k').load().role).toBe('viewer');
      data.set('k', '{not json');
      expect(createLocalStorageOverlayStore('k').load().role).toBe('admin');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('createRepositories returns sample controls in sample mode', () => {
    const bundle = createRepositories('sample', {
      overlayStore: createMemoryOverlayStore(),
      latencyMs: 0,
    });
    expect(bundle.repositories.source).toBe('sample');
    expect(bundle.sampleControls?.getRole()).toBe('admin');
  });
});
