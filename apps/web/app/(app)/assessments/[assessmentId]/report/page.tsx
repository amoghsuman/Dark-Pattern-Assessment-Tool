import type { Metadata } from 'next';

import { ReportScreen } from '@/components/report/report-screen';

export const metadata: Metadata = { title: 'Report' };

export default async function ReportPage({
  params,
}: PageProps<'/assessments/[assessmentId]/report'>) {
  const { assessmentId } = await params;
  return <ReportScreen assessmentId={assessmentId} />;
}
