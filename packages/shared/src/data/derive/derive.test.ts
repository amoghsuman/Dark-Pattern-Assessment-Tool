import { rulePackBundle } from '@dpat/rules';
import { describe, expect, it } from 'vitest';

import type { FindingStatus, Severity } from '../../schemas/common';
import type { Finding } from '../../schemas/finding';
import { loadSampleFixtures } from '../sample/fixtures';
import { filterFindings } from './filter';
import { deriveCellState, deriveMatrix, getMatrixCell, highestSeverity } from './matrix';
import { deriveRiskRegister } from './risk-register';
import { buildRunReplay } from './run-replay';
import { countBy, deriveKpis, deriveRiskSummary, findingSeverity } from './summary';

const fx = loadSampleFixtures();
const base = fx.findings[0]!;
const make = (
  status: FindingStatus,
  severity: Severity = 'medium',
  extra: Partial<Finding> = {},
): Finding => ({
  ...base,
  id: `${status}-${severity}-${Math.random()}`,
  status,
  severity,
  ...extra,
});

describe('deriveCellState', () => {
  it('is red when any finding is confirmed', () => {
    expect(deriveCellState([make('confirmed'), make('dismissed'), make('detected')], true)).toEqual(
      {
        state: 'non_compliant',
        marker: null,
      },
    );
  });

  it('never shows unreviewed findings as red: all detected is yellow "awaiting review"', () => {
    expect(deriveCellState([make('detected', 'critical'), make('detected')], true)).toEqual({
      state: 'in_progress',
      marker: 'awaiting_review',
    });
  });

  it('is yellow without a marker for mixed open statuses', () => {
    expect(deriveCellState([make('detected'), make('under_review')], true)).toEqual({
      state: 'in_progress',
      marker: null,
    });
    expect(deriveCellState([make('remediation_in_progress'), make('closed')], true).state).toBe(
      'in_progress',
    );
  });

  it('is green "remediated" when every finding is closed', () => {
    expect(deriveCellState([make('closed'), make('closed')], true)).toEqual({
      state: 'compliant',
      marker: 'remediated',
    });
  });

  it('is plain green when findings are dismissed (or mixed dismissed and closed)', () => {
    expect(deriveCellState([make('dismissed')], true)).toEqual({
      state: 'compliant',
      marker: null,
    });
    expect(deriveCellState([make('dismissed'), make('closed')], true)).toEqual({
      state: 'compliant',
      marker: null,
    });
  });

  it('depends on assessment coverage when there are no findings', () => {
    expect(deriveCellState([], true).state).toBe('compliant');
    expect(deriveCellState([], false).state).toBe('not_assessed');
  });
});

describe('deriveMatrix', () => {
  const running = fx.assessments.find((a) => a.id === 'asm-renewal-prelaunch')!;
  const matrix = deriveMatrix({
    assessment: running,
    stages: fx.organization.journeyStages,
    journeys: fx.journeys.filter((j) => j.assessmentId === running.id),
    targets: fx.targets.filter((t) => t.assessmentId === running.id),
    findings: fx.findings.filter((f) => f.assessmentId === running.id),
    run: fx.analysisRuns.find((r) => r.assessmentId === running.id) ?? null,
  });

  it('orders columns by stage order and rows in Annexure order', () => {
    expect(matrix.stages.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(matrix.patternIds[0]).toBe('false_urgency');
    expect(matrix.patternIds.at(-1)).toBe('rogue_malware');
  });

  it('leaves cells without findings grey while the run is still going', () => {
    const cell = getMatrixCell(matrix, 'nagging', 'stg-renewal');
    expect(cell?.state).toBe('not_assessed');
    expect(cell?.notAssessedReason).toBe('Analysis still running');
  });

  it('colours cells with findings even while running', () => {
    expect(getMatrixCell(matrix, 'false_urgency', 'stg-renewal')).toMatchObject({
      state: 'in_progress',
      marker: 'awaiting_review',
    });
  });

  it('explains out-of-scope cells', () => {
    expect(getMatrixCell(matrix, 'rogue_malware', 'stg-renewal')?.notAssessedReason).toBe(
      'Pattern not in scope',
    );
    expect(getMatrixCell(matrix, 'false_urgency', 'stg-claims')?.notAssessedReason).toBe(
      'Journey stage not in scope',
    );
  });
});

describe('summaries', () => {
  const findings = [
    make('confirmed', 'critical'),
    make('detected', 'high'),
    make('dismissed', 'critical'),
    make('closed', 'low'),
    make('remediation_in_progress', 'medium'),
  ];

  it('counts only open findings towards the risk rating', () => {
    const risk = deriveRiskSummary(findings);
    expect(risk.openBySeverity).toEqual({ critical: 1, high: 1, medium: 1, low: 0 });
    expect(risk.rating).toBe('critical');
    expect(risk.openFindings).toBe(3);
    expect(deriveRiskSummary([make('dismissed', 'critical')]).rating).toBe('none');
  });

  it('computes KPIs', () => {
    const matrix = { patternIds: [], stages: [], cells: [] };
    expect(deriveKpis(findings, matrix)).toMatchObject({
      totalFindings: 5,
      openFindings: 3,
      confirmedOpen: 2,
      awaitingReview: 1,
      criticalHighOpen: 2,
      remediationProgress: 1 / 3,
    });
  });

  it('finds the highest severity and counts with zero entries', () => {
    expect(highestSeverity(findings)).toBe('critical');
    expect(highestSeverity([])).toBeNull();
    expect(
      countBy([make('detected', 'low')], findingSeverity, ['critical', 'high', 'medium', 'low']),
    ).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 1,
    });
  });
});

describe('filterFindings', () => {
  const h1 = fx.findings.filter((f) => f.assessmentId === 'asm-digital-h1');

  it('sorts most severe first', () => {
    const sorted = filterFindings(h1);
    expect(sorted[0]?.severity).toBe('critical');
    expect(sorted.at(-1)?.severity).toBe('low');
  });

  it('combines filters', () => {
    const result = filterFindings(h1, { patternIds: ['nagging'], engines: ['screen_capture'] });
    expect(result.map((f) => f.reference).sort()).toEqual(['ELI-2026-030', 'ELI-2026-031']);
  });

  it('filters by confidence range', () => {
    const result = filterFindings(h1, { minConfidence: 0.95 });
    expect(result.every((f) => f.confidence >= 0.95)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('searches reference, title and evidence file paths', () => {
    expect(filterFindings(h1, { search: 'eli-2026-025' })).toHaveLength(1);
    expect(filterFindings(h1, { search: 'PremiumCalculator' }).map((f) => f.reference)).toEqual([
      'ELI-2026-025',
    ]);
  });
});

describe('deriveRiskRegister', () => {
  it('produces one row per pattern and stage', () => {
    const assessment = fx.assessments[0]!;
    const findings = fx.findings.filter((f) => f.assessmentId === assessment.id);
    const matrix = deriveMatrix({
      assessment,
      stages: fx.organization.journeyStages,
      journeys: fx.journeys.filter((j) => j.assessmentId === assessment.id),
      targets: fx.targets.filter((t) => t.assessmentId === assessment.id),
      findings,
      run: fx.analysisRuns[0]!,
    });
    const rows = deriveRiskRegister(matrix, findings, rulePackBundle.packs);
    expect(rows).toHaveLength(117);
    const drip = rows.find((r) => r.patternName === 'Drip Pricing' && r.stageName === 'Payment');
    expect(drip).toMatchObject({
      complianceState: 'Non-compliant',
      findingReferences: 'ELI-2026-024, ELI-2026-025',
      highestSeverity: 'Critical',
      guidelineClause: 'Guideline 4 read with Annexure 1, item 8',
    });
  });
});

describe('buildRunReplay', () => {
  it('starts with every engine pending and ends at the final run', () => {
    const run = fx.analysisRuns[0]!;
    const frames = buildRunReplay(run);
    expect(frames[0]?.engines.every((e) => e.status === 'pending')).toBe(true);
    expect(frames.at(-1)).toEqual(run);
    const eventCount = run.engines.reduce((n, e) => n + e.events.length, 0);
    expect(frames.length).toBe(1 + run.engines.length + eventCount + 1);
  });

  it('never shows more events than the final run and keeps engine order', () => {
    const run = fx.analysisRuns[1]!;
    for (const frame of buildRunReplay(run)) {
      frame.engines.forEach((e, i) => {
        expect(e.engine).toBe(run.engines[i]?.engine);
        expect(e.events.length).toBeLessThanOrEqual(run.engines[i]?.events.length ?? 0);
      });
    }
    expect(buildRunReplay(run).at(-1)?.engines[2]?.status).toBe('pending');
  });
});
