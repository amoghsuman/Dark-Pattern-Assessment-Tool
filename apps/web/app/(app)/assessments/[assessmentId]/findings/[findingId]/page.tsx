import type { Metadata } from 'next';

import { FindingDetail } from '@/components/findings/finding-detail';

export const metadata: Metadata = { title: 'Finding' };

export default async function FindingPage({
  params,
}: PageProps<'/assessments/[assessmentId]/findings/[findingId]'>) {
  const { assessmentId, findingId } = await params;
  return <FindingDetail assessmentId={assessmentId} findingId={findingId} />;
}
