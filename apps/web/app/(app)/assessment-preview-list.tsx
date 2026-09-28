'use client';

import { ASSESSMENT_STATUS_LABELS } from '@dpat/shared';

import { useAssessments } from '@/lib/data/hooks';

/** Minimal list proving the data seam end to end. Replaced by the Home screen in M4. */
export function AssessmentPreviewList() {
  const { data, isPending, error } = useAssessments();

  if (isPending) return <p className="text-sm text-muted-foreground">Loading assessments…</p>;
  if (error) return <p role="alert">Could not load assessments: {error.message}</p>;

  return (
    <ul className="divide-y rounded-lg border bg-card" aria-label="Assessments">
      {data.map(({ assessment, risk }) => (
        <li key={assessment.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="font-medium">{assessment.name}</span>
          <span className="text-sm text-muted-foreground">
            {ASSESSMENT_STATUS_LABELS[assessment.status]} · {risk.openFindings} open findings
          </span>
        </li>
      ))}
    </ul>
  );
}
