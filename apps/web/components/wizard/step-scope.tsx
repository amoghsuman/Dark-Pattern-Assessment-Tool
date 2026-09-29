'use client';

import {
  Check,
  Code2,
  Globe,
  Server,
  Smartphone,
  TabletSmartphone,
  type LucideIcon,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TARGET_KIND_LABELS, TARGET_KIND_ORDER, type TargetKind } from '@/lib/wizard/draft';

import { Field, FieldError } from './field';
import { useWizard } from './wizard-context';

const KIND_META: Record<TargetKind, { icon: LucideIcon; description: string }> = {
  website: {
    icon: Globe,
    description:
      'Scripted journeys on a UAT or production site, with test credentials, test data and OTP handling.',
  },
  android: {
    icon: Smartphone,
    description: 'APK or AAB build: journeys on device and static analysis of the package.',
  },
  ios: {
    icon: TabletSmartphone,
    description: 'Decrypted IPA supplied by the client: journeys on device and static analysis.',
  },
  source: {
    icon: Code2,
    description: 'Read-only repository connection pinned to a commit, or a ZIP of the source.',
  },
  backend_config: {
    icon: Server,
    description:
      'Notification schedules, pricing and fee rules, CMS exports, feature flags and templates.',
  },
};

export function StepScope() {
  const { draft, update, errors } = useWizard();

  const toggle = (kind: TargetKind) =>
    update((d) => ({
      ...d,
      targetKinds: d.targetKinds.includes(kind)
        ? d.targetKinds.filter((k) => k !== kind)
        : TARGET_KIND_ORDER.filter((k) => k === kind || d.targetKinds.includes(k)),
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TARGET_KIND_ORDER.map((kind) => {
            const { icon: Icon, description } = KIND_META[kind];
            const selected = draft.targetKinds.includes(kind);
            return (
              <label
                key={kind}
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
                  onChange={() => toggle(kind)}
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
                <span className="font-medium">{TARGET_KIND_LABELS[kind]}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </label>
            );
          })}
        </div>
        <FieldError message={errors.targetKinds} />
      </fieldset>
    </div>
  );
}
