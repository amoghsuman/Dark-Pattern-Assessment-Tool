import { getRulePack, RULE_PACK_SET_VERSION, rulePackBundle } from '@dpat/rules';

import { canComment, transitionRefusal } from '../../domain/finding-workflow';
import { ENGINE_ORDER } from '../../domain/labels';
import type { AnalysisRun, EngineRun } from '../../schemas/analysis';
import type { Artifact, Assessment, Journey, Target } from '../../schemas/assessment';
import type { FindingStatus, Role } from '../../schemas/common';
import type { Finding, Review } from '../../schemas/finding';
import type { JourneyStage, Organization, User } from '../../schemas/organization';
import { deriveRiskSummary } from '../derive/summary';
import { filterFindings } from '../derive/filter';
import { buildRunReplay } from '../derive/run-replay';
import { NotFoundError, PermissionError } from '../errors';
import type {
  AssessmentDetail,
  AssessmentSummary,
  NewAssessmentInput,
  Repositories,
  SampleControls,
  StatusUpdateResult,
  UserInput,
} from '../repositories';
import { loadSampleFixtures, SYSTEM_USER_ID } from './fixtures';
import {
  createMemoryOverlayStore,
  emptyOverlay,
  type OverlayState,
  type OverlayStore,
} from './overlay';

export interface SampleRepositoryOptions {
  store?: OverlayStore;
  /** Artificial latency per call so loading states are exercised. 0 in tests. */
  latencyMs?: number;
  /** Delay between run replay frames. */
  replayFrameMs?: number;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

/** Which fixture user acts for each role in the sample-mode role switcher. */
export const SAMPLE_ROLE_USERS: Record<Role, string> = {
  admin: 'usr-priya',
  reviewer: 'usr-kavya',
  assessor: 'usr-arjun',
  viewer: 'usr-rohan',
};

let idCounter = 0;
const defaultNewId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export function createSampleRepositories(
  options: SampleRepositoryOptions = {},
): Repositories & { controls: SampleControls } {
  const fixtures = loadSampleFixtures();
  const store = options.store ?? createMemoryOverlayStore();
  const latencyMs = options.latencyMs ?? 120;
  const replayFrameMs = options.replayFrameMs ?? 450;
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? defaultNewId;
  const timestamp = () => now().toISOString();

  const delay = () =>
    latencyMs > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
      : Promise.resolve();
  const clone = <T>(value: T): T => structuredClone(value);

  // ------------------------------------------------------------ views over fixtures + overlay

  const overlay = (): OverlayState => store.load();
  const mutate = (fn: (state: OverlayState) => void) => {
    const state = overlay();
    fn(state);
    store.save(state);
  };

  const stages = (): JourneyStage[] =>
    [...(overlay().journeyStages ?? fixtures.organization.journeyStages)].sort(
      (a, b) => a.order - b.order,
    );

  const organization = (): Organization => {
    const o = overlay();
    const patch = o.organization;
    const base = { ...fixtures.organization, journeyStages: stages() };
    if (!patch) return base;
    const { regulator: _regulator, ...rest } = base;
    return {
      ...rest,
      name: patch.name,
      sector: patch.sector,
      ...(patch.regulator ? { regulator: patch.regulator } : {}),
    };
  };

  const users = (): User[] => {
    const extra = overlay().users;
    const merged = fixtures.users.map((u) => extra[u.id] ?? u);
    for (const u of Object.values(extra)) if (!merged.some((m) => m.id === u.id)) merged.push(u);
    return merged;
  };

  const currentUser = (): User => {
    const id = SAMPLE_ROLE_USERS[overlay().role];
    const user = users().find((u) => u.id === id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  };

  const created = () => overlay().createdAssessments;
  const assessments = (): Assessment[] => [
    ...fixtures.assessments,
    ...created().map((c) => c.assessment),
  ];
  const targets = (): Target[] => [...fixtures.targets, ...created().flatMap((c) => c.targets)];
  const journeys = (): Journey[] => [...fixtures.journeys, ...created().flatMap((c) => c.journeys)];
  const artifacts = (): Artifact[] => [
    ...fixtures.artifacts,
    ...created().flatMap((c) => c.artifacts),
  ];
  const runs = (): AnalysisRun[] => [...fixtures.analysisRuns, ...created().map((c) => c.run)];

  const findings = (): Finding[] => {
    const patches = overlay().findingStatus;
    return fixtures.findings.map((f) => {
      const patch = patches[f.id];
      return patch ? { ...f, status: patch.status, updatedAt: patch.updatedAt } : f;
    });
  };

  const findFinding = (id: string): Finding => {
    const f = findings().find((x) => x.id === id);
    if (!f) throw new NotFoundError('Finding', id);
    return f;
  };

  const review = (findingId: string): Review => {
    const finding = findFinding(findingId);
    const base = fixtures.reviews.find((r) => r.findingId === findingId) ?? {
      findingId,
      history: [
        {
          id: `hst-${findingId}-0`,
          from: null,
          to: 'detected' as const,
          by: SYSTEM_USER_ID,
          at: finding.createdAt,
        },
      ],
      comments: [],
    };
    const added = overlay().reviewAdditions[findingId];
    return {
      findingId,
      history: [...base.history, ...(added?.history ?? [])],
      comments: [...base.comments, ...(added?.comments ?? [])],
    };
  };

  const requireRole = (allowed: Role[], action: string) => {
    const role = overlay().role;
    if (!allowed.includes(role)) throw new PermissionError(`The ${role} role cannot ${action}.`);
  };

  // ------------------------------------------------------------ run replay

  const completeCreatedRun = (run: AnalysisRun): AnalysisRun => {
    const entry = created().find((c) => c.run.id === run.id);
    const journeysFor = entry?.journeys ?? [];
    const captureSteps = journeysFor
      .flatMap((j) => j.steps)
      .filter((s) => s.action === 'capture').length;
    const startMs = new Date(run.startedAt ?? timestamp()).getTime();
    const at = (minutes: number) => new Date(startMs + minutes * 60_000).toISOString();
    const hasCode = (entry?.targets ?? []).some((t) => t.type === 'code_repository');
    const hasApp = (entry?.targets ?? []).some((t) => t.type === 'mobile_app');
    const messages: Record<EngineRun['engine'], [string, string]> = {
      screen_capture: [
        `Running ${journeysFor.length} journey(s)`,
        `Captured ${captureSteps} screen(s); no findings raised`,
      ],
      code_analysis: [
        hasCode ? 'Indexing uploaded source' : 'No source uploaded; skipping',
        'Code analysis complete; no findings raised',
      ],
      backend_logic: [
        'Reviewing configuration and API specifications',
        'Backend and logic review complete; no findings raised',
      ],
      software_risk: [
        hasApp ? 'Scanning app package' : 'No app package; skipping',
        'Software risk scan complete; no findings raised',
      ],
      correlation: ['Correlating findings across engines', 'Correlation complete'],
    };
    return {
      ...run,
      status: 'succeeded',
      completedAt: at(ENGINE_ORDER.length * 4),
      engines: ENGINE_ORDER.map((engine, i) => ({
        engine,
        status: 'succeeded',
        startedAt: at(i * 4),
        completedAt: at(i * 4 + 3),
        events: [
          { at: at(i * 4), level: 'info', message: messages[engine][0] },
          { at: at(i * 4 + 3), level: 'info', message: messages[engine][1] },
        ],
        metrics: { itemsTotal: 10, itemsProcessed: 10, findingsRaised: 0 },
      })),
    };
  };

  // ------------------------------------------------------------ repositories

  const repositories: Repositories = {
    source: 'sample',

    organizations: {
      async getCurrent() {
        await delay();
        return clone(organization());
      },
      async update(input) {
        await delay();
        requireRole(['admin'], 'change organisation settings');
        mutate((s) => {
          s.organization = { ...input };
        });
        return clone(organization());
      },
      async listUsers() {
        await delay();
        return clone(users());
      },
      async upsertUser(input: UserInput) {
        await delay();
        requireRole(['admin'], 'manage users');
        const user: User = {
          ...input,
          id: input.id ?? newId('usr'),
          organizationId: fixtures.organization.id,
        };
        mutate((s) => {
          s.users[user.id] = user;
        });
        return clone(user);
      },
      async saveJourneyStages(next) {
        await delay();
        requireRole(['admin'], 'configure journey stages');
        const removed = stages().filter((s) => !next.some((n) => n.id === s.id));
        const inUse = removed.filter((s) => findings().some((f) => f.stageId === s.id));
        if (inUse.length > 0) {
          throw new Error(
            `Cannot remove stages that have findings: ${inUse.map((s) => s.name).join(', ')}`,
          );
        }
        const ordered = next.map((s, order) => ({ ...s, order }));
        mutate((s) => {
          s.journeyStages = ordered;
        });
        return clone(ordered);
      },
      async getCurrentUser() {
        await delay();
        return clone(currentUser());
      },
    },

    assessments: {
      async list(): Promise<AssessmentSummary[]> {
        await delay();
        const all = findings();
        return clone(
          assessments()
            .map((assessment) => ({
              assessment,
              targets: targets().filter((t) => assessment.targetIds.includes(t.id)),
              risk: deriveRiskSummary(all.filter((f) => f.assessmentId === assessment.id)),
            }))
            .sort((a, b) => b.assessment.updatedAt.localeCompare(a.assessment.updatedAt)),
        );
      },
      async get(id): Promise<AssessmentDetail> {
        await delay();
        const assessment = assessments().find((a) => a.id === id);
        if (!assessment) throw new NotFoundError('Assessment', id);
        return clone({
          assessment,
          targets: targets().filter((t) => assessment.targetIds.includes(t.id)),
          journeys: journeys().filter((j) => j.assessmentId === id),
        });
      },
      async create(input: NewAssessmentInput) {
        await delay();
        requireRole(['admin', 'assessor'], 'create assessments');
        const id = newId('asm');
        const at = timestamp();
        const newTargets: Target[] = input.targets.map((t) => ({
          ...t,
          id: newId('tgt'),
          assessmentId: id,
        }));
        const newJourneys: Journey[] = input.journeys.map((j) => {
          const target = newTargets[j.targetIndex];
          if (!target) throw new Error(`Journey "${j.name}" refers to a missing target`);
          return {
            id: newId('jrn'),
            assessmentId: id,
            targetId: target.id,
            name: j.name,
            stageIds: [...new Set(j.steps.map((s) => s.stageId))],
            steps: j.steps.map((s, order) => ({ ...s, id: newId('stp'), order })),
          };
        });
        const totalSteps = newJourneys.reduce((n, j) => n + j.steps.length, 0);
        const assessment: Assessment = {
          id,
          organizationId: fixtures.organization.id,
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          status: 'running',
          targetIds: newTargets.map((t) => t.id),
          patternIds: input.patternIds,
          stageIds: input.stageIds,
          rulePackSetVersion: RULE_PACK_SET_VERSION,
          coverageGaps: [],
          progress: { completedSteps: 0, totalSteps },
          createdBy: currentUser().id,
          createdAt: at,
          updatedAt: at,
          startedAt: at,
        };
        const newArtifacts: Artifact[] = input.uploads.map((u) => ({
          id: newId('art'),
          assessmentId: id,
          kind: u.kind,
          uri: `sample://uploads/${u.fileName}`,
          mimeType: 'application/octet-stream',
          fileName: u.fileName,
          sizeBytes: u.sizeBytes,
          capturedAt: at,
        }));
        const run: AnalysisRun = {
          id: newId('run'),
          assessmentId: id,
          status: 'queued',
          rulePackSetVersion: RULE_PACK_SET_VERSION,
          startedAt: at,
          engines: ENGINE_ORDER.map((engine) => ({
            engine,
            status: 'pending',
            events: [],
            metrics: { itemsTotal: 0, itemsProcessed: 0, findingsRaised: 0 },
          })),
        };
        mutate((s) => {
          s.createdAssessments.push({
            assessment,
            targets: newTargets,
            journeys: newJourneys,
            artifacts: newArtifacts,
            run,
          });
        });
        return clone(assessment);
      },
      async listArtifacts(assessmentId) {
        await delay();
        return clone(artifacts().filter((a) => a.assessmentId === assessmentId));
      },
      async getArtifact(id) {
        await delay();
        const artifact = artifacts().find((a) => a.id === id);
        if (!artifact) throw new NotFoundError('Artifact', id);
        return clone(artifact);
      },
      async getLatestRun(assessmentId) {
        await delay();
        const run = runs()
          .filter((r) => r.assessmentId === assessmentId)
          .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0];
        return run ? clone(run) : null;
      },
      subscribeToRun(runId, onUpdate) {
        const run = runs().find((r) => r.id === runId);
        if (!run) throw new NotFoundError('Analysis run', runId);
        const isCreatedQueued = run.status === 'queued';
        const target = isCreatedQueued ? completeCreatedRun(run) : run;
        const frames = buildRunReplay(target);
        let index = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;

        const tick = () => {
          if (stopped) return;
          const frame = frames[index];
          if (!frame) return;
          onUpdate(clone(frame));
          index += 1;
          if (index < frames.length) {
            timer = setTimeout(tick, replayFrameMs);
          } else if (isCreatedQueued) {
            // Persist completion so the new assessment shows as finished afterwards.
            mutate((s) => {
              const entry = s.createdAssessments.find((c) => c.run.id === runId);
              if (!entry) return;
              entry.run = target;
              entry.assessment.status = 'in_review';
              entry.assessment.completedAt = target.completedAt ?? timestamp();
              entry.assessment.updatedAt = timestamp();
              entry.assessment.progress.completedSteps = entry.assessment.progress.totalSteps;
            });
          }
        };
        timer = setTimeout(tick, 0);
        return () => {
          stopped = true;
          if (timer) clearTimeout(timer);
        };
      },
    },

    findings: {
      async list(assessmentId, filter) {
        await delay();
        return clone(
          filterFindings(
            findings().filter((f) => f.assessmentId === assessmentId),
            filter,
          ),
        );
      },
      async get(id) {
        await delay();
        return clone(findFinding(id));
      },
      async getReview(findingId) {
        await delay();
        return clone(review(findingId));
      },
      async updateStatus(findingIds, to: FindingStatus, note): Promise<StatusUpdateResult> {
        await delay();
        const role = overlay().role;
        const actor = currentUser();
        const at = timestamp();
        const result: StatusUpdateResult = { updated: [], skipped: [] };
        const state = overlay();

        for (const id of findingIds) {
          const finding = findings().find((f) => f.id === id);
          if (!finding) {
            result.skipped.push({ findingId: id, reason: 'Finding not found' });
            continue;
          }
          const current = state.findingStatus[id]?.status ?? finding.status;
          const refusal = transitionRefusal(role, current, to);
          if (refusal) {
            result.skipped.push({ findingId: id, reason: refusal });
            continue;
          }
          state.findingStatus[id] = { status: to, updatedAt: at };
          const additions = (state.reviewAdditions[id] ??= { history: [], comments: [] });
          additions.history.push({
            id: newId('hst'),
            from: current,
            to,
            by: actor.id,
            at,
            ...(note?.trim() ? { note: note.trim() } : {}),
          });
          result.updated.push({ ...finding, status: to, updatedAt: at });
        }
        store.save(state);
        return clone(result);
      },
      async addComment(findingId, body) {
        await delay();
        const role = overlay().role;
        if (!canComment(role)) throw new PermissionError(`The ${role} role cannot comment.`);
        findFinding(findingId);
        const text = body.trim();
        if (text === '') throw new Error('Comment cannot be empty');
        const actor = currentUser();
        mutate((s) => {
          const additions = (s.reviewAdditions[findingId] ??= { history: [], comments: [] });
          additions.comments.push({ id: newId('cmt'), by: actor.id, at: timestamp(), body: text });
        });
        return clone(review(findingId));
      },
    },

    rules: {
      async listPacks() {
        await delay();
        return clone(rulePackBundle.packs);
      },
      async getPack(patternId) {
        await delay();
        return clone(getRulePack(patternId));
      },
      async getPackSetVersion() {
        await delay();
        return RULE_PACK_SET_VERSION;
      },
    },
  };

  const controls: SampleControls = {
    getRole: () => overlay().role,
    setRole: (role) => mutate((s) => void (s.role = role)),
    reset: () => {
      const role = overlay().role;
      store.clear();
      store.save(emptyOverlay(role));
    },
  };

  return { ...repositories, controls };
}
