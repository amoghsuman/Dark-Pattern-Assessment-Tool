import { PATTERN_IDS, type PatternId } from '@dpat/rules';

import { SEVERITY_ORDER } from '../../domain/labels';
import type { AnalysisRun } from '../../schemas/analysis';
import type { Assessment, Journey, Target } from '../../schemas/assessment';
import type { FindingStatus, MatrixCellState, Severity } from '../../schemas/common';
import type { Finding } from '../../schemas/finding';
import type { JourneyStage } from '../../schemas/organization';

export type MatrixCellMarker = 'awaiting_review' | 'remediated' | null;

export interface MatrixCell {
  patternId: PatternId;
  stageId: string;
  state: MatrixCellState;
  /** "Awaiting review" (all findings Detected) or "Remediated" (all findings Closed). */
  marker: MatrixCellMarker;
  findingIds: string[];
  statusCounts: Partial<Record<FindingStatus, number>>;
  highestSeverity: Severity | null;
  /** Why the cell is not assessed, when it falls in a coverage gap or outside scope. */
  notAssessedReason: string | null;
}

export interface ComplianceMatrix {
  patternIds: PatternId[];
  stages: JourneyStage[];
  cells: MatrixCell[];
}

export interface MatrixInput {
  assessment: Assessment;
  /** The organisation's configured stages; columns follow their `order`. */
  stages: JourneyStage[];
  journeys: Journey[];
  targets: Target[];
  findings: Finding[];
  run: AnalysisRun | null;
}

const OPEN_REVIEW: readonly FindingStatus[] = [
  'detected',
  'under_review',
  'remediation_in_progress',
];

export function highestSeverity(findings: readonly Finding[]): Severity | null {
  for (const severity of SEVERITY_ORDER) {
    if (findings.some((f) => f.severity === severity)) return severity;
  }
  return null;
}

/**
 * Colour rules (approved 2026-09-29):
 * - red (non_compliant): any finding Confirmed.
 * - yellow (in_progress): otherwise any Detected, Under Review or Remediation in Progress.
 *   Marker "Awaiting review" when every finding is Detected: unreviewed AI output is never red.
 * - green (compliant): findings exist and all are Dismissed or Closed (marker "Remediated" when
 *   all are Closed), or no findings and the cell was in scope, covered and the run completed.
 * - grey (not_assessed): everything else.
 * Mixed cells therefore take the most severe colour present (red > yellow > green).
 */
export function deriveCellState(
  findings: readonly Finding[],
  assessed: boolean,
): { state: MatrixCellState; marker: MatrixCellMarker } {
  if (findings.length === 0) {
    return { state: assessed ? 'compliant' : 'not_assessed', marker: null };
  }
  const statuses = findings.map((f) => f.status);
  if (statuses.includes('confirmed')) return { state: 'non_compliant', marker: null };
  if (statuses.some((s) => OPEN_REVIEW.includes(s))) {
    return {
      state: 'in_progress',
      marker: statuses.every((s) => s === 'detected') ? 'awaiting_review' : null,
    };
  }
  return {
    state: 'compliant',
    marker: statuses.every((s) => s === 'closed') ? 'remediated' : null,
  };
}

export function deriveMatrix(input: MatrixInput): ComplianceMatrix {
  const { assessment, journeys, targets, findings, run } = input;
  const stages = [...input.stages].sort((a, b) => a.order - b.order);
  const runComplete = run?.status === 'succeeded';
  const hasCodeTarget = targets.some((t) => t.type === 'code_repository');
  const coveredByJourney = new Set(journeys.flatMap((j) => j.stageIds));

  const cells: MatrixCell[] = [];
  for (const patternId of PATTERN_IDS) {
    for (const stage of stages) {
      const cellFindings = findings.filter(
        (f) => f.patternId === patternId && f.stageId === stage.id,
      );
      const gap = assessment.coverageGaps.find(
        (g) =>
          g.stageId === stage.id &&
          (g.patternIds === undefined || g.patternIds.includes(patternId)),
      );

      let notAssessedReason: string | null = null;
      if (!assessment.patternIds.includes(patternId)) notAssessedReason = 'Pattern not in scope';
      else if (!assessment.stageIds.includes(stage.id))
        notAssessedReason = 'Journey stage not in scope';
      else if (gap) notAssessedReason = gap.reason;
      else if (!coveredByJourney.has(stage.id) && !hasCodeTarget) {
        notAssessedReason = 'No journey or code target covers this stage';
      } else if (!runComplete) notAssessedReason = 'Analysis still running';

      const { state, marker } = deriveCellState(cellFindings, notAssessedReason === null);
      const statusCounts: Partial<Record<FindingStatus, number>> = {};
      for (const f of cellFindings) statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;

      cells.push({
        patternId,
        stageId: stage.id,
        state,
        marker,
        findingIds: cellFindings.map((f) => f.id),
        statusCounts,
        highestSeverity: highestSeverity(cellFindings),
        notAssessedReason: state === 'not_assessed' ? notAssessedReason : null,
      });
    }
  }
  return { patternIds: [...PATTERN_IDS], stages, cells };
}

export function getMatrixCell(
  matrix: ComplianceMatrix,
  patternId: PatternId,
  stageId: string,
): MatrixCell | undefined {
  return matrix.cells.find((c) => c.patternId === patternId && c.stageId === stageId);
}
