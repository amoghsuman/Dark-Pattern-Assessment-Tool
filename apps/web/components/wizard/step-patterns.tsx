'use client';

import { PATTERN_IDS, type PatternId } from '@dpat/rules';
import type { Sector } from '@dpat/shared';
import { Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization, useRulePacks } from '@/lib/data/hooks';
import { draftId, taggedStageIds } from '@/lib/wizard/draft';

import { Field, FieldError } from './field';
import { useWizard } from './wizard-context';

const SECTOR_VARIANT: Partial<Record<Sector, 'insurance' | 'banking' | 'lending'>> = {
  insurance: 'insurance',
  banking: 'banking',
  lending: 'lending',
};

const RELEVANCE_LABEL = {
  high: 'High relevance',
  medium: 'Medium relevance',
  low: 'Low relevance',
  not_applicable: 'Not applicable',
};

export function StepPatterns() {
  const { draft, update, errors, stages } = useWizard();
  const { data: packs } = useRulePacks();
  const { data: organization } = useOrganization();
  const variant = organization ? SECTOR_VARIANT[organization.sector] : undefined;
  const tagged = taggedStageIds(draft, stages);

  const togglePattern = (id: PatternId, on: boolean) =>
    update((d) => ({
      ...d,
      patternIds: on
        ? PATTERN_IDS.filter((p) => p === id || d.patternIds.includes(p))
        : d.patternIds.filter((p) => p !== id),
    }));
  const toggleStage = (id: string, on: boolean) =>
    update((d) => ({
      ...d,
      stageIds: on
        ? stages.map((s) => s.id).filter((s) => s === id || d.stageIds.includes(s))
        : d.stageIds.filter((s) => s !== id),
    }));

  return (
    <div className="grid gap-8">
      <fieldset className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-medium">
            Dark patterns ({draft.patternIds.length} of {PATTERN_IDS.length})
          </legend>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ patternIds: [...PATTERN_IDS] })}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ patternIds: [] })}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {PATTERN_IDS.map((id, index) => {
            const pack = packs?.find((p) => p.pattern_id === id);
            const relevance =
              pack && variant ? pack.sector_variants[variant].applicability : undefined;
            return (
              <div key={id} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id={`pattern-${id}`}
                  checked={draft.patternIds.includes(id)}
                  onCheckedChange={(v) => togglePattern(id, v === true)}
                  className="mt-0.5"
                />
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor={`pattern-${id}`} className="leading-snug">
                    <span className="text-muted-foreground tabular-nums">{index + 1}.</span>{' '}
                    {pack?.name ?? id}
                  </Label>
                  {pack ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{pack.definition}</p>
                  ) : null}
                  {relevance ? (
                    <Badge
                      variant={relevance === 'high' ? 'default' : 'outline'}
                      className="w-fit text-[11px]"
                      title={`Sector relevance for ${organization?.sector}`}
                    >
                      {RELEVANCE_LABEL[relevance]}
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <FieldError message={errors.patternIds} />
      </fieldset>

      <fieldset className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-medium">Journey stages in scope</legend>
          <div className="flex gap-1">
            {tagged.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => update({ stageIds: tagged })}
              >
                Use stages tagged in journeys
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ stageIds: stages.map((s) => s.id) })}
            >
              Select all
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id={`stage-${s.id}`}
                checked={draft.stageIds.includes(s.id)}
                onCheckedChange={(v) => toggleStage(s.id, v === true)}
              />
              <Label htmlFor={`stage-${s.id}`} className="font-normal">
                {s.name}
              </Label>
              {tagged.includes(s.id) ? (
                <Badge variant="secondary" className="ml-auto text-[11px]">
                  In journeys
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
        <FieldError message={errors.stageIds} />
      </fieldset>

      <ExclusionsEditor />
    </div>
  );
}

/** Scope exclusions: parts of the scope deliberately not assessed. Saved as coverage gaps. */
function ExclusionsEditor() {
  const { draft, update, errors, stages } = useWizard();
  const { data: packs } = useRulePacks();
  const inScope = stages.filter((s) => draft.stageIds.includes(s.id));
  const setExclusion = (id: string, patch: Partial<(typeof draft.exclusions)[number]>) =>
    update((d) => ({
      ...d,
      exclusions: d.exclusions.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Scope exclusions</legend>
      <p className="text-xs text-muted-foreground">
        Anything deliberately left out, such as a portal the client cannot give access to. Excluded
        cells show as not yet assessed in the compliance matrix and are listed in the report.
      </p>
      {draft.exclusions.map((e, index) => {
        const stageError = errors[`exclusion.${e.id}.stageId`];
        const reasonError = errors[`exclusion.${e.id}.reason`];
        return (
          <div key={e.id} className="grid gap-3 rounded-lg border p-3">
            <div className="grid gap-3 md:grid-cols-[14rem_1fr_auto] md:items-start">
              <Field id={`exclusion-${e.id}-stage`} label="Stage" error={stageError}>
                <Select
                  value={e.stageId}
                  onValueChange={(stageId) => setExclusion(e.id, { stageId })}
                >
                  <SelectTrigger
                    id={`exclusion-${e.id}-stage`}
                    className="w-full"
                    aria-label={`Stage for exclusion ${index + 1}`}
                  >
                    <SelectValue placeholder="Choose a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {inScope.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id={`exclusion-${e.id}-reason`} label="Reason" error={reasonError}>
                <Input
                  id={`exclusion-${e.id}-reason`}
                  value={e.reason}
                  onChange={(ev) => setExclusion(e.id, { reason: ev.target.value })}
                  placeholder="Third-party claims portal; access pending"
                  aria-label={`Reason for exclusion ${index + 1}`}
                  aria-describedby={`exclusion-${e.id}-reason-message`}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="md:mt-6"
                onClick={() =>
                  update((d) => ({ ...d, exclusions: d.exclusions.filter((x) => x.id !== e.id) }))
                }
              >
                <Trash2 />
                Remove
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Patterns:</span>
              <button
                type="button"
                onClick={() => setExclusion(e.id, { patternIds: [] })}
                aria-pressed={e.patternIds.length === 0}
                className="rounded-full border px-2 py-0.5 aria-pressed:border-brand aria-pressed:bg-brand/10"
              >
                All in scope
              </button>
              {draft.patternIds.map((pid) => {
                const on = e.patternIds.includes(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setExclusion(e.id, {
                        patternIds: on
                          ? e.patternIds.filter((x) => x !== pid)
                          : [...e.patternIds, pid],
                      })
                    }
                    className="rounded-full border px-2 py-0.5 aria-pressed:border-brand aria-pressed:bg-brand/10"
                  >
                    {packs?.find((p) => p.pattern_id === pid)?.name ?? pid}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            update((d) => ({
              ...d,
              exclusions: [
                ...d.exclusions,
                { id: draftId('ex'), stageId: '', patternIds: [], reason: '' },
              ],
            }))
          }
        >
          <Plus />
          Add exclusion
        </Button>
      </div>
    </fieldset>
  );
}
