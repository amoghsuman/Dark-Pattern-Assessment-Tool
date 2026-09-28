import { brand } from '@/config/brand';
import { getServerEnv } from '@/lib/env';

import { AssessmentPreviewList } from './assessment-preview-list';

export default function HomePage() {
  const { dataSource } = getServerEnv();

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground">{brand.tagline}.</p>
        <p className="text-sm text-muted-foreground" data-testid="data-source">
          Data source: {dataSource}
        </p>
      </div>
      <AssessmentPreviewList />
    </section>
  );
}
