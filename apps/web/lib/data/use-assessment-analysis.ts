'use client';

import {
  deriveKpis,
  deriveMatrix,
  type AssessmentDetail,
  type AssessmentKpis,
  type ComplianceMatrix,
  type Finding,
  type JourneyStage,
} from '@dpat/shared';
import { useMemo } from 'react';

import { useAssessment, useFindings, useLatestRun, useOrganization } from './hooks';

export interface AssessmentAnalysis {
  detail: AssessmentDetail;
  findings: Finding[];
  stages: JourneyStage[];
  matrix: ComplianceMatrix;
  kpis: AssessmentKpis;
}

/**
 * Combines the queries every analysis screen needs and derives the compliance matrix and KPIs
 * with the shared rules, so Overview, Matrix and Report always agree.
 */
export function useAssessmentAnalysis(assessmentId: string): {
  data: AssessmentAnalysis | undefined;
  isPending: boolean;
  error: Error | null;
} {
  const assessment = useAssessment(assessmentId);
  const findings = useFindings(assessmentId);
  const organization = useOrganization();
  const run = useLatestRun(assessmentId);

  const data = useMemo(() => {
    if (!assessment.data || !findings.data || !organization.data || run.data === undefined)
      return undefined;
    const stages = organization.data.journeyStages;
    const matrix = deriveMatrix({
      assessment: assessment.data.assessment,
      stages,
      journeys: assessment.data.journeys,
      targets: assessment.data.targets,
      findings: findings.data,
      run: run.data,
    });
    return {
      detail: assessment.data,
      findings: findings.data,
      stages: matrix.stages,
      matrix,
      kpis: deriveKpis(findings.data, matrix),
    };
  }, [assessment.data, findings.data, organization.data, run.data]);

  const error = assessment.error ?? findings.error ?? organization.error ?? run.error ?? null;
  return { data, isPending: data === undefined && error === null, error };
}
