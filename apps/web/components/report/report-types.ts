import type { RulePack } from '@dpat/rules';
import type { AssessmentAnalysis } from '@/lib/data/use-assessment-analysis';
import type { Organization } from '@dpat/shared';
import type { ComponentType } from 'react';

export interface ReportData extends AssessmentAnalysis {
  organization: Organization;
  packs: RulePack[];
  generatedAt: Date;
}

/**
 * A report section. The report is an ordered list of these, so a house template can reorder,
 * replace or drop sections without touching the others.
 */
export interface ReportSection {
  id: string;
  title: string;
  /** Start the section on a new printed page. */
  pageBreak: boolean;
  Component: ComponentType<{ data: ReportData; number: number }>;
}
