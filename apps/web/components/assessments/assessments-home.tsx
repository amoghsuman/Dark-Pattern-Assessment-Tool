'use client';

import {
  ASSESSMENT_STATUS_LABELS,
  type AssessmentStatus,
  type AssessmentSummary,
} from '@dpat/shared';
import { ClipboardList, Plus, Search } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AssessmentStatusBadge, RiskSummaryChips } from '@/components/common/badges';
import { EmptyState, ErrorState, PageHeader } from '@/components/common/page-states';
import { TargetIcons } from '@/components/common/target-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssessments } from '@/lib/data/hooks';
import { formatDateTime, formatPercent, formatRelative } from '@/lib/format';
import { can, useRole } from '@/lib/permissions';

type StatusFilter = 'all' | AssessmentStatus;

export function assessmentHref(summary: AssessmentSummary): Route {
  const { id, status } = summary.assessment;
  return (
    status === 'running' || status === 'queued' ? `/assessments/${id}/run` : `/assessments/${id}`
  ) as Route;
}

function progressOf(summary: AssessmentSummary): number {
  const { completedSteps, totalSteps } = summary.assessment.progress;
  return totalSteps === 0 ? 0 : completedSteps / totalSteps;
}

export function AssessmentsHome() {
  const { data, isPending, error } = useAssessments();
  const role = useRole();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (s) =>
        (status === 'all' || s.assessment.status === status) &&
        (q === '' ||
          s.assessment.name.toLowerCase().includes(q) ||
          s.targets.some((t) => t.name.toLowerCase().includes(q))),
    );
  }, [data, query, status]);

  const canCreate = role !== null && can.createAssessment(role);
  const newButton = (
    <Button asChild={canCreate} disabled={!canCreate}>
      {canCreate ? (
        <Link href={'/assessments/new' as Route}>
          <Plus />
          New assessment
        </Link>
      ) : (
        <span>
          <Plus />
          New assessment
        </span>
      )}
    </Button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Assessments"
        description="Assessments of websites, mobile apps and code against the 13 dark patterns in the CCPA Guidelines, 2023."
        actions={
          canCreate || role === null ? (
            newButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{newButton}</span>
              </TooltipTrigger>
              <TooltipContent>Only admins and assessors can create assessments</TooltipContent>
            </Tooltip>
          )
        }
      />

      <SummaryCards data={data} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assessments or targets"
            aria-label="Search assessments"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(ASSESSMENT_STATUS_LABELS) as AssessmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ASSESSMENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState error={error} title="Could not load assessments" />
      ) : isPending ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={data.length === 0 ? 'No assessments yet' : 'No assessments match your filters'}
          description={
            data.length === 0
              ? 'Create an assessment to analyse a website, mobile app or code repository.'
              : 'Try a different search or status.'
          }
          action={data.length === 0 && canCreate ? newButton : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-72">Assessment</TableHead>
                <TableHead className="hidden lg:table-cell">Targets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-36">Progress</TableHead>
                <TableHead className="min-w-56">Open risk</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const href = assessmentHref(s);
                const progress = progressOf(s);
                return (
                  <TableRow
                    key={s.assessment.id}
                    className="cursor-pointer"
                    onClick={() => router.push(href)}
                  >
                    <TableCell className="py-3 whitespace-normal">
                      <Link
                        href={href}
                        className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.assessment.name}
                      </Link>
                      {s.assessment.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {s.assessment.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <TargetIcons targets={s.targets} />
                    </TableCell>
                    <TableCell>
                      <AssessmentStatusBadge status={s.assessment.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={progress * 100}
                          className="h-1.5 w-20"
                          aria-label="Progress"
                        />
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatPercent(progress)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RiskSummaryChips risk={s.risk} />
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground lg:table-cell">
                      <time
                        dateTime={s.assessment.updatedAt}
                        title={formatDateTime(s.assessment.updatedAt)}
                      >
                        {formatRelative(s.assessment.updatedAt)}
                      </time>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SummaryCards({ data }: { data: AssessmentSummary[] | undefined }) {
  const stats = useMemo(() => {
    const all = data ?? [];
    return [
      { label: 'Assessments', value: all.length },
      {
        label: 'Running',
        value: all.filter(
          (s) => s.assessment.status === 'running' || s.assessment.status === 'queued',
        ).length,
      },
      { label: 'Open findings', value: all.reduce((n, s) => n + s.risk.openFindings, 0) },
      {
        label: 'Open critical',
        value: all.reduce((n, s) => n + s.risk.openBySeverity.critical, 0),
        tone: 'text-severity-critical',
      },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            {data ? (
              <p className={`text-2xl font-semibold tabular-nums ${s.tone ?? ''}`}>{s.value}</p>
            ) : (
              <Skeleton className="mt-1 h-8 w-12" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4" aria-label="Loading assessments">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
