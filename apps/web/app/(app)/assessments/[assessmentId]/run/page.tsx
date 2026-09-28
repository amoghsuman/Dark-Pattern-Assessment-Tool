import type { Metadata } from 'next';

import { RunView } from '@/components/run/run-view';

export const metadata: Metadata = { title: 'Run' };

export default async function RunPage({ params }: PageProps<'/assessments/[assessmentId]/run'>) {
  const { assessmentId } = await params;
  return <RunView assessmentId={assessmentId} />;
}
