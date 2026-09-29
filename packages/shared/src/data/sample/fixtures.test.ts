import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getRulePack, RULE_PACK_SET_VERSION } from '@dpat/rules';
import { describe, expect, it } from 'vitest';

import { isValidTransition } from '../../domain/finding-workflow';
import { deriveMatrix } from '../derive/matrix';
import { loadSampleFixtures, SYSTEM_USER_ID } from './fixtures';

const fx = loadSampleFixtures();
const PUBLIC_DIR = fileURLToPath(new URL('../../../../../apps/web/public', import.meta.url));

const ids = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id));
const stageIds = ids(fx.organization.journeyStages);
const userIds = ids(fx.users);
const assessmentById = new Map(fx.assessments.map((a) => [a.id, a]));
const targetById = new Map(fx.targets.map((t) => [t.id, t]));
const artifactById = new Map(fx.artifacts.map((a) => [a.id, a]));
const findingById = new Map(fx.findings.map((f) => [f.id, f]));
const steps = fx.journeys.flatMap((j) => j.steps.map((s) => ({ ...s, journey: j })));
const stepById = new Map(steps.map((s) => [s.id, s]));

describe('sample fixtures', () => {
  it('parse against the domain schemas', () => {
    expect(fx.organization.name).toBe('Example Life Insurance');
    expect(fx.organization.journeyStages).toHaveLength(9);
    expect(fx.assessments).toHaveLength(2);
  });

  it('use unique IDs across every collection', () => {
    const all = [
      ...fx.users,
      ...fx.assessments,
      ...fx.targets,
      ...fx.journeys,
      ...steps,
      ...fx.artifacts,
      ...fx.analysisRuns,
      ...fx.findings,
      ...fx.findings.flatMap((f) => f.evidence),
    ].map((x) => x.id);
    expect(new Set(all).size).toBe(all.length);
    const refs = fx.findings.map((f) => f.reference);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('link assessments, targets, journeys and artifacts consistently', () => {
    for (const a of fx.assessments) {
      expect(a.rulePackSetVersion).toBe(RULE_PACK_SET_VERSION);
      for (const s of a.stageIds) expect(stageIds.has(s)).toBe(true);
      for (const g of a.coverageGaps) expect(a.stageIds).toContain(g.stageId);
      for (const t of a.targetIds) expect(targetById.get(t)?.assessmentId).toBe(a.id);
      expect(userIds.has(a.createdBy)).toBe(true);
    }
    for (const j of fx.journeys) {
      expect(targetById.get(j.targetId)?.assessmentId).toBe(j.assessmentId);
      for (const s of j.steps) {
        expect(j.stageIds).toContain(s.stageId);
        if (s.screenArtifactId) {
          const art = artifactById.get(s.screenArtifactId);
          expect(art?.journeyStepId).toBe(s.id);
          expect(art?.assessmentId).toBe(j.assessmentId);
        }
      }
    }
    for (const art of fx.artifacts) {
      expect(assessmentById.has(art.assessmentId)).toBe(true);
      if (art.targetId) expect(targetById.get(art.targetId)?.assessmentId).toBe(art.assessmentId);
      if (art.journeyStepId) expect(stepById.get(art.journeyStepId)?.screenArtifactId).toBe(art.id);
      if (art.kind === 'screenshot') expect(existsSync(`${PUBLIC_DIR}${art.uri}`)).toBe(true);
    }
  });

  it('link every finding to its assessment, target, stage, rule pack and evidence', () => {
    for (const f of fx.findings) {
      const assessment = assessmentById.get(f.assessmentId);
      expect(assessment, f.reference).toBeDefined();
      expect(assessment?.patternIds).toContain(f.patternId);
      expect(assessment?.stageIds).toContain(f.stageId);
      expect(targetById.get(f.targetId)?.assessmentId).toBe(f.assessmentId);
      expect(fx.analysisRuns.find((r) => r.id === f.analysisRunId)?.assessmentId).toBe(
        f.assessmentId,
      );

      const pack = getRulePack(f.patternId);
      expect(f.rulePackId).toBe(pack.id);
      expect(f.rulePackVersion).toBe(pack.version);
      const criteria = new Set(pack.violation_criteria.map((c) => c.id));
      for (const c of f.violationCriterionIds)
        expect(criteria.has(c), `${f.reference} ${c}`).toBe(true);

      if (f.journeyStepId) {
        const step = stepById.get(f.journeyStepId);
        expect(step?.journey.assessmentId).toBe(f.assessmentId);
        expect(step?.stageId).toBe(f.stageId);
      }
      for (const e of f.evidence) {
        if (e.kind !== 'screenshot') continue;
        expect(artifactById.get(e.artifactId)?.assessmentId).toBe(f.assessmentId);
        for (const b of e.boxes) {
          if (b.criterionId) expect(f.violationCriterionIds).toContain(b.criterionId);
        }
      }
      for (const c of f.correlatedFindingIds) {
        const other = findingById.get(c);
        expect(other?.assessmentId).toBe(f.assessmentId);
        expect(other?.correlatedFindingIds).toContain(f.id);
      }
      const gap = assessment?.coverageGaps.find(
        (g) => g.stageId === f.stageId && (!g.patternIds || g.patternIds.includes(f.patternId)),
      );
      expect(gap, `${f.reference} falls inside a coverage gap`).toBeUndefined();
    }
  });

  it('link assessment inputs: credentials, test data, builds, source and configuration', () => {
    const testDataIds = new Set(fx.testDataSets.map((t) => t.id));
    for (const t of fx.targets) {
      const artifact = (id: string) => artifactById.get(id);
      switch (t.type) {
        case 'website':
          for (const c of t.credentials) expect(c.storage).toBe('vault');
          for (const id of t.testDataSetIds) expect(testDataIds.has(id), id).toBe(true);
          if (t.otpHandling.mode === 'live_assessor_entry')
            expect(userIds.has(t.otpHandling.assessorUserId)).toBe(true);
          break;
        case 'mobile_app': {
          if (!t.buildArtifactId) break;
          const build = artifact(t.buildArtifactId);
          expect(build?.assessmentId).toBe(t.assessmentId);
          expect(build?.targetId).toBe(t.id);
          expect(['apk', 'aab', 'ipa']).toContain(build?.kind);
          if (t.platform === 'ios') expect(t.decryptedBuild).toBe(true);
          break;
        }
        case 'code_repository': {
          if (t.source.kind === 'archive') {
            expect(artifact(t.source.artifactId)?.kind).toBe('source_archive');
            break;
          }
          const { commitSha } = t.source;
          for (const f of fx.findings.filter((x) => x.targetId === t.id)) {
            for (const e of f.evidence) {
              if (e.kind === 'code_snippet' && e.commitSha)
                expect(commitSha.startsWith(e.commitSha), f.reference).toBe(true);
            }
          }
          break;
        }
        case 'backend_config':
          for (const id of t.configArtifactIds) {
            const a = artifact(id);
            expect(a?.kind).toBe('config_file');
            expect(a?.targetId).toBe(t.id);
          }
          break;
      }
    }
  });

  it('tag manual captures to a journey and stage of their assessment', () => {
    const manual = fx.artifacts.filter((a) => a.origin === 'manual_capture');
    expect(manual.length).toBeGreaterThan(0);
    for (const a of manual) {
      expect(assessmentById.get(a.assessmentId)?.stageIds).toContain(a.stageId);
      if (a.journeyId)
        expect(fx.journeys.find((j) => j.id === a.journeyId)?.assessmentId).toBe(a.assessmentId);
    }
  });

  it('record a client access checklist that matches the inputs', () => {
    for (const a of fx.assessments) {
      const ids = a.clientAccess.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      const outstanding = a.clientAccess.some((c) => c.status === 'outstanding');
      expect(a.launchedWithOutstanding ?? false).toBe(outstanding);
    }
    const h1 = assessmentById.get('asm-digital-h1')!;
    const configTypes = fx.artifacts
      .filter((x) => x.assessmentId === h1.id && x.kind === 'config_file')
      .map((x) => x.configType);
    for (const type of [
      'notification_schedule',
      'pricing_rules',
      'cms_export',
      'feature_flags',
      'communication_template',
    ]) {
      expect(configTypes).toContain(type);
      expect(h1.clientAccess.find((c) => c.id === `config-${type}`)?.status).toBe('provided');
    }
  });

  it('spread findings across every status, severity, engine and pattern', () => {
    const h1 = fx.findings.filter((f) => f.assessmentId === 'asm-digital-h1');
    expect(new Set(h1.map((f) => f.status)).size).toBe(6);
    expect(new Set(h1.map((f) => f.severity)).size).toBe(4);
    expect(new Set(h1.map((f) => f.engine)).size).toBe(4);
    expect(new Set(h1.map((f) => f.patternId)).size).toBe(13);
    const kinds = new Set(h1.flatMap((f) => f.evidence.map((e) => e.kind)));
    expect(kinds).toEqual(new Set(['screenshot', 'code_snippet', 'config_excerpt']));
  });

  it('have exactly one valid review history per finding, ending at the current status', () => {
    expect(fx.reviews).toHaveLength(fx.findings.length);
    for (const r of fx.reviews) {
      const f = findingById.get(r.findingId);
      expect(f).toBeDefined();
      const [first, ...rest] = r.history;
      expect(first?.from).toBeNull();
      expect(first?.to).toBe('detected');
      let previous = first;
      for (const h of rest) {
        expect(h.from).toBe(previous?.to);
        expect(
          isValidTransition(h.from ?? 'detected', h.to),
          `${f?.reference} ${h.from}→${h.to}`,
        ).toBe(true);
        expect(h.at >= (previous?.at ?? '')).toBe(true);
        previous = h;
      }
      expect(r.history.at(-1)?.to).toBe(f?.status);
      for (const h of r.history) expect(h.by === SYSTEM_USER_ID || userIds.has(h.by)).toBe(true);
      for (const c of r.comments) expect(userIds.has(c.by)).toBe(true);
    }
  });

  it('report engine finding counts that match the findings', () => {
    for (const run of fx.analysisRuns) {
      for (const e of run.engines) {
        if (e.status !== 'succeeded' || e.engine === 'correlation') continue;
        const n = fx.findings.filter(
          (f) => f.analysisRunId === run.id && f.engine === e.engine,
        ).length;
        expect(e.metrics.findingsRaised, `${run.id} ${e.engine}`).toBe(n);
      }
    }
  });

  it('produce every matrix colour and marker for the completed assessment', () => {
    const assessment = assessmentById.get('asm-digital-h1')!;
    const matrix = deriveMatrix({
      assessment,
      stages: fx.organization.journeyStages,
      journeys: fx.journeys.filter((j) => j.assessmentId === assessment.id),
      targets: fx.targets.filter((t) => t.assessmentId === assessment.id),
      findings: fx.findings.filter((f) => f.assessmentId === assessment.id),
      run: fx.analysisRuns.find((r) => r.assessmentId === assessment.id) ?? null,
    });
    const states = new Set(matrix.cells.map((c) => c.state));
    expect(states).toEqual(new Set(['non_compliant', 'in_progress', 'compliant', 'not_assessed']));
    const markers = new Set(matrix.cells.map((c) => c.marker));
    expect(markers).toContain('awaiting_review');
    expect(markers).toContain('remediated');
    expect(matrix.cells).toHaveLength(13 * 9);
  });
});
