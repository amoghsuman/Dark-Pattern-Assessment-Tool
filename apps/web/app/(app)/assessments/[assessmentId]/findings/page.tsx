import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FindingsList } from '@/components/findings/findings-list';

export const metadata: Metadata = { title: 'Findings' };

export default async function FindingsPage({
  params,
}: PageProps<'/assessments/[assessmentId]/findings'>) {
  const { assessmentId } = await params;
  return (
    <Suspense>
      <FindingsList assessmentId={assessmentId} />
    </Suspense>
  );
}
