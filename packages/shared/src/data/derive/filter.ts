import { SEVERITY_ORDER } from '../../domain/labels';
import type { Finding } from '../../schemas/finding';
import type { FindingFilter } from '../repositories';

function evidenceText(f: Finding): string {
  return f.evidence
    .map((e) =>
      e.kind === 'code_snippet' ? e.filePath : e.kind === 'config_excerpt' ? e.source : e.caption,
    )
    .join(' ');
}

export function matchesFindingFilter(f: Finding, filter: FindingFilter): boolean {
  if (filter.patternIds?.length && !filter.patternIds.includes(f.patternId)) return false;
  if (filter.stageIds?.length && !filter.stageIds.includes(f.stageId)) return false;
  if (filter.severities?.length && !filter.severities.includes(f.severity)) return false;
  if (filter.statuses?.length && !filter.statuses.includes(f.status)) return false;
  if (filter.engines?.length && !filter.engines.includes(f.engine)) return false;
  if (filter.targetIds?.length && !filter.targetIds.includes(f.targetId)) return false;
  if (filter.minConfidence !== undefined && f.confidence < filter.minConfidence) return false;
  if (filter.maxConfidence !== undefined && f.confidence > filter.maxConfidence) return false;
  const q = filter.search?.trim().toLowerCase();
  if (q) {
    const haystack = `${f.reference} ${f.title} ${f.summary} ${evidenceText(f)}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

/** Most severe first, then by reference. */
export function compareFindings(a: Finding, b: Finding): number {
  const bySeverity = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
  return bySeverity !== 0 ? bySeverity : a.reference.localeCompare(b.reference);
}

export function filterFindings(
  findings: readonly Finding[],
  filter: FindingFilter = {},
): Finding[] {
  return findings.filter((f) => matchesFindingFilter(f, filter)).sort(compareFindings);
}
