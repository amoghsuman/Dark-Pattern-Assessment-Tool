'use client';

import { TARGET_TYPE_LABELS } from '@dpat/shared';
import { RULE_PACK_SET_VERSION } from '@dpat/rules';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRulePacks } from '@/lib/data/hooks';
import { formatBytes } from '@/lib/format';
import { WIZARD_STEPS } from '@/lib/wizard/draft';

import { useWizard } from './wizard-context';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function StepReview({ goTo }: { goTo: (step: number) => void }) {
  const { draft, stages } = useWizard();
  const { data: packs } = useRulePacks();
  const edit = (id: (typeof WIZARD_STEPS)[number]['id']) => (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0"
      onClick={() => goTo(WIZARD_STEPS.findIndex((s) => s.id === id))}
    >
      Edit
    </Button>
  );
  const targetSummary = draft.targetTypes.map((t) => {
    if (t === 'website')
      return `${TARGET_TYPE_LABELS[t]}: ${draft.website.name} (${draft.website.baseUrl})`;
    if (t === 'mobile_app')
      return `${TARGET_TYPE_LABELS[t]}: ${draft.mobile.name} (${draft.mobile.appId} v${draft.mobile.version})`;
    return `${TARGET_TYPE_LABELS[t]}: ${draft.code.name}`;
  });
  const stepCount = draft.journeys.reduce((n, j) => n + j.steps.length, 0);
  const captureCount = draft.journeys.reduce(
    (n, j) => n + j.steps.filter((s) => s.action === 'capture').length,
    0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Summary</CardTitle>
        <span className="text-xs text-muted-foreground">
          Rule packs <span className="font-mono">{RULE_PACK_SET_VERSION}</span>
        </span>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row label="Name">
            <span className="font-medium">{draft.name}</span> {edit('scope')}
            {draft.description ? (
              <p className="text-muted-foreground">{draft.description}</p>
            ) : null}
          </Row>
          <Row label="Targets">
            <ul>
              {targetSummary.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {edit('targets')}
          </Row>
          <Row label="Uploads">
            {draft.uploads.length === 0
              ? 'None'
              : draft.uploads
                  .map((u) => `${u.fileName} (${formatBytes(u.sizeBytes)})`)
                  .join(', ')}{' '}
            {edit('uploads')}
          </Row>
          <Row label="Journeys">
            {draft.journeys.length === 0
              ? 'None'
              : `${draft.journeys.length} journey(s), ${stepCount} steps, ${captureCount} screen capture(s)`}{' '}
            {edit('journeys')}
          </Row>
          <Row label="Patterns">
            {draft.patternIds.length === 13
              ? 'All 13 patterns'
              : draft.patternIds
                  .map((id) => packs?.find((p) => p.pattern_id === id)?.name ?? id)
                  .join(', ')}{' '}
            {edit('patterns')}
          </Row>
          <Row label="Stages">
            {stages
              .filter((s) => draft.stageIds.includes(s.id))
              .map((s) => s.name)
              .join(', ')}
          </Row>
        </dl>
      </CardContent>
    </Card>
  );
}
