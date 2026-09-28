import { AssessmentShell } from '@/components/assessments/assessment-shell';

export default async function AssessmentLayout({
  params,
  children,
}: LayoutProps<'/assessments/[assessmentId]'>) {
  const { assessmentId } = await params;
  return <AssessmentShell assessmentId={assessmentId}>{children}</AssessmentShell>;
}
