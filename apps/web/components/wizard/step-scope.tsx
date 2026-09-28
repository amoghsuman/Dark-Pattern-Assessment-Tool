'use client';

import { TARGET_TYPE_LABELS, type TargetType } from '@dpat/shared';
import { Check } from 'lucide-react';

import { TARGET_ICONS } from '@/components/common/target-icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { Field, FieldError } from './field';
import { useWizard } from './wizard-context';

const TYPE_DESCRIPTIONS: Record<TargetType, string> = {
  website: 'Scripted journeys on a live or UAT website, captured and analysed screen by screen.',
  mobile_app: 'Journeys on an Android or iOS build, plus static analysis of the app package.',
  code_repository: 'Front-end, back-end and configuration code reviewed against detection signals.',
};

export function StepScope() {
  const { draft, update, errors } = useWizard();

  const toggle = (type: TargetType) =>
    update((d) => ({
      ...d,
      targetTypes: d.targetTypes.includes(type)
        ? d.targetTypes.filter((t) => t !== type)
        : [...d.targetTypes, type],
    }));

  return (
    <div className="grid gap-6">
      <Field id="wizard-name" label="Assessment name" error={errors.name}>
        <Input
          id="wizard-name"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Motor insurance renewal journeys, Q3"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby="wizard-name-message"
        />
      </Field>
      <Field
        id="wizard-description"
        label="Description"
        hint="Optional. Shown on the report cover."
      >
        <Textarea
          id="wizard-description"
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          aria-describedby="wizard-description-message"
        />
      </Field>
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">What do you want to assess?</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(TARGET_TYPE_LABELS) as TargetType[]).map((type) => {
            const Icon = TARGET_ICONS[type];
            const selected = draft.targetTypes.includes(type);
            return (
              <label
                key={type}
                className={cn(
                  'relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50',
                  'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                  selected && 'border-brand bg-brand/5',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={() => toggle(type)}
                />
                <span className="flex items-center justify-between">
                  <Icon className="size-5 text-muted-foreground" aria-hidden />
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      selected && 'border-brand bg-brand text-brand-foreground',
                    )}
                    aria-hidden
                  >
                    {selected ? <Check className="size-3.5" /> : null}
                  </span>
                </span>
                <span className="font-medium">{TARGET_TYPE_LABELS[type]}</span>
                <span className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</span>
              </label>
            );
          })}
        </div>
        <FieldError message={errors.targetTypes} />
      </fieldset>
    </div>
  );
}
