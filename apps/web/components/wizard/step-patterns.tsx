'use client';

import { PATTERN_IDS, type PatternId } from '@dpat/rules';
import type { Sector } from '@dpat/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useOrganization, useRulePacks } from '@/lib/data/hooks';
import { taggedStageIds } from '@/lib/wizard/draft';

import { FieldError } from './field';
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
    </div>
  );
}
