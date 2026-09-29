'use client';

import { RULE_PACK_SET_VERSION } from '@dpat/rules';
import { CONFIG_TYPE_LABELS, REPOSITORY_PROVIDER_LABELS } from '@dpat/shared';
import { useMemo, type ReactNode } from 'react';

import { ClientAccessList } from '@/components/common/client-access-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useRulePacks } from '@/lib/data/hooks';
import { formatBytes } from '@/lib/format';
import { deriveClientAccessChecklist, TARGET_KIND_LABELS, WIZARD_STEPS } from '@/lib/wizard/draft';

import { useWizard } from './wizard-context';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function StepReview({ goTo }: { goTo: (step: number) => void }) {
  const { draft, update, stages, testDataSets } = useWizard();
  const { data: packs } = useRulePacks();
  const checklist = useMemo(
    () => deriveClientAccessChecklist(draft, { stages, testDataSets }),
    [draft, stages, testDataSets],
  );
  const outstanding = checklist.filter((i) => i.status === 'outstanding');
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
  const has = (k: (typeof draft.targetKinds)[number]) => draft.targetKinds.includes(k);
  const stepCount = draft.journeys.reduce((n, j) => n + j.steps.length, 0);
  const captureSteps = draft.journeys.reduce(
    (n, j) => n + j.steps.filter((s) => s.action === 'capture').length,
    0,
  );
  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            <h3 className="text-base">Summary</h3>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Rule packs <span className="font-mono">{RULE_PACK_SET_VERSION}</span>
          </span>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Name">
              <span className="font-medium">{draft.name}</span> {edit('scope')}
              {draft.description ? (
                <span className="block text-muted-foreground">{draft.description}</span>
              ) : null}
            </Row>
            {has('website') ? (
              <Row label={TARGET_KIND_LABELS.website}>
                {draft.website.baseUrl} (
                {draft.website.environmentLabel || draft.website.environment}) ·{' '}
                {draft.website.credentials.length} credential(s) ·{' '}
                {draft.website.testDataSetIds.length} test data set(s) · OTP:{' '}
                {draft.website.otp.mode.replace(/_/g, ' ')} {edit('targets')}
              </Row>
            ) : null}
            {has('android') ? (
              <Row label={TARGET_KIND_LABELS.android}>
                {draft.android.appId} v{draft.android.version}
                {draft.android.build
                  ? ` · ${draft.android.build.fileName} (${formatBytes(draft.android.build.sizeBytes)})`
                  : ' · no build'}
              </Row>
            ) : null}
            {has('ios') ? (
              <Row label={TARGET_KIND_LABELS.ios}>
                {draft.ios.appId} v{draft.ios.version}
                {draft.ios.build
                  ? ` · ${draft.ios.build.fileName}${draft.ios.decryptedConfirmed ? ' (decrypted)' : ''}`
                  : ' · no build'}
              </Row>
            ) : null}
            {has('source') ? (
              <Row label={TARGET_KIND_LABELS.source}>
                {draft.source.mode === 'repository' ? (
                  <>
                    {REPOSITORY_PROVIDER_LABELS[draft.source.provider]} · {draft.source.repoUrl} ·{' '}
                    {draft.source.branch} @{' '}
                    <span className="font-mono text-xs">{draft.source.commitSha.slice(0, 12)}</span>
                  </>
                ) : (
                  (draft.source.archive?.fileName ?? 'no archive')
                )}
              </Row>
            ) : null}
            {has('backend_config') ? (
              <Row label={TARGET_KIND_LABELS.backend_config}>
                {draft.backendConfig.files.length === 0
                  ? 'No files'
                  : draft.backendConfig.files
                      .map(
                        (f) =>
                          `${f.upload.fileName}${f.configType ? ` (${CONFIG_TYPE_LABELS[f.configType]})` : ''}`,
                      )
                      .join(', ')}
              </Row>
            ) : null}
            <Row label="Journeys">
              {draft.journeys.length === 0
                ? 'None'
                : `${draft.journeys.length} journey(s), ${stepCount} steps, ${captureSteps} screen capture(s)`}{' '}
              {edit('journeys')}
            </Row>
            <Row label="Manual captures">
              {draft.captures.length === 0
                ? 'None'
                : `${draft.captures.length} (${draft.captures.map((c) => stageName(c.stageId)).join(', ')})`}{' '}
              {edit('captures')}
            </Row>
            <Row label="Patterns">
              {draft.patternIds.length === 13
                ? 'All 13 patterns'
                : draft.patternIds
                    .map((id) => packs?.find((p) => p.pattern_id === id)?.name ?? id)
                    .join(', ')}{' '}
              {edit('patterns')}
            </Row>
            <Row label="Stages">{draft.stageIds.map(stageName).join(', ')}</Row>
            <Row label="Exclusions">
              {draft.exclusions.length === 0
                ? 'None'
                : draft.exclusions.map((e) => `${stageName(e.stageId)}: ${e.reason}`).join('; ')}
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card aria-labelledby="client-access-heading">
        <CardHeader>
          <CardTitle>
            <h3 id="client-access-heading" className="text-base">
              Client access checklist
            </h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Choose targets to see what the client needs to provide.
            </p>
          ) : (
            <ClientAccessList items={checklist} />
          )}
          {outstanding.length > 0 ? (
            <label className="flex items-start gap-3 rounded-md border border-severity-high/40 bg-severity-high/5 p-3 text-sm">
              <Checkbox
                checked={draft.acknowledgeOutstanding}
                onCheckedChange={(v) => update({ acknowledgeOutstanding: v === true })}
                aria-label="Launch with outstanding items"
                className="mt-0.5"
              />
              <span>
                Launch with {outstanding.length} outstanding item(s). Affected checks may be
                limited; this is recorded on the assessment.
              </span>
            </label>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
