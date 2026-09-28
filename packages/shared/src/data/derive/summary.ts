import type { PatternId } from '@dpat/rules';

import { OPEN_STATUSES } from '../../domain/finding-workflow';
import { SEVERITY_ORDER } from '../../domain/labels';
import type { Engine, Severity } from '../../schemas/common';
import type { Finding } from '../../schemas/finding';
import type { RiskSummary } from '../repositories';
import type { ComplianceMatrix } from './matrix';

export function isOpen(finding: Finding): boolean {
  return OPEN_STATUSES.includes(finding.status);
}

export function deriveRiskSummary(findings: readonly Finding[]): RiskSummary {
  const openBySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const open = findings.filter(isOpen);
  for (const f of open) openBySeverity[f.severity] += 1;
  const rating = SEVERITY_ORDER.find((s) => openBySeverity[s] > 0) ?? 'none';
  return { openBySeverity, totalFindings: findings.length, openFindings: open.length, rating };
}

export interface AssessmentKpis {
  totalFindings: number;
  openFindings: number;
  /** Confirmed non-compliance still open (Confirmed or Remediation in Progress). */
  confirmedOpen: number;
  /** Detected or Under Review. */
  awaitingReview: number;
  criticalHighOpen: number;
  /** Patterns with at least one red cell, out of 13. */
  patternsNonCompliant: number;
  /** Closed ÷ (Confirmed + Remediation in Progress + Closed); null when nothing is confirmed. */
  remediationProgress: number | null;
}

export function deriveKpis(findings: readonly Finding[], matrix: ComplianceMatrix): AssessmentKpis {
  const count = (pred: (f: Finding) => boolean) => findings.filter(pred).length;
  const confirmedOpen = count(
    (f) => f.status === 'confirmed' || f.status === 'remediation_in_progress',
  );
  const closed = count((f) => f.status === 'closed');
  const nonCompliant = new Set(
    matrix.cells.filter((c) => c.state === 'non_compliant').map((c) => c.patternId),
  );
  return {
    totalFindings: findings.length,
    openFindings: count(isOpen),
    confirmedOpen,
    awaitingReview: count((f) => f.status === 'detected' || f.status === 'under_review'),
    criticalHighOpen: count(
      (f) => isOpen(f) && (f.severity === 'critical' || f.severity === 'high'),
    ),
    patternsNonCompliant: nonCompliant.size,
    remediationProgress: confirmedOpen + closed === 0 ? null : closed / (confirmedOpen + closed),
  };
}

/** Counts findings by a key, keeping zero entries for every key in `keys` (chart-friendly). */
export function countBy<K extends string>(
  findings: readonly Finding[],
  key: (f: Finding) => K,
  keys: readonly K[],
): Record<K, number> {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const f of findings) {
    const k = key(f);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

export const findingSeverity = (f: Finding): Severity => f.severity;
export const findingEngine = (f: Finding): Engine => f.engine;
export const findingPattern = (f: Finding): PatternId => f.patternId;
