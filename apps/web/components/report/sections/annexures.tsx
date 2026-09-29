import { getPatternInfo } from '@dpat/rules';
import {
  FINDING_STATUS_LABELS,
  MATRIX_CELL_STATE_LABELS,
  SEVERITY_LABELS,
  type FindingStatus,
  type MatrixCellState,
} from '@dpat/shared';

import { STATE_DESCRIPTIONS } from '@/components/matrix/matrix-style';

import { ReportTable, SectionHeading, SubHeading } from '../report-primitives';
import type { ReportData } from '../report-types';

const STATUS_DEFINITIONS: Record<FindingStatus, string> = {
  detected: 'Raised by an analysis engine; not yet reviewed.',
  under_review: 'Being verified by an assessor.',
  confirmed: 'Verified by a reviewer as meeting the violation criteria.',
  dismissed: 'Reviewed and found not to be a violation (for example, an exclusion applies).',
  remediation_in_progress: 'Confirmed; a fix is being implemented.',
  closed: 'Fix implemented and verified by retest.',
};

export function AnnexuresSection({ data, number }: { data: ReportData; number: number }) {
  const stageName = new Map(data.stages.map((s) => [s.id, s.name]));
  return (
    <>
      <SectionHeading number={number} title="Annexures" id="annexures" />

      <SubHeading>A. Rule pack versions</SubHeading>
      <p className="mb-2 text-xs text-muted-foreground">
        Rule pack set {data.detail.assessment.rulePackSetVersion}. All packs are drafts, pending
        compliance review.
      </p>
      <ReportTable>
        <thead>
          <tr>
            <th>Item</th>
            <th>Pattern</th>
            <th>Rule pack</th>
            <th>Version</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.packs.map((p) => (
            <tr key={p.id}>
              <td>{getPatternInfo(p.pattern_id).annexureItem}</td>
              <td>{p.name}</td>
              <td className="font-mono">{p.id}</td>
              <td>{p.version}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>

      <SubHeading>B. Finding index</SubHeading>
      <ReportTable>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Pattern</th>
            <th>Stage</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Rule pack</th>
          </tr>
        </thead>
        <tbody>
          {[...data.findings]
            .sort((a, b) => a.reference.localeCompare(b.reference))
            .map((f) => (
              <tr key={f.id}>
                <td className="font-mono">{f.reference}</td>
                <td>{getPatternInfo(f.patternId).name}</td>
                <td>{stageName.get(f.stageId)}</td>
                <td>{SEVERITY_LABELS[f.severity]}</td>
                <td>{FINDING_STATUS_LABELS[f.status]}</td>
                <td className="font-mono">
                  {f.rulePackId} v{f.rulePackVersion}
                </td>
              </tr>
            ))}
        </tbody>
      </ReportTable>

      <SubHeading>C. Definitions</SubHeading>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 print:grid-cols-2">
        {(Object.keys(STATUS_DEFINITIONS) as FindingStatus[]).map((s) => (
          <div key={s}>
            <dt className="font-medium">{FINDING_STATUS_LABELS[s]}</dt>
            <dd className="text-muted-foreground">{STATUS_DEFINITIONS[s]}</dd>
          </div>
        ))}
        {(Object.keys(STATE_DESCRIPTIONS) as MatrixCellState[]).map((s) => (
          <div key={s}>
            <dt className="font-medium">Matrix: {MATRIX_CELL_STATE_LABELS[s]}</dt>
            <dd className="text-muted-foreground">{STATE_DESCRIPTIONS[s]}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
