import { getPatternInfo } from '@dpat/rules';
import {
  deriveRiskSummary,
  FINDING_STATUS_LABELS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@dpat/shared';

import { SEVERITY_DOT } from '@/components/common/badges';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ReportTable, SectionHeading, SubHeading } from '../report-primitives';
import type { ReportData } from '../report-types';

const RATING_TEXT = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No open risk',
} as const;

export function ExecutiveSummarySection({ data, number }: { data: ReportData; number: number }) {
  const { kpis, findings, matrix } = data;
  const risk = deriveRiskSummary(findings);
  const nonCompliant = [
    ...new Set(matrix.cells.filter((c) => c.state === 'non_compliant').map((c) => c.patternId)),
  ];
  const priority = findings
    .filter(
      (f) =>
        (f.status === 'confirmed' || f.status === 'remediation_in_progress') &&
        (f.severity === 'critical' || f.severity === 'high'),
    )
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
        a.reference.localeCompare(b.reference),
    )
    .slice(0, 8);

  return (
    <>
      <SectionHeading number={number} title="Executive summary" id="executive-summary" />
      <p className="text-sm">
        The assessment reviewed {data.detail.targets.length} target(s) against{' '}
        {data.detail.assessment.patternIds.length} of the 13 specified dark patterns across{' '}
        {data.detail.assessment.stageIds.length} journey stages. It raised {kpis.totalFindings}{' '}
        findings, of which {kpis.confirmedOpen} are confirmed and open, {kpis.awaitingReview} await
        review and {kpis.openFindings} remain open overall. Overall open risk is rated{' '}
        <strong>{RATING_TEXT[risk.rating]}</strong>.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
        {[
          ['Total findings', String(kpis.totalFindings)],
          ['Confirmed, open', String(kpis.confirmedOpen)],
          ['Patterns non-compliant', `${kpis.patternsNonCompliant} of 13`],
          [
            'Remediated',
            kpis.remediationProgress === null ? 'n/a' : formatPercent(kpis.remediationProgress),
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <SubHeading>Open findings by severity</SubHeading>
      <ul className="flex flex-wrap gap-4 text-sm">
        {SEVERITY_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden className={cn('size-2 rounded-full', SEVERITY_DOT[s])} />
            {SEVERITY_LABELS[s]}: <strong className="tabular-nums">{risk.openBySeverity[s]}</strong>
          </li>
        ))}
      </ul>

      <SubHeading>Patterns with confirmed non-compliance</SubHeading>
      <p className="text-sm">
        {nonCompliant.length === 0
          ? 'None.'
          : nonCompliant.map((p) => getPatternInfo(p).name).join(', ')}
      </p>

      <SubHeading>Priority findings</SubHeading>
      {priority.length === 0 ? (
        <p className="text-sm">No confirmed critical or high findings are open.</p>
      ) : (
        <ReportTable>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Finding</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {priority.map((f) => (
              <tr key={f.id}>
                <td className="font-mono">{f.reference}</td>
                <td>{f.title}</td>
                <td>{SEVERITY_LABELS[f.severity]}</td>
                <td>{FINDING_STATUS_LABELS[f.status]}</td>
                <td>{f.remediation.ownerTeam ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      )}
    </>
  );
}
