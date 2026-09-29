'use client';

import { FileSpreadsheet, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/page-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { brand } from '@/config/brand';
import { useOrganization, useRulePacks } from '@/lib/data/hooks';
import { useAssessmentAnalysis } from '@/lib/data/use-assessment-analysis';
import { cn } from '@/lib/utils';

import { REPORT_SECTIONS } from './report-sections';
import type { ReportData } from './report-types';

export function ReportScreen({ assessmentId }: { assessmentId: string }) {
  const analysis = useAssessmentAnalysis(assessmentId);
  const { data: organization } = useOrganization();
  const { data: packs } = useRulePacks();
  const [exporting, setExporting] = useState(false);
  const [generatedAt] = useState(() => new Date());

  const data: ReportData | undefined = useMemo(
    () =>
      analysis.data && organization && packs
        ? { ...analysis.data, organization, packs, generatedAt }
        : undefined,
    [analysis.data, organization, packs, generatedAt],
  );

  if (analysis.error) return <ErrorState error={analysis.error} />;
  if (!data) return <Skeleton className="h-[48rem] w-full" />;

  const exportExcel = async () => {
    setExporting(true);
    try {
      const { buildRiskRegisterWorkbook, downloadWorkbook, riskRegisterFileName } =
        await import('@/lib/export/risk-register-xlsx');
      const workbook = await buildRiskRegisterWorkbook({
        organization: data.organization,
        assessment: data.detail.assessment,
        matrix: data.matrix,
        findings: data.findings,
        packs: data.packs,
        productName: brand.productName,
        generatedAt: new Date(),
      });
      await downloadWorkbook(workbook, riskRegisterFileName(data.detail.assessment, new Date()));
      toast.success('Risk register exported');
    } catch (err) {
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  };

  let number = 0;
  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <p className="mr-auto text-sm text-muted-foreground">
          Preview of the full report. Use Download PDF and choose &quot;Save as PDF&quot; (A4).
        </p>
        <Button variant="outline" onClick={() => void exportExcel()} disabled={exporting}>
          <FileSpreadsheet />
          {exporting ? 'Preparing…' : 'Export Excel risk register'}
        </Button>
        <Button onClick={() => window.print()}>
          <Printer />
          Download PDF
        </Button>
      </div>

      <nav
        className="print-hidden flex flex-wrap gap-x-4 gap-y-1 text-sm"
        aria-label="Report sections"
      >
        {REPORT_SECTIONS.filter((s) => s.id !== 'cover').map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-brand hover:underline">
            {s.title}
          </a>
        ))}
      </nav>

      <article
        className="report-document mx-auto max-w-4xl rounded-lg border bg-card px-6 py-8 shadow-sm md:px-12 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
        aria-label="Assessment report"
      >
        {REPORT_SECTIONS.map((section) => {
          const sectionNumber = section.id === 'cover' ? 0 : ++number;
          return (
            <section
              key={section.id}
              data-section={section.id}
              className={cn(
                'py-6 first:pt-0',
                section.pageBreak && 'print-break-before border-t print:border-t-0',
              )}
            >
              <section.Component data={data} number={sectionNumber} />
            </section>
          );
        })}
      </article>
    </div>
  );
}
