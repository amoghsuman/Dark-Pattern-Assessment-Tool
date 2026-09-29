'use client';

import { getPatternInfo, PATTERNS, type PatternId, type RulePack } from '@dpat/rules';
import { ENGINE_LABELS, NotFoundError } from '@dpat/shared';
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SeverityBadge } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/page-states';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRulePack } from '@/lib/data/hooks';
import { cn } from '@/lib/utils';

import { APPLICABILITY_CLASSES, APPLICABILITY_LABELS, DraftBanner } from './rule-library';

const EVIDENCE_LABELS: Record<RulePack['evidence_required'][number], string> = {
  screenshot: 'Screenshot',
  code_snippet: 'Code snippet',
  config_excerpt: 'Configuration excerpt',
  network_trace: 'Network trace',
  journey_recording: 'Journey recording',
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card className="gap-3" aria-labelledby={id}>
      <CardHeader>
        <CardTitle id={id} className="text-base">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function RulePackDetail({ patternId }: { patternId: PatternId }) {
  const { data: pack, isPending, error } = useRulePack(patternId);

  if (error) {
    return error instanceof NotFoundError ? (
      <EmptyState icon={SearchX} title="Rule pack not found" />
    ) : (
      <ErrorState error={error} />
    );
  }
  if (isPending) return <Skeleton className="mx-auto h-[40rem] max-w-5xl" />;

  const info = getPatternInfo(pack.pattern_id);
  const index = PATTERNS.findIndex((p) => p.id === pack.pattern_id);
  const prev = PATTERNS[index - 1];
  const next = PATTERNS[index + 1];
  const signals = pack.detection_signals;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/rules"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Rule library
        </Link>
        <p className="text-xs text-muted-foreground">
          {pack.guideline_reference.clause} · <span className="font-mono">{pack.id}</span> v
          {pack.version}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-muted-foreground tabular-nums">{info.annexureItem}.</span>{' '}
          {pack.name}
        </h1>
        <p className="text-xs text-muted-foreground">{pack.guideline_reference.instrument}</p>
      </div>
      <DraftBanner />

      <Section id="definition" title="Definition">
        <p className="text-sm">{pack.definition}</p>
        <h3 className="mt-4 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Illustrations
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {pack.illustrations.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Section>

      <Section id="criteria" title="Violation criteria">
        <ul className="space-y-2" aria-label="Violation criteria">
          {pack.violation_criteria.map((c) => (
            <li key={c.id} className="flex gap-3 text-sm">
              <span className="font-mono text-xs leading-5 text-muted-foreground">{c.id}</span>
              <span>{c.description}</span>
            </li>
          ))}
        </ul>
        {pack.exclusions.length > 0 ? (
          <>
            <h3 className="mt-4 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Exclusions
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {pack.exclusions.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      <Section id="signals" title="Detection signals">
        <Tabs defaultValue="screen">
          <TabsList>
            <TabsTrigger value="screen">Screen ({signals.screen.length})</TabsTrigger>
            <TabsTrigger value="code">Code ({signals.code.length})</TabsTrigger>
            <TabsTrigger value="backend">Backend ({signals.backend.length})</TabsTrigger>
          </TabsList>
          {(['screen', 'code', 'backend'] as const).map((channel) => (
            <TabsContent key={channel} value={channel} className="mt-3">
              <ul className="space-y-3">
                {signals[channel].map((s) => (
                  <li key={s.id} className="text-sm">
                    <p className="flex gap-3">
                      <span className="font-mono text-xs leading-5 text-muted-foreground">
                        {s.id}
                      </span>
                      <span>{s.description}</span>
                    </p>
                    {s.examples.length > 0 ? (
                      <ul className="mt-1 ml-[5.5rem] space-y-0.5">
                        {s.examples.map((ex) => (
                          <li key={ex} className="font-mono text-xs text-muted-foreground">
                            {ex}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </Section>

      <Section id="checks" title="Deterministic checks">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="min-w-64">Check</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>On match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pack.deterministic_checks.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="align-top font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <p className="text-sm">{c.description}</p>
                    {c.expression ? (
                      <code className="mt-1 block font-mono text-xs break-all text-muted-foreground">
                        {c.expression}
                      </code>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-sm">{ENGINE_LABELS[c.engine]}</TableCell>
                  <TableCell className="align-top font-mono text-xs">{c.method}</TableCell>
                  <TableCell className="align-top text-sm">
                    {c.on_match === 'raise_finding' ? 'Raise finding' : 'Raise signal'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Expressions are illustrative until the analysis engines implement them.
        </p>
      </Section>

      <Section id="rubric" title="Review rubric (AI-assisted analysis)">
        <p className="text-sm">{pack.llm_rubric.instructions}</p>
        <h3 className="mt-4 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Questions
        </h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {pack.llm_rubric.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Decision rule
            </dt>
            <dd className="mt-1">{pack.llm_rubric.decision_rule}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Confidence guidance
            </dt>
            <dd className="mt-1">{pack.llm_rubric.confidence_guidance}</dd>
          </div>
        </dl>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section id="severity" title="Severity logic">
          <ul className="space-y-2">
            {pack.severity_logic.map((r) => (
              <li key={r.severity + r.when} className="flex items-start gap-3 text-sm">
                <SeverityBadge severity={r.severity} className="mt-0.5 shrink-0" />
                <span>{r.when}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section id="evidence" title="Evidence required">
          <div className="flex flex-wrap gap-2">
            {pack.evidence_required.map((e) => (
              <Badge key={e} variant="secondary">
                {EVIDENCE_LABELS[e]}
              </Badge>
            ))}
          </div>
        </Section>
      </div>

      <Section id="remediation" title="Remediation template">
        <p className="text-sm font-medium">{pack.remediation_template.summary}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {pack.remediation_template.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {pack.remediation_template.references.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            References: {pack.remediation_template.references.join('; ')}
          </p>
        ) : null}
      </Section>

      <Section id="sectors" title="Sector variants">
        <Tabs defaultValue="insurance">
          <TabsList>
            {(['insurance', 'banking', 'lending'] as const).map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
          {(['insurance', 'banking', 'lending'] as const).map((s) => {
            const v = pack.sector_variants[s];
            return (
              <TabsContent key={s} value={s} className="mt-3 space-y-3 text-sm">
                <p>
                  Relevance:{' '}
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-medium',
                      APPLICABILITY_CLASSES[v.applicability],
                    )}
                  >
                    {APPLICABILITY_LABELS[v.applicability]}
                  </span>
                </p>
                <p>{v.notes}</p>
                {v.additional_criteria.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Additional criteria
                    </h3>
                    <ul className="list-disc space-y-1 pl-5">
                      {v.additional_criteria.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {v.regulatory_cross_references.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Related instruments
                    </h3>
                    <ul className="list-disc space-y-1 pl-5">
                      {v.regulatory_cross_references.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </TabsContent>
            );
          })}
        </Tabs>
      </Section>

      <nav className="flex justify-between gap-4 border-t pt-4" aria-label="Other rule packs">
        {prev ? (
          <Link
            href={`/rules/${prev.id}` as Route}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/rules/${next.id}` as Route}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            {next.name}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
