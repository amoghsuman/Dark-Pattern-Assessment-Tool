import type { ReportSection } from './report-types';
import { AnnexuresSection } from './sections/annexures';
import { CoverSection } from './sections/cover';
import { ExecutiveSummarySection } from './sections/executive-summary';
import { FindingsByPatternSection } from './sections/findings-by-pattern';
import { HeatmapSection } from './sections/heatmap';
import { RemediationPlanSection } from './sections/remediation-plan';
import { ScopeMethodologySection } from './sections/scope-methodology';

/**
 * The default report template. To adopt a house template, reorder, replace or remove entries
 * here; each section is self-contained and receives the same ReportData.
 */
export const REPORT_SECTIONS: ReportSection[] = [
  { id: 'cover', title: 'Cover', pageBreak: false, Component: CoverSection },
  {
    id: 'executive-summary',
    title: 'Executive summary',
    pageBreak: true,
    Component: ExecutiveSummarySection,
  },
  {
    id: 'scope',
    title: 'Scope and methodology',
    pageBreak: true,
    Component: ScopeMethodologySection,
  },
  { id: 'heatmap', title: 'Compliance heatmap', pageBreak: true, Component: HeatmapSection },
  {
    id: 'findings',
    title: 'Findings by pattern',
    pageBreak: true,
    Component: FindingsByPatternSection,
  },
  {
    id: 'remediation',
    title: 'Remediation plan',
    pageBreak: true,
    Component: RemediationPlanSection,
  },
  { id: 'annexures', title: 'Annexures', pageBreak: true, Component: AnnexuresSection },
];
