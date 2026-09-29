'use client';

import { NotFoundError } from '@dpat/shared';
import { ChevronLeft } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AssessmentStatusBadge } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/page-states';
import { TargetIcons } from '@/components/common/target-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssessment } from '@/lib/data/hooks';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SearchX } from 'lucide-react';

const TABS = [
  { segment: '', label: 'Overview' },
  { segment: '/run', label: 'Run' },
  { segment: '/matrix', label: 'Compliance matrix' },
  { segment: '/findings', label: 'Findings' },
  { segment: '/report', label: 'Report' },
] as const;

/** Header and tab navigation shared by every page of one assessment. */
export function AssessmentShell({
  assessmentId,
  children,
}: {
  assessmentId: string;
  children: ReactNode;
}) {
  const { data, isPending, error } = useAssessment(assessmentId);
  const pathname = usePathname();
  const base = `/assessments/${assessmentId}`;

  if (error) {
    return error instanceof NotFoundError ? (
      <EmptyState
        icon={SearchX}
        title="Assessment not found"
        description="It may have been removed, or it was created in another browser (sample changes stay in the browser that made them)."
        action={
          <Link href="/" className="text-sm font-medium text-brand hover:underline">
            Back to assessments
          </Link>
        }
      />
    ) : (
      <ErrorState error={error} />
    );
  }

  const active = (segment: string) =>
    segment === ''
      ? pathname === base
      : pathname === `${base}${segment}` || pathname.startsWith(`${base}${segment}/`);

  return (
    <div className="mx-auto max-w-7xl space-y-6 print:max-w-none print:space-y-0">
      <div className="print-hidden space-y-3">
        <Link
          href="/"
          className="print-hidden inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Assessments
        </Link>
        {isPending ? (
          <Skeleton className="h-8 w-96" />
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {data.assessment.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <AssessmentStatusBadge status={data.assessment.status} />
                <span>
                  Started {formatDate(data.assessment.startedAt ?? data.assessment.createdAt)}
                </span>
                <span className="font-mono">{data.assessment.rulePackSetVersion}</span>
              </div>
            </div>
            <TargetIcons targets={data.targets} />
          </div>
        )}
      </div>

      <nav
        aria-label="Assessment sections"
        className="print-hidden -mx-4 overflow-x-auto border-b px-4 md:mx-0 md:px-0"
      >
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.segment}>
              <Link
                href={`${base}${tab.segment}` as Route}
                aria-current={active(tab.segment) ? 'page' : undefined}
                className={cn(
                  'relative inline-flex h-10 items-center px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
                  active(tab.segment) &&
                    'text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand',
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}
