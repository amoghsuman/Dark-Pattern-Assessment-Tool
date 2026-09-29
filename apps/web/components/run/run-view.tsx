'use client';

import { ENGINE_LABELS, type Engine, type EngineRun } from '@dpat/shared';
import {
  Camera,
  CheckCircle2,
  Circle,
  FileCode2,
  Loader2,
  Network,
  RotateCcw,
  Server,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';

import { ErrorState } from '@/components/common/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLatestRun, useRunProgress } from '@/lib/data/hooks';
import { formatDateTime, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const ENGINE_ICONS: Record<Engine, LucideIcon> = {
  screen_capture: Camera,
  code_analysis: FileCode2,
  backend_logic: Server,
  software_risk: ShieldAlert,
  correlation: Network,
};

const ENGINE_DESCRIPTIONS: Record<Engine, string> = {
  screen_capture: 'Runs journeys, captures screens and checks them against screen signals.',
  code_analysis: 'Searches front-end and app code for code signals and deterministic checks.',
  backend_logic: 'Reviews pricing, notification, billing and API configuration.',
  software_risk: 'Scans app packages for SDKs, permissions and risky components.',
  correlation: 'Links findings across engines that describe the same issue.',
};

const STATUS_TEXT: Record<EngineRun['status'], string> = {
  pending: 'Waiting',
  running: 'Running',
  succeeded: 'Complete',
  failed: 'Failed',
  skipped: 'Skipped',
};

export function RunView({ assessmentId }: { assessmentId: string }) {
  const { data: latest, isPending, error } = useLatestRun(assessmentId);
  const [replayKey, setReplayKey] = useState(0);
  // Completed runs open at their final state and animate only on Replay; active runs stream.
  const stream =
    latest && (latest.status === 'queued' || latest.status === 'running' || replayKey > 0);
  const live = useRunProgress(stream ? latest.id : undefined, replayKey);

  if (error) return <ErrorState error={error} />;
  if (isPending) return <Skeleton className="h-[32rem] w-full" />;
  if (!latest)
    return <p className="text-sm text-muted-foreground">This assessment has not been run yet.</p>;

  const run = live ?? latest;
  const done = run.engines.filter((e) => e.status === 'succeeded' || e.status === 'skipped').length;
  const findings = run.engines.reduce((n, e) => n + e.metrics.findingsRaised, 0);
  const finished = run.status === 'succeeded' || run.status === 'failed';
  const latestEvent = run.engines
    .flatMap((e) => e.events.map((ev) => ({ ...ev, engine: e.engine })))
    .at(-1);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <Card className="gap-3">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {finished
                  ? 'Analysis complete'
                  : run.status === 'queued'
                    ? 'Queued'
                    : 'Analysis in progress'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {done} of {run.engines.length} engines complete · {findings} findings raised
              </p>
            </div>
            {finished ? (
              <Button variant="outline" size="sm" onClick={() => setReplayKey((k) => k + 1)}>
                <RotateCcw />
                Replay
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <Progress value={(done / run.engines.length) * 100} aria-label="Overall progress" />
            <p className="sr-only" aria-live="polite">
              {latestEvent ? `${ENGINE_LABELS[latestEvent.engine]}: ${latestEvent.message}` : ''}
            </p>
          </CardContent>
        </Card>

        <ol className="relative space-y-3" aria-label="Analysis engines">
          {run.engines.map((engine, index) => (
            <EngineStep
              key={engine.engine}
              engine={engine}
              last={index === run.engines.length - 1}
            />
          ))}
        </ol>
      </div>

      <aside className="space-y-4">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="text-sm">Run details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Detail
              label="Rule packs"
              value={<span className="font-mono text-xs">{run.rulePackSetVersion}</span>}
            />
            {run.startedAt ? (
              <Detail label="Started" value={formatDateTime(run.startedAt)} />
            ) : null}
            {run.completedAt && finished ? (
              <Detail label="Completed" value={formatDateTime(run.completedAt)} />
            ) : null}
          </CardContent>
        </Card>
        {finished ? (
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild>
                <Link href={`/assessments/${assessmentId}` as Route}>View overview</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/assessments/${assessmentId}/matrix` as Route}>Compliance matrix</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <p className="text-xs text-muted-foreground">
            You can leave this page; the run continues and results appear as each engine completes.
          </p>
        )}
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function EngineStep({ engine, last }: { engine: EngineRun; last: boolean }) {
  const Icon = ENGINE_ICONS[engine.engine];
  const { itemsTotal, itemsProcessed, findingsRaised } = engine.metrics;
  const StatusIcon =
    engine.status === 'succeeded'
      ? CheckCircle2
      : engine.status === 'failed'
        ? XCircle
        : engine.status === 'running'
          ? Loader2
          : Circle;

  return (
    <li
      className="relative pl-10"
      data-testid={`engine-${engine.engine}`}
      data-status={engine.status}
    >
      {!last ? (
        <span
          aria-hidden
          className="absolute top-8 bottom-[-0.75rem] left-[0.95rem] w-px bg-border"
        />
      ) : null}
      <span
        className={cn(
          'absolute top-3 left-0 flex size-8 items-center justify-center rounded-full border bg-card',
          engine.status === 'running' && 'border-brand text-brand',
          engine.status === 'succeeded' && 'border-matrix-compliant text-matrix-compliant',
          engine.status === 'failed' && 'border-destructive text-destructive',
          engine.status === 'pending' && 'text-muted-foreground',
        )}
      >
        <StatusIcon
          className={cn(
            'size-4',
            engine.status === 'running' && 'animate-spin motion-reduce:animate-none',
          )}
          aria-hidden
        />
      </span>
      <Card className={cn('gap-3 py-4', engine.status === 'pending' && 'opacity-70')}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4">
          <div className="flex min-w-0 items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{ENGINE_LABELS[engine.engine]}</p>
              <p className="text-xs text-muted-foreground">{ENGINE_DESCRIPTIONS[engine.engine]}</p>
            </div>
          </div>
          <div className="shrink-0 text-right text-xs">
            <p className="font-medium">{STATUS_TEXT[engine.status]}</p>
            {engine.status !== 'pending' ? (
              <p className="text-muted-foreground tabular-nums">
                {findingsRaised} {findingsRaised === 1 ? 'finding' : 'findings'}
              </p>
            ) : null}
          </div>
        </CardHeader>
        {engine.status !== 'pending' ? (
          <CardContent className="space-y-3 px-4">
            {itemsTotal > 0 ? (
              <div className="flex items-center gap-3">
                <Progress
                  value={(itemsProcessed / itemsTotal) * 100}
                  className="h-1.5"
                  aria-label={`${ENGINE_LABELS[engine.engine]} progress`}
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {itemsProcessed.toLocaleString('en-IN')} / {itemsTotal.toLocaleString('en-IN')}
                </span>
              </div>
            ) : null}
            {engine.events.length > 0 ? (
              <ul className="space-y-1 rounded-md bg-muted/50 p-2 font-mono text-xs">
                {engine.events.map((event, i) => (
                  <li
                    key={`${event.at}-${i}`}
                    className={cn(
                      'flex gap-3',
                      event.level === 'warn' && 'font-medium text-foreground',
                      event.level === 'error' && 'text-destructive',
                    )}
                  >
                    <time dateTime={event.at} className="shrink-0 text-muted-foreground">
                      {formatTime(event.at)}
                    </time>
                    <span>
                      {event.level !== 'info' ? (
                        <span
                          aria-hidden
                          className={cn(
                            'mr-1.5 inline-block size-1.5 rounded-full align-middle',
                            event.level === 'warn' ? 'bg-severity-high' : 'bg-destructive',
                          )}
                        />
                      ) : null}
                      {event.level === 'warn' ? <span className="sr-only">Warning: </span> : null}
                      {event.message}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    </li>
  );
}
