import { getPatternInfo } from '@dpat/rules';
import { FINDING_STATUS_LABELS, SEVERITY_LABELS, SEVERITY_ORDER } from '@dpat/shared';

import { formatDate } from '@/lib/format';

import { ReportTable, SectionHeading } from '../report-primitives';
import type { ReportData } from '../report-types';

/** Open findings (excluding dismissed and closed) grouped by owning team. */
export function RemediationPlanSection({ data, number }: { data: ReportData; number: number }) {
  const open = data.findings.filter((f) => f.status !== 'dismissed' && f.status !== 'closed');
  const teams = [...new Set(open.map((f) => f.remediation.ownerTeam ?? 'Unassigned'))].sort();

  return (
    <>
      <SectionHeading number={number} title="Remediation plan" id="remediation" />
      <p className="mb-4 text-sm">
        {open.length} open findings across {teams.length} owning teams. Target dates are set when a
        finding is confirmed; findings still under review have no date yet.
      </p>
      <div className="space-y-6">
        {teams.map((team) => {
          const items = open
            .filter((f) => (f.remediation.ownerTeam ?? 'Unassigned') === team)
            .sort(
              (a, b) =>
                SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
                (a.remediation.targetDate ?? '9999').localeCompare(
                  b.remediation.targetDate ?? '9999',
                ),
            );
          return (
            <section key={team} className="print-avoid-break">
              <h3 className="mb-2 text-sm font-semibold">
                {team} <span className="font-normal text-muted-foreground">({items.length})</span>
              </h3>
              <ReportTable>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Action</th>
                    <th>Pattern</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Effort</th>
                    <th>Target date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono">{f.reference}</td>
                      <td>{f.remediation.guidance}</td>
                      <td>{getPatternInfo(f.patternId).name}</td>
                      <td>{SEVERITY_LABELS[f.severity]}</td>
                      <td>{FINDING_STATUS_LABELS[f.status]}</td>
                      <td className="capitalize">{f.remediation.effort}</td>
                      <td className="whitespace-nowrap">
                        {f.remediation.targetDate
                          ? formatDate(f.remediation.targetDate)
                          : 'Not set'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ReportTable>
            </section>
          );
        })}
      </div>
    </>
  );
}
