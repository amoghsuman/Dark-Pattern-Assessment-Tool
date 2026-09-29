'use client';

import { PATTERN_IDS, type PatternId } from '@dpat/rules';
import { getMatrixCell } from '@dpat/shared';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/common/page-states';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssessmentAnalysis } from '@/lib/data/use-assessment-analysis';

import { CellDrawer } from './cell-drawer';
import { ComplianceMatrixGrid, MatrixLegend, type CellSelection } from './compliance-matrix';

function isPatternId(value: string | null): value is PatternId {
  return PATTERN_IDS.some((p) => p === value);
}

export function MatrixScreen({ assessmentId }: { assessmentId: string }) {
  const { data, isPending, error } = useAssessmentAnalysis(assessmentId);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The open cell lives in the URL (?pattern=&stage=) so it can be linked and survives refresh.
  const patternParam = params.get('pattern');
  const stageParam = params.get('stage');
  const selected: CellSelection | null =
    isPatternId(patternParam) && stageParam
      ? { patternId: patternParam, stageId: stageParam }
      : null;

  const select = (s: CellSelection | null) =>
    router.replace(
      (s ? `${pathname}?pattern=${s.patternId}&stage=${s.stageId}` : pathname) as Route,
      {
        scroll: false,
      },
    );

  if (error) return <ErrorState error={error} />;
  if (isPending || !data) return <Skeleton className="h-[36rem] w-full" />;

  const cell = selected
    ? (getMatrixCell(data.matrix, selected.patternId, selected.stageId) ?? null)
    : null;
  const stage = selected ? (data.stages.find((s) => s.id === selected.stageId) ?? null) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The 13 specified dark patterns (rows) against the organisation&apos;s journey stages
        (columns). Select a cell for its findings, evidence, rationale, rule reference and
        remediation.
      </p>
      <MatrixLegend matrix={data.matrix} />
      <ComplianceMatrixGrid matrix={data.matrix} onSelect={select} selected={selected} />
      <CellDrawer
        assessmentId={assessmentId}
        cell={cell}
        stage={stage}
        findings={data.findings}
        open={cell !== null}
        onOpenChange={(open) => (open ? undefined : select(null))}
      />
    </div>
  );
}
