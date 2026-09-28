import type { Metadata } from 'next';

import { NewAssessmentWizard } from '@/components/wizard/new-assessment-wizard';

export const metadata: Metadata = { title: 'New assessment' };

export default function NewAssessmentPage() {
  return <NewAssessmentWizard />;
}
