import { PATTERNS } from '@dpat/rules';
import {
  compareFindings,
  ENGINE_LABELS,
  FINDING_STATUS_LABELS,
  SEVERITY_LABELS,
  type Finding,
} from '@dpat/shared';

import { ScreenshotThumbnail } from '@/components/evidence/screenshot-thumbnail';
import { formatPercent } from '@/lib/format';

import { ReportTable, SectionHeading } from '../report-primitives';
import type { ReportData } from '../report-types';

function EvidenceExcerpt({ finding }: { finding: Finding }) {
  const screenshot = finding.evidence.find((e) => e.kind === 'screenshot');
  if (screenshot?.kind === 'screenshot')
    return <ScreenshotThumbnail evidence={screenshot} className="max-w-md" />;
  const other = finding.evidence[0];
  if (!other || other.kind === 'screenshot') return null;
  const body = other.kind === 'code_snippet' ? other.code : other.content;
  const location = other.kind === 'code_snippet' ? other.filePath : other.source;
  return (
    <figure className="space-y-1">
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2 font-mono text-[10px] leading-snug whitespace-pre-wrap print:overflow-visible">
        {body
          .split('\n')
          .map((line, i) => `${String(other.startLine + i).padStart(4, ' ')}  ${line}`)
          .join('\n')}
      </pre>
      <figcaption className="text-xs text-muted-foreground">
        <span className="font-mono">{location}</span>, lines {other.startLine}–{other.endLine}
      </figcaption>
    </figure>
  );
}

/** Findings grouped by pattern. Dismissed findings are listed in the table without detail. */
export function FindingsByPatternSection({ data, number }: { data: ReportData; number: number }) {
  const stageName = new Map(data.stages.map((s) => [s.id, s.name]));
  const groups = PATTERNS.map((p) => ({
    pattern: p,
    pack: data.packs.find((pk) => pk.pattern_id === p.id),
    findings: data.findings.filter((f) => f.patternId === p.id).sort(compareFindings),
  })).filter((g) => g.findings.length > 0);

  return (
    <>
      <SectionHeading number={number} title="Findings by pattern" id="findings" />
      {groups.length === 0 ? <p className="text-sm">No findings were raised.</p> : null}
      <div className="space-y-8">
        {groups.map(({ pattern, pack, findings }) => (
          <section key={pattern.id} aria-labelledby={`report-${pattern.id}`}>
            <h3 id={`report-${pattern.id}`} className="text-base font-semibold">
              {number}.{pattern.annexureItem} {pattern.name}
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              {pack?.guideline_reference.clause} · rule pack{' '}
              <span className="font-mono">{pack?.id}</span> v{pack?.version}
            </p>
            <ReportTable>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Finding</th>
                  <th>Stage</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id}>
                    <td className="font-mono">{f.reference}</td>
                    <td>{f.title}</td>
                    <td>{stageName.get(f.stageId)}</td>
                    <td>{SEVERITY_LABELS[f.severity]}</td>
                    <td>{FINDING_STATUS_LABELS[f.status]}</td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
            <div className="mt-4 space-y-5">
              {findings
                .filter((f) => f.status !== 'dismissed')
                .map((f) => (
                  <article key={f.id} className="print-avoid-break space-y-2 rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{f.reference}</span> ·{' '}
                      {SEVERITY_LABELS[f.severity]} · {FINDING_STATUS_LABELS[f.status]} ·{' '}
                      {ENGINE_LABELS[f.engine]} · {formatPercent(f.confidence)} confidence ·
                      criteria {f.violationCriterionIds.join(', ')}
                    </p>
                    <h4 className="text-sm font-semibold">{f.title}</h4>
                    <p className="text-sm">{f.summary}</p>
                    <EvidenceExcerpt finding={f} />
                    <p className="text-sm">
                      <strong>Rationale.</strong> {f.rationale}
                    </p>
                    <p className="text-sm">
                      <strong>Remediation.</strong> {f.remediation.guidance}
                    </p>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
