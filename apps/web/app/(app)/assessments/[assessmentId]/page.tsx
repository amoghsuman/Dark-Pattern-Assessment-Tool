import type { Metadata } from 'next';

import { AssessmentOverview } from '@/components/overview/assessment-overview';

export const metadata: Metadata = { title: 'Overview' };

export default async function AssessmentOverviewPage({
  params,
}: PageProps<'/assessments/[assessmentId]'>) {
  const { assessmentId } = await params;
  return <AssessmentOverview assessmentId={assessmentId} />;
}
