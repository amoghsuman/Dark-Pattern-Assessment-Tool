import { getPatternInfo, PatternIdSchema } from '@dpat/rules';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RulePackDetail } from '@/components/rules/rule-pack-detail';

export async function generateMetadata({
  params,
}: PageProps<'/rules/[patternId]'>): Promise<Metadata> {
  const parsed = PatternIdSchema.safeParse((await params).patternId);
  return { title: parsed.success ? getPatternInfo(parsed.data).name : 'Rule pack' };
}

export default async function RulePackPage({ params }: PageProps<'/rules/[patternId]'>) {
  const parsed = PatternIdSchema.safeParse((await params).patternId);
  if (!parsed.success) notFound();
  return <RulePackDetail patternId={parsed.data} />;
}
