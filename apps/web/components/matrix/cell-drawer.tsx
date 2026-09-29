'use client';

import { getPatternInfo, getRulePack } from '@dpat/rules';
import {
  ENGINE_LABELS,
  MATRIX_CELL_STATE_LABELS,
  type CodeSnippetEvidence,
  type ConfigExcerptEvidence,
  type Finding,
  type JourneyStage,
  type MatrixCell,
} from '@dpat/shared';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { FindingStatusBadge, SeverityBadge } from '@/components/common/badges';
import { ScreenshotThumbnail } from '@/components/evidence/screenshot-thumbnail';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

import { CELL_CLASSES, CELL_ICONS, MARKER_LABELS } from './matrix-style';

export function CellDrawer({
  assessmentId,
  cell,
  stage,
  findings,
  open,
  onOpenChange,
}: {
  assessmentId: string;
  cell: MatrixCell | null;
  stage: JourneyStage | null;
  findings: Finding[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {cell && stage ? (
          <DrawerBody assessmentId={assessmentId} cell={cell} stage={stage} findings={findings} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  assessmentId,
  cell,
  stage,
  findings,
}: {
  assessmentId: string;
  cell: MatrixCell;
  stage: JourneyStage;
  findings: Finding[];
}) {
  const info = getPatternInfo(cell.patternId);
  const pack = getRulePack(cell.patternId);
  const Icon = CELL_ICONS[cell.state];
  const cellFindings = cell.findingIds.flatMap((id) => findings.find((f) => f.id === id) ?? []);

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="pr-6">
          {info.name} · {stage.name}
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
                CELL_CLASSES[cell.state],
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {MATRIX_CELL_STATE_LABELS[cell.state]}
            </span>
            {cell.marker ? (
              <span className="text-xs font-medium text-foreground">
                {MARKER_LABELS[cell.marker]}
              </span>
            ) : null}
            <span className="text-xs">
              {cellFindings.length} {cellFindings.length === 1 ? 'finding' : 'findings'}
            </span>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-4">
        {cell.notAssessedReason ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">{cell.notAssessedReason}</p>
        ) : null}
        {cell.state === 'compliant' && cellFindings.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            Assessed against the violation criteria below with no findings raised.
          </p>
        ) : null}

        {cellFindings.map((f) => {
          const screenshot = f.evidence.find((e) => e.kind === 'screenshot');
          const other = f.evidence.find(
            (e): e is CodeSnippetEvidence | ConfigExcerptEvidence => e.kind !== 'screenshot',
          );
          return (
            <article
              key={f.id}
              className="space-y-3 rounded-lg border p-4"
              aria-labelledby={`drawer-${f.id}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-muted-foreground">{f.reference}</span>
                <SeverityBadge severity={f.severity} />
                <FindingStatusBadge status={f.status} />
                <span className="text-muted-foreground">
                  {ENGINE_LABELS[f.engine]} · {formatPercent(f.confidence)} confidence
                </span>
              </div>
              <h3 id={`drawer-${f.id}`} className="leading-snug font-medium">
                {f.title}
              </h3>
              {screenshot?.kind === 'screenshot' ? (
                <ScreenshotThumbnail evidence={screenshot} />
              ) : null}
              {!screenshot && other ? (
                <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
                  {other.kind === 'code_snippet' ? other.filePath : other.source} (lines{' '}
                  {other.startLine}–{other.endLine})
                </p>
              ) : null}
              <div className="space-y-1">
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Rationale
                </h4>
                <p className="text-sm">{f.rationale}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Remediation
                </h4>
                <p className="text-sm">{f.remediation.guidance}</p>
              </div>
              <Link
                href={`/assessments/${assessmentId}/findings/${f.id}` as Route}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Open finding <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </article>
          );
        })}

        <Separator />

        <section className="space-y-2" aria-labelledby="drawer-rule">
          <h3 id="drawer-rule" className="flex items-center gap-2 font-medium">
            <BookOpen className="size-4 text-muted-foreground" aria-hidden />
            Rule reference
          </h3>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Guideline</dt>
            <dd>{pack.guideline_reference.clause}</dd>
            <dt className="text-muted-foreground">Rule pack</dt>
            <dd className="font-mono text-xs leading-5">
              {pack.id} v{pack.version}
            </dd>
          </dl>
          <p className="text-sm text-muted-foreground">{pack.definition}</p>
          <h4 className="pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Violation criteria
          </h4>
          <ul className="space-y-1 text-sm">
            {pack.violation_criteria.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span className="font-mono text-xs leading-5 text-muted-foreground">{c.id}</span>
                <span>{c.description}</span>
              </li>
            ))}
          </ul>
          <h4 className="pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Remediation template
          </h4>
          <p className="text-sm">{pack.remediation_template.summary}</p>
          <Link
            href={`/rules/${cell.patternId}` as Route}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Open rule pack <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </section>
      </div>
    </>
  );
}
