import type { Metadata } from 'next';
import { Suspense } from 'react';

import { MatrixScreen } from '@/components/matrix/matrix-screen';

export const metadata: Metadata = { title: 'Compliance matrix' };

export default async function MatrixPage({
  params,
}: PageProps<'/assessments/[assessmentId]/matrix'>) {
  const { assessmentId } = await params;
  return (
    <Suspense>
      <MatrixScreen assessmentId={assessmentId} />
    </Suspense>
  );
}
