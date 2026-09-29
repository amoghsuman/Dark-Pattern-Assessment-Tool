'use client';

import { PATTERNS } from '@dpat/rules';
import {
  countBy,
  ENGINE_LABELS,
  ENGINE_ORDER,
  findingEngine,
  findingPattern,
  findingSeverity,
  isOpen,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  TARGET_TYPE_LABELS,
  type Finding,
} from '@dpat/shared';
import { ArrowRight, Info, Loader2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BarList } from '@/components/charts/bar-list';
import { SEVERITY_DOT } from '@/components/common/badges';
import { ClientAccessList } from '@/components/common/client-access-list';
import { InputsTable } from '@/components/common/inputs-table';
import { ErrorState } from '@/components/common/page-states';
import { TARGET_ICONS, targetDetail } from '@/components/common/target-icon';
import { CompactMatrix } from '@/components/matrix/compliance-matrix';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useArtifacts } from '@/lib/data/hooks';
import { useAssessmentAnalysis } from '@/lib/data/use-assessment-analysis';
import { formatPercent } from '@/lib/format';

function Kpi({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-2xl font-semibold">{value}</div>
        {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}

function openClosedTooltip(findings: Finding[], label: string) {
  const open = findings.filter(isOpen).length;
  return (
    <div className="text-xs">
      <p className="font-medium">{label}</p>
      <p>
        {open} open · {findings.length - open} dismissed or closed
      </p>
    </div>
  );
}

export function AssessmentOverview({ assessmentId }: { assessmentId: string }) {
  const { data, isPending, error } = useAssessmentAnalysis(assessmentId);
  const { data: artifacts } = useArtifacts(assessmentId);

  if (error) return <ErrorState error={error} />;
  if (isPending || !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const { findings, kpis, matrix, detail } = data;
  const base = `/assessments/${assessmentId}`;
  const running = detail.assessment.status === 'running' || detail.assessment.status === 'queued';

  const bySeverity = countBy(findings, findingSeverity, SEVERITY_ORDER);
  const byPattern = countBy(
    findings,
    findingPattern,
    PATTERNS.map((p) => p.id),
  );
  const byEngine = countBy(findings, findingEngine, ENGINE_ORDER);
  const correlated = findings.filter((f) => f.correlatedFindingIds.length > 0).length;
  const stageNames = data.stages
    .filter((s) => detail.assessment.stageIds.includes(s.id))
    .map((s) => s.name);

  return (
    <div className="space-y-6">
      {running ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
          <Loader2
            className="size-4 animate-spin text-brand motion-reduce:animate-none"
            aria-hidden
          />
          Analysis is still running, so these results are partial.
          <Link href={`${base}/run` as Route} className="font-medium text-brand hover:underline">
            View progress
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Total findings"
          value={kpis.totalFindings}
          detail={`${kpis.openFindings} open`}
        />
        <Kpi
          label="Confirmed non-compliance"
          value={kpis.confirmedOpen}
          detail="Confirmed or in remediation"
        />
        <Kpi
          label="Awaiting review"
          value={kpis.awaitingReview}
          detail="Detected or under review"
        />
        <Kpi
          label="Critical or high, open"
          value={
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-2 rounded-full bg-severity-critical" />
              {kpis.criticalHighOpen}
            </span>
          }
        />
        <Kpi
          label="Patterns non-compliant"
          value={
            <>
              {kpis.patternsNonCompliant}
              <span className="text-base font-normal text-muted-foreground"> of 13</span>
            </>
          }
          detail={
            kpis.remediationProgress === null ? (
              'No confirmed findings yet'
            ) : (
              <span className="flex items-center gap-2">
                <Progress
                  value={kpis.remediationProgress * 100}
                  className="h-1.5 w-16"
                  aria-label="Remediation progress"
                />
                {formatPercent(kpis.remediationProgress)} remediated
              </span>
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings by severity</CardTitle>
            <CardDescription>All findings in this assessment.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              ariaLabel="Findings by severity"
              labelWidth="w-20"
              rows={SEVERITY_ORDER.map((s) => ({
                key: s,
                label: SEVERITY_LABELS[s],
                value: bySeverity[s],
                dotClass: SEVERITY_DOT[s],
                barClass: SEVERITY_DOT[s],
                href: `${base}/findings?severity=${s}` as Route,
                tooltip: openClosedTooltip(
                  findings.filter((f) => f.severity === s),
                  SEVERITY_LABELS[s],
                ),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings by engine</CardTitle>
            <CardDescription>Which analysis engine raised each finding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BarList
              ariaLabel="Findings by engine"
              labelWidth="w-32"
              rows={ENGINE_ORDER.filter((e) => e !== 'correlation').map((e) => ({
                key: e,
                label: ENGINE_LABELS[e],
                value: byEngine[e],
                href: `${base}/findings?engine=${e}` as Route,
                tooltip: openClosedTooltip(
                  findings.filter((f) => f.engine === e),
                  ENGINE_LABELS[e],
                ),
              }))}
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Correlation linked {correlated} findings across engines; it raises no findings of its
              own.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scope</CardTitle>
            <CardDescription>
              {detail.assessment.patternIds.length} patterns · {stageNames.length} journey stages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              {detail.targets.map((t) => {
                const Icon = TARGET_ICONS[t.type];
                return (
                  <li key={t.id} className="flex gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="font-medium">{t.name}</span>{' '}
                      <span className="text-muted-foreground">({TARGET_TYPE_LABELS[t.type]})</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {targetDetail(t)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {detail.assessment.coverageGaps.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Deferred</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {detail.assessment.coverageGaps.map((g) => (
                    <li key={g.stageId}>
                      <span className="text-foreground">
                        {data.stages.find((s) => s.id === g.stageId)?.name}:
                      </span>{' '}
                      {g.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client access</CardTitle>
            <CardDescription>
              {detail.assessment.launchedWithOutstanding
                ? 'Launched with outstanding items.'
                : 'Recorded at launch.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detail.assessment.clientAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground">No checklist recorded.</p>
            ) : (
              <ClientAccessList items={detail.assessment.clientAccess} compact />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inputs received</CardTitle>
            <CardDescription>Uploads and manual captures, with SHA-256 checksums.</CardDescription>
          </CardHeader>
          <CardContent>
            <InputsTable
              artifacts={artifacts ?? []}
              targets={detail.targets}
              stages={data.stages}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings by pattern</CardTitle>
            <CardDescription>
              Most findings first. Select a pattern to see its findings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              ariaLabel="Findings by pattern"
              labelWidth="w-44"
              rows={PATTERNS.map((p) => ({
                key: p.id,
                label: p.name,
                value: byPattern[p.id],
                href: `${base}/findings?pattern=${p.id}` as Route,
                tooltip: openClosedTooltip(
                  findings.filter((f) => f.patternId === p.id),
                  p.name,
                ),
              })).sort((a, b) => b.value - a.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance matrix</CardTitle>
            <CardDescription>Columns follow the journey stage order in Settings.</CardDescription>
            <CardAction>
              <Link
                href={`${base}/matrix` as Route}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Open <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <CompactMatrix
              matrix={matrix}
              hrefFor={(s) => `${base}/matrix?pattern=${s.patternId}&stage=${s.stageId}`}
            />
            <ol
              className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
              aria-label="Stage key"
            >
              {data.stages.map((s) => (
                <li key={s.id}>
                  <span className="tabular-nums">{s.order + 1}</span> {s.name}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
