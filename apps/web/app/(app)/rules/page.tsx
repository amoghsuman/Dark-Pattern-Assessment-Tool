import type { Metadata } from 'next';

import { RuleLibrary } from '@/components/rules/rule-library';

export const metadata: Metadata = { title: 'Rule library' };

export default function RulesPage() {
  return <RuleLibrary />;
}
