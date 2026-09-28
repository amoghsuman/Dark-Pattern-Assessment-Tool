import type { RulePack } from '@dpat/rules';

import {
  FINDING_STATUS_LABELS,
  MATRIX_CELL_STATE_LABELS,
  SEVERITY_LABELS,
} from '../../domain/labels';
import type { Finding } from '../../schemas/finding';
import type { ComplianceMatrix } from './matrix';

/** One row per pattern × journey stage, for the Excel risk register. */
export interface RiskRegisterRow {
  patternName: string;
  guidelineClause: string;
  rulePackId: string;
  rulePackVersion: string;
  stageName: string;
  complianceState: string;
  marker: string;
  findingCount: number;
  openCount: number;
  highestSeverity: string;
  statusBreakdown: string;
  findingReferences: string;
  remediationOwners: string;
  earliestTargetDate: string;
  notes: string;
}

const MARKER_LABELS = { awaiting_review: 'Awaiting review', remediated: 'Remediated' } as const;

export function deriveRiskRegister(
  matrix: ComplianceMatrix,
  findings: readonly Finding[],
  packs: readonly RulePack[],
): RiskRegisterRow[] {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const rows: RiskRegisterRow[] = [];

  for (const patternId of matrix.patternIds) {
    const pack = packs.find((p) => p.pattern_id === patternId);
    for (const stage of matrix.stages) {
      const cell = matrix.cells.find((c) => c.patternId === patternId && c.stageId === stage.id);
      if (!cell) continue;
      const cellFindings = cell.findingIds.flatMap((id) => byId.get(id) ?? []);
      const open = cellFindings.filter((f) => f.status !== 'dismissed' && f.status !== 'closed');
      const owners = [...new Set(open.flatMap((f) => f.remediation.ownerTeam ?? []))].sort();
      const dates = open.flatMap((f) => f.remediation.targetDate ?? []).sort();

      rows.push({
        patternName: pack?.name ?? patternId,
        guidelineClause: pack?.guideline_reference.clause ?? '',
        rulePackId: pack?.id ?? '',
        rulePackVersion: pack?.version ?? '',
        stageName: stage.name,
        complianceState: MATRIX_CELL_STATE_LABELS[cell.state],
        marker: cell.marker ? MARKER_LABELS[cell.marker] : '',
        findingCount: cellFindings.length,
        openCount: open.length,
        highestSeverity: cell.highestSeverity ? SEVERITY_LABELS[cell.highestSeverity] : '',
        statusBreakdown: Object.entries(cell.statusCounts)
          .map(
            ([status, n]) =>
              `${FINDING_STATUS_LABELS[status as keyof typeof FINDING_STATUS_LABELS]}: ${n}`,
          )
          .join('; '),
        findingReferences: cellFindings.map((f) => f.reference).join(', '),
        remediationOwners: owners.join(', '),
        earliestTargetDate: dates[0] ?? '',
        notes: cell.notAssessedReason ?? '',
      });
    }
  }
  return rows;
}
