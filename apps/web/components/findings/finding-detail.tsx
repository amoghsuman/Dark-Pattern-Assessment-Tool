'use client';

import { getPatternInfo, getRulePack } from '@dpat/rules';
import { ENGINE_LABELS, NotFoundError, type Evidence, type Finding } from '@dpat/shared';
import { ArrowRight, BookOpen, Check, ChevronLeft, Link2, SearchX } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { FindingStatusBadge, SeverityBadge } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/page-states';
import { TARGET_ICONS } from '@/components/common/target-icon';
import { CodeViewer } from '@/components/evidence/code-viewer';
import { ScreenshotViewer } from '@/components/evidence/screenshot-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssessment, useFinding, useFindings, useOrganization } from '@/lib/data/hooks';
import { formatDate, formatDateTime, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

import { CommentsAndTrail, ReviewPanel } from './review-panel';

function evidenceTabLabel(e: Evidence, index: number): string {
  if (e.kind === 'screenshot') return `Screenshot ${index + 1}`;
  const path = e.kind === 'code_snippet' ? e.filePath : e.source;
  return path.split('/').at(-1) ?? path;
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>
          <h3 className="flex items-center gap-2 text-sm">
            {icon}
            {title}
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export function FindingDetail({
  assessmentId,
  findingId,
}: {
  assessmentId: string;
  findingId: string;
}) {
  const { data: finding, isPending, error } = useFinding(findingId);

  if (error) {
    return error instanceof NotFoundError ? (
      <EmptyState
        icon={SearchX}
        title="Finding not found"
        description="It may belong to another assessment."
      />
    ) : (
      <ErrorState error={error} />
    );
  }
  if (isPending) return <Skeleton className="h-[40rem] w-full" />;
  return <FindingBody assessmentId={assessmentId} finding={finding} />;
}

function FindingBody({ assessmentId, finding }: { assessmentId: string; finding: Finding }) {
  const { data: detail } = useAssessment(assessmentId);
  const { data: organization } = useOrganization();
  const { data: all } = useFindings(assessmentId);
  const [activeCriterion, setActiveCriterion] = useState<string | null>(null);

  const pattern = getPatternInfo(finding.patternId);
  const pack = getRulePack(finding.patternId);
  const stage = organization?.journeyStages.find((s) => s.id === finding.stageId);
  const target = detail?.targets.find((t) => t.id === finding.targetId);
  const step = detail?.journeys.flatMap((j) => j.steps).find((s) => s.id === finding.journeyStepId);
  const correlated = finding.correlatedFindingIds.flatMap(
    (id) => all?.find((f) => f.id === id) ?? [],
  );
  const base = `/assessments/${assessmentId}`;
  const TargetIcon = target ? TARGET_ICONS[target.type] : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href={`${base}/findings` as Route}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          All findings
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground" data-testid="finding-reference">
            {finding.reference}
          </span>
          <SeverityBadge severity={finding.severity} />
          <FindingStatusBadge status={finding.status} />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-balance">{finding.title}</h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <Link
            href={`/rules/${finding.patternId}` as Route}
            className="font-medium text-foreground hover:underline"
          >
            {pattern.name}
          </Link>
          <span>{stage?.name ?? finding.stageId}</span>
          <span>{ENGINE_LABELS[finding.engine]}</span>
          {target && TargetIcon ? (
            <span className="inline-flex items-center gap-1">
              <TargetIcon className="size-3.5" aria-hidden />
              {target.name}
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <Section title="Summary">
            <p className="text-sm">{finding.summary}</p>
            {step ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Journey step {step.order + 1}: {step.label}
              </p>
            ) : null}
          </Section>

          <Section title={`Evidence (${finding.evidence.length})`}>
            {finding.evidence.length === 1 && finding.evidence[0] ? (
              <EvidenceView
                evidence={finding.evidence[0]}
                activeCriterion={activeCriterion}
                onSelectCriterion={setActiveCriterion}
              />
            ) : (
              <Tabs defaultValue={finding.evidence[0]?.id ?? ''}>
                <TabsList className="max-w-full overflow-x-auto">
                  {finding.evidence.map((e, i) => (
                    <TabsTrigger key={e.id} value={e.id}>
                      {evidenceTabLabel(e, i)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {finding.evidence.map((e) => (
                  <TabsContent key={e.id} value={e.id} className="mt-3">
                    <EvidenceView
                      evidence={e}
                      activeCriterion={activeCriterion}
                      onSelectCriterion={setActiveCriterion}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </Section>

          <Section title="Violation criteria">
            <ul className="space-y-2" aria-label="Violation criteria">
              {pack.violation_criteria.map((c) => {
                const met = finding.violationCriterionIds.includes(c.id);
                return (
                  <li
                    key={c.id}
                    data-met={met}
                    className={cn(
                      'flex gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                      !met && 'text-muted-foreground',
                      activeCriterion === c.id &&
                        'border-matrix-non-compliant bg-matrix-non-compliant/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                        met &&
                          'border-matrix-non-compliant bg-matrix-non-compliant text-matrix-non-compliant-foreground',
                      )}
                      aria-hidden
                    >
                      {met ? <Check className="size-3" /> : null}
                    </span>
                    <span className="sr-only">{met ? 'Met: ' : 'Not met: '}</span>
                    <span className="font-mono text-xs leading-5 text-muted-foreground">
                      {c.id}
                    </span>
                    <span>{c.description}</span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Rationale">
            <p className="text-sm">{finding.rationale}</p>
          </Section>

          <Section title="Remediation">
            <p className="text-sm">{finding.remediation.guidance}</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Owner</dt>
                <dd>{finding.remediation.ownerTeam ?? 'Not assigned'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Effort</dt>
                <dd className="capitalize">{finding.remediation.effort}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Target date</dt>
                <dd>
                  {finding.remediation.targetDate
                    ? formatDate(finding.remediation.targetDate)
                    : 'Not set'}
                </dd>
              </div>
            </dl>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Rule pack remediation template
              </summary>
              <p className="mt-2">{pack.remediation_template.summary}</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                {pack.remediation_template.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </details>
          </Section>

          <Section
            title={`Correlated findings (${correlated.length})`}
            icon={<Link2 className="size-4 text-muted-foreground" aria-hidden />}
          >
            {correlated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No correlated findings.</p>
            ) : (
              <ul className="divide-y" aria-label="Correlated findings">
                {correlated.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`${base}/findings/${c.id}` as Route}
                      className="flex flex-wrap items-center gap-2 py-2 text-sm hover:underline"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{c.reference}</span>
                      <span className="min-w-0 flex-1">{c.title}</span>
                      <SeverityBadge severity={c.severity} />
                      <span className="text-xs text-muted-foreground">
                        {ENGINE_LABELS[c.engine]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-5">
          <ReviewPanel finding={finding} />
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <Meta label="Confidence">
                  <span className="flex items-center gap-2">
                    <Progress
                      value={finding.confidence * 100}
                      className="h-1.5 w-20"
                      aria-label="Confidence"
                    />
                    <span className="tabular-nums">{formatPercent(finding.confidence)}</span>
                  </span>
                </Meta>
                <Meta label="Detected">{formatDateTime(finding.createdAt)}</Meta>
                <Meta label="Last updated">{formatDateTime(finding.updatedAt)}</Meta>
              </dl>
            </CardContent>
          </Card>
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="size-4 text-muted-foreground" aria-hidden />
                Rule reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <dl className="space-y-2">
                <Meta label="Guideline">{pack.guideline_reference.clause}</Meta>
                <Meta label="Rule pack">
                  <span className="font-mono text-xs" data-testid="rule-pack-version">
                    {finding.rulePackId} v{finding.rulePackVersion}
                  </span>
                </Meta>
              </dl>
              <p className="text-xs text-muted-foreground">
                Rule packs are drafts, pending compliance review.
              </p>
              <Link
                href={`/rules/${finding.patternId}` as Route}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Open rule pack <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </CardContent>
          </Card>
          <CommentsAndTrail finding={finding} />
        </aside>
      </div>
    </div>
  );
}

function EvidenceView({
  evidence,
  activeCriterion,
  onSelectCriterion,
}: {
  evidence: Evidence;
  activeCriterion: string | null;
  onSelectCriterion: (id: string | null) => void;
}) {
  if (evidence.kind === 'screenshot') {
    return (
      <ScreenshotViewer
        evidence={evidence}
        activeCriterion={activeCriterion}
        onSelectCriterion={onSelectCriterion}
      />
    );
  }
  return <CodeViewer evidence={evidence} />;
}
