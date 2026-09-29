import { getPatternInfo } from '@dpat/rules';
import { ENGINE_LABELS, ENGINE_ORDER, TARGET_TYPE_LABELS } from '@dpat/shared';

import { targetDetail } from '@/components/common/target-icon';

import { ReportTable, SectionHeading, SubHeading } from '../report-primitives';
import type { ReportData } from '../report-types';

const ENGINE_METHODS = {
  screen_capture:
    'Scripted journeys are run and each captured screen is checked against the screen signals and review rubric of every pattern in scope.',
  code_analysis:
    'Front-end and app source is searched for code signals and the deterministic checks defined in each rule pack.',
  backend_logic:
    'Pricing, notification, billing, catalogue and API configuration is reviewed for backend signals.',
  software_risk: 'App packages are inspected for SDKs, permissions and risky components.',
  correlation:
    'Findings from different engines that describe the same issue are linked for review.',
} as const;

export function ScopeMethodologySection({ data, number }: { data: ReportData; number: number }) {
  const { assessment, targets, journeys } = data.detail;
  const stagesInScope = data.stages.filter((s) => assessment.stageIds.includes(s.id));

  return (
    <>
      <SectionHeading number={number} title="Scope and methodology" id="scope" />
      <SubHeading>Targets</SubHeading>
      <ReportTable>
        <thead>
          <tr>
            <th>Target</th>
            <th>Type</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{TARGET_TYPE_LABELS[t.type]}</td>
              <td className="break-all">{targetDetail(t)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>

      <SubHeading>Journeys</SubHeading>
      <ReportTable>
        <thead>
          <tr>
            <th>Journey</th>
            <th>Steps</th>
            <th>Screens captured</th>
            <th>Stages</th>
          </tr>
        </thead>
        <tbody>
          {journeys.map((j) => (
            <tr key={j.id}>
              <td>{j.name}</td>
              <td>{j.steps.length}</td>
              <td>{j.steps.filter((s) => s.action === 'capture').length}</td>
              <td>
                {data.stages
                  .filter((s) => j.stageIds.includes(s.id))
                  .map((s) => s.name)
                  .join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </ReportTable>

      <SubHeading>Patterns and journey stages in scope</SubHeading>
      <p className="text-sm">
        Patterns:{' '}
        {assessment.patternIds.length === 13
          ? 'all 13 specified dark patterns'
          : assessment.patternIds.map((p) => getPatternInfo(p).name).join(', ')}
        .
      </p>
      <p className="mt-1 text-sm">Journey stages: {stagesInScope.map((s) => s.name).join(', ')}.</p>

      {assessment.coverageGaps.length > 0 ? (
        <>
          <SubHeading>Exclusions and deferred coverage</SubHeading>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {assessment.coverageGaps.map((g) => (
              <li key={g.stageId}>
                <strong>{data.stages.find((s) => s.id === g.stageId)?.name}</strong>
                {g.patternIds ? ` (${g.patternIds.length} patterns)` : ' (all patterns)'}:{' '}
                {g.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <SubHeading>Method</SubHeading>
      <ul className="space-y-1.5 text-sm">
        {ENGINE_ORDER.map((e) => (
          <li key={e}>
            <strong>{ENGINE_LABELS[e]}.</strong> {ENGINE_METHODS[e]}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        Every finding cites the rule pack and version it was raised under, the violation criteria
        met and its evidence. Findings move through a review workflow: Detected, Under Review, then
        Confirmed or Dismissed; confirmed findings move to Remediation in Progress and Closed after
        a successful retest. Only reviewers confirm or dismiss findings.
      </p>
    </>
  );
}
