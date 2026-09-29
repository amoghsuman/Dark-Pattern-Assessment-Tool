'use client';

import { getPatternInfo, type RulePack, type SectorVariant } from '@dpat/rules';
import { AlertTriangle, BookOpen, Search } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyState, ErrorState, PageHeader } from '@/components/common/page-states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRulePacks } from '@/lib/data/hooks';
import { cn } from '@/lib/utils';

export const APPLICABILITY_LABELS: Record<SectorVariant['applicability'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  not_applicable: 'N/A',
};

export const APPLICABILITY_CLASSES: Record<SectorVariant['applicability'], string> = {
  high: 'bg-foreground text-background',
  medium: 'bg-muted text-foreground ring-1 ring-inset ring-border',
  low: 'text-muted-foreground ring-1 ring-inset ring-border',
  not_applicable: 'text-muted-foreground line-through',
};

export function DraftBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-matrix-in-progress/60 bg-matrix-in-progress/15 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-medium">Draft, pending compliance review.</span> These rule packs
        paraphrase Annexure 1 of the CCPA Guidelines for Prevention and Regulation of Dark Patterns,
        2023 and must be checked against the official text before they are relied on.
      </p>
    </div>
  );
}

function matches(pack: RulePack, q: string): boolean {
  const text = [
    pack.name,
    pack.definition,
    ...pack.illustrations,
    ...pack.violation_criteria.map((c) => c.description),
  ]
    .join(' ')
    .toLowerCase();
  return text.includes(q);
}

export function RuleLibrary() {
  const { data: packs, isPending, error } = useRulePacks();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (packs ?? []).filter((p) => q === '' || matches(p, q));
  }, [packs, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Rule library"
        description="The 13 specified dark patterns with their violation criteria, detection signals, checks, review rubric, severity logic and remediation guidance."
      />
      <DraftBanner />
      <div className="relative max-w-sm">
        <Search
          className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns, criteria, illustrations"
          aria-label="Search rule packs"
          className="pl-8"
        />
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No rule packs match"
          description="Try another search term."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Rule packs">
          {shown.map((pack) => {
            const info = getPatternInfo(pack.pattern_id);
            const signals =
              pack.detection_signals.code.length +
              pack.detection_signals.backend.length +
              pack.detection_signals.screen.length;
            return (
              <li key={pack.id}>
                <Link
                  href={`/rules/${pack.pattern_id}` as Route}
                  className="block h-full rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Card className="h-full gap-3 transition-colors hover:bg-accent/40">
                    <CardHeader>
                      <p className="text-xs text-muted-foreground">
                        Annexure 1, item {info.annexureItem} ·{' '}
                        <span className="font-mono">{pack.id}</span> v{pack.version}
                      </p>
                      <CardTitle className="text-base">{pack.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {pack.definition}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pack.violation_criteria.length} criteria · {signals} signals ·{' '}
                        {pack.deterministic_checks.length} checks
                      </p>
                      <div className="flex flex-wrap gap-1.5" aria-label="Sector relevance">
                        {(['insurance', 'banking', 'lending'] as const).map((sector) => {
                          const a = pack.sector_variants[sector].applicability;
                          return (
                            <span
                              key={sector}
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[11px] font-medium capitalize',
                                APPLICABILITY_CLASSES[a],
                              )}
                            >
                              {sector}: {APPLICABILITY_LABELS[a]}
                            </span>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
