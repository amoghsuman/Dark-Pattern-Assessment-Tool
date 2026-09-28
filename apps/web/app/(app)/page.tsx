import type { Metadata } from 'next';

import { AssessmentsHome } from '@/components/assessments/assessments-home';

export const metadata: Metadata = { title: 'Assessments' };

export default function HomePage() {
  return <AssessmentsHome />;
}
