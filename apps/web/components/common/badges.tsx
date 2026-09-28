import {
  ASSESSMENT_STATUS_LABELS,
  FINDING_STATUS_LABELS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type AssessmentStatus,
  type FindingStatus,
  type RiskSummary,
  type Severity,
} from '@dpat/shared';

import { cn } from '@/lib/utils';

const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: 'bg-severity-critical/15 text-severity-critical ring-severity-critical/30',
  high: 'bg-severity-high/15 text-severity-high ring-severity-high/30',
  medium: 'bg-severity-medium/20 text-foreground ring-severity-medium/40',
  low: 'bg-severity-low/15 text-severity-low ring-severity-low/30',
};

const pill =
  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset';

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span className={cn(pill, SEVERITY_CLASSES[severity], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

const ASSESSMENT_STATUS_CLASSES: Record<AssessmentStatus, string> = {
  draft: 'bg-muted text-muted-foreground ring-border',
  queued: 'bg-muted text-muted-foreground ring-border',
  running: 'bg-brand/10 text-brand ring-brand/30',
  in_review: 'bg-matrix-in-progress/20 text-foreground ring-matrix-in-progress/50',
  completed: 'bg-matrix-compliant/15 text-foreground ring-matrix-compliant/40',
};

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return (
    <span className={cn(pill, ASSESSMENT_STATUS_CLASSES[status])}>
      {status === 'running' ? (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {ASSESSMENT_STATUS_LABELS[status]}
    </span>
  );
}

const FINDING_STATUS_CLASSES: Record<FindingStatus, string> = {
  detected: 'bg-muted text-foreground ring-border',
  under_review: 'bg-matrix-in-progress/20 text-foreground ring-matrix-in-progress/50',
  confirmed: 'bg-matrix-non-compliant/15 text-matrix-non-compliant ring-matrix-non-compliant/30',
  dismissed:
    'bg-muted text-muted-foreground ring-border line-through decoration-muted-foreground/50',
  remediation_in_progress: 'bg-brand/10 text-brand ring-brand/30',
  closed: 'bg-matrix-compliant/15 text-foreground ring-matrix-compliant/40',
};

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span className={cn(pill, FINDING_STATUS_CLASSES[status])}>
      {FINDING_STATUS_LABELS[status]}
    </span>
  );
}

/** Compact open-finding counts by severity, with the overall rating first. */
export function RiskSummaryChips({ risk }: { risk: RiskSummary }) {
  if (risk.openFindings === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {risk.totalFindings === 0 ? 'No findings' : 'No open findings'}
      </span>
    );
  }
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      aria-label={`${risk.openFindings} open findings`}
    >
      {SEVERITY_ORDER.filter((s) => risk.openBySeverity[s] > 0).map((s) => (
        <span
          key={s}
          className={cn(pill, SEVERITY_CLASSES[s], 'tabular-nums')}
          title={`${risk.openBySeverity[s]} open ${SEVERITY_LABELS[s].toLowerCase()}`}
        >
          {risk.openBySeverity[s]} {SEVERITY_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
