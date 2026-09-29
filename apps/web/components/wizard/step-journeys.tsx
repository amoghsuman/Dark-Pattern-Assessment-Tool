'use client';

import { JOURNEY_STEP_ACTION_LABELS, type JourneyStepAction } from '@dpat/shared';
import {
  ArrowDown,
  ArrowUp,
  Globe,
  Plus,
  Smartphone,
  TabletSmartphone,
  Trash2,
  Wand2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  journeyTargetKinds,
  newStep,
  templateJourney,
  type JourneyDraft,
  type JourneyTargetKind,
  type StepDraft,
  TARGET_KIND_LABELS,
  TEST_DATA_TOKENS,
} from '@/lib/wizard/draft';

import { FieldError } from './field';
import { useWizard } from './wizard-context';

const ACTIONS = Object.keys(JOURNEY_STEP_ACTION_LABELS) as JourneyStepAction[];
const TARGET_LABEL: Record<JourneyTargetKind, string> = {
  website: TARGET_KIND_LABELS.website,
  android: TARGET_KIND_LABELS.android,
  ios: TARGET_KIND_LABELS.ios,
};

function targetPlaceholder(action: JourneyStepAction, type: JourneyTargetKind): string {
  if (action === 'navigate')
    return type === 'website' ? 'https://www.example.com/quote' : 'app://renewal';
  if (action === 'click')
    return type === 'website' ? 'button[type=submit] or text=Buy now' : 'Accessibility label';
  return '#field-id';
}

export function StepJourneys() {
  const { draft, update, errors, stages } = useWizard();
  const types = journeyTargetKinds(draft);

  const setJourney = (id: string, fn: (j: JourneyDraft) => JourneyDraft) =>
    update((d) => ({ ...d, journeys: d.journeys.map((j) => (j.id === id ? fn(j) : j)) }));

  if (types.length === 0) {
    return (
      <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        Journeys apply to websites and mobile apps. This assessment covers code only, so you can
        continue.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Each journey is an ordered list of steps. Tag every step with a journey stage: findings on
        captured screens are placed in that stage&apos;s column of the compliance matrix.
      </p>
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <div key={type} className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update((d) => ({
                  ...d,
                  journeys: [
                    ...d.journeys,
                    {
                      ...templateJourney(type, stages, d.website.baseUrl),
                      name: '',
                      steps: [newStep(stages[0]?.id ?? '')],
                    },
                  ],
                }))
              }
            >
              <Plus />
              {TARGET_LABEL[type]} journey
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                update((d) => ({
                  ...d,
                  journeys: [...d.journeys, templateJourney(type, stages, d.website.baseUrl)],
                }))
              }
            >
              <Wand2 />
              {TARGET_LABEL[type]} template
            </Button>
          </div>
        ))}
      </div>
      {types.map((type) => (
        <FieldError key={type} message={errors[`journeys.${type}`]} />
      ))}

      <datalist id="test-data-tokens">
        {TEST_DATA_TOKENS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {draft.journeys
        .filter((j) => types.includes(j.targetKind))
        .map((journey) => (
          <JourneyCard
            key={journey.id}
            journey={journey}
            onChange={(fn) => setJourney(journey.id, fn)}
            onRemove={() =>
              update((d) => ({ ...d, journeys: d.journeys.filter((j) => j.id !== journey.id) }))
            }
          />
        ))}
    </div>
  );
}

function JourneyCard({
  journey,
  onChange,
  onRemove,
}: {
  journey: JourneyDraft;
  onChange: (fn: (j: JourneyDraft) => JourneyDraft) => void;
  onRemove: () => void;
}) {
  const { errors, stages } = useWizard();
  const Icon =
    journey.targetKind === 'website'
      ? Globe
      : journey.targetKind === 'android'
        ? Smartphone
        : TabletSmartphone;
  const setStep = (id: string, patch: Partial<StepDraft>) =>
    onChange((j) => ({ ...j, steps: j.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const move = (index: number, delta: -1 | 1) =>
    onChange((j) => {
      const steps = [...j.steps];
      const [item] = steps.splice(index, 1);
      if (item) steps.splice(index + delta, 0, item);
      return { ...j, steps };
    });
  const journeyErrors = [
    errors[`journey.${journey.id}.name`],
    errors[`journey.${journey.id}.steps`],
    errors[`journey.${journey.id}.capture`],
  ].filter(Boolean);
  const stepErrors = journey.steps.flatMap((s) =>
    Object.entries(errors)
      .filter(([k]) => k.startsWith(`step.${s.id}.`))
      .map(([, v]) => v),
  );

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center gap-3">
        <Badge variant="secondary" className="gap-1">
          <Icon className="size-3.5" aria-hidden />
          {TARGET_LABEL[journey.targetKind]}
        </Badge>
        <Input
          value={journey.name}
          onChange={(e) => onChange((j) => ({ ...j, name: e.target.value }))}
          placeholder="Journey name, e.g. Renewal checkout"
          aria-label="Journey name"
          className="h-8 max-w-sm"
          aria-invalid={errors[`journey.${journey.id}.name`] ? true : undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={onRemove}
        >
          <Trash2 />
          Remove journey
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ol className="grid gap-2" aria-label={`Steps in ${journey.name || 'journey'}`}>
          {journey.steps.map((step, index) => {
            const err = (field: string) => errors[`step.${step.id}.${field}`];
            const needsTarget =
              step.action === 'navigate' || step.action === 'click' || step.action === 'fill';
            return (
              <li
                key={step.id}
                className="grid grid-cols-[2rem_1fr_auto] items-start gap-2 rounded-md border bg-muted/30 p-2"
              >
                <span className="pt-1.5 text-center text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="grid gap-2 md:grid-cols-[8.5rem_minmax(0,1fr)_14rem]">
                  <Select
                    value={step.action}
                    onValueChange={(v) => setStep(step.id, { action: v as JourneyStepAction })}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full"
                      aria-label={`Step ${index + 1} action`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {JOURNEY_STEP_ACTION_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={step.label}
                    onChange={(e) => setStep(step.id, { label: e.target.value })}
                    placeholder="Label"
                    aria-label={`Step ${index + 1} label`}
                    className={cn('h-8', err('label') && 'border-destructive')}
                  />
                  <Select
                    value={step.stageId}
                    onValueChange={(v) => setStep(step.id, { stageId: v })}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full"
                      aria-label={`Step ${index + 1} stage`}
                    >
                      <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 md:col-span-3">
                    {needsTarget ? (
                      <Input
                        value={step.target}
                        onChange={(e) => setStep(step.id, { target: e.target.value })}
                        placeholder={targetPlaceholder(step.action, journey.targetKind)}
                        aria-label={`Step ${index + 1} ${step.action === 'navigate' ? 'URL' : 'selector'}`}
                        className={cn(
                          'h-8 font-mono text-xs',
                          err('target') && 'border-destructive',
                        )}
                      />
                    ) : null}
                    {step.action === 'fill' ? (
                      <Input
                        value={step.value}
                        onChange={(e) => setStep(step.id, { value: e.target.value })}
                        placeholder="Value or {{token}}"
                        list="test-data-tokens"
                        aria-label={`Step ${index + 1} value`}
                        className={cn('h-8 w-28', err('value') && 'border-destructive')}
                      />
                    ) : null}
                    {step.action === 'wait' ? (
                      <>
                        <Input
                          value={step.waitMs}
                          inputMode="numeric"
                          onChange={(e) => setStep(step.id, { waitMs: e.target.value })}
                          aria-label={`Step ${index + 1} wait in milliseconds`}
                          className={cn('h-8 w-32', err('waitMs') && 'border-destructive')}
                        />
                        <span className="self-center text-xs text-muted-foreground">
                          milliseconds
                        </span>
                      </>
                    ) : null}
                    {step.action === 'capture' ? (
                      <span className="self-center text-xs text-muted-foreground">
                        Captures the current screen
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move step ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move step ${index + 1} down`}
                    disabled={index === journey.steps.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() =>
                      onChange((j) => ({ ...j, steps: j.steps.filter((s) => s.id !== step.id) }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange((j) => ({
                ...j,
                steps: [
                  ...j.steps,
                  newStep(j.steps.at(-1)?.stageId ?? stages[0]?.id ?? '', 'click'),
                ],
              }))
            }
          >
            <Plus />
            Add step
          </Button>
        </div>
        {[...journeyErrors, ...stepErrors].length > 0 ? (
          <ul role="alert" className="list-inside list-disc text-sm text-destructive">
            {[...journeyErrors, ...stepErrors].map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
