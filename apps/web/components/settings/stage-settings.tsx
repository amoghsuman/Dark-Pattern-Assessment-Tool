'use client';

import type { JourneyStage } from '@dpat/shared';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization, useSaveJourneyStages } from '@/lib/data/hooks';
import { toKey } from '@/lib/format';
import { can, useRole } from '@/lib/permissions';

import { ReadOnlyNote } from './read-only-note';

export function StageSettings() {
  const { data, isPending, error } = useOrganization();
  if (error) return <ErrorState error={error} />;
  if (isPending) return <Skeleton className="h-96 w-full" />;
  const signature = data.journeyStages.map((s) => `${s.id}:${s.name}`).join('|');
  return <StageEditor key={signature} stages={data.journeyStages} />;
}

function StageEditor({ stages }: { stages: JourneyStage[] }) {
  const role = useRole();
  const editable = role !== null && can.manageSettings(role);
  const save = useSaveJourneyStages();
  const [draft, setDraft] = useState<JourneyStage[]>(stages);
  const [newName, setNewName] = useState('');

  const dirty =
    JSON.stringify(draft.map(({ id, name }) => [id, name])) !==
    JSON.stringify(stages.map(({ id, name }) => [id, name]));
  const invalid = draft.some((s) => s.name.trim() === '');

  const move = (index: number, delta: -1 | 1) => {
    const next = [...draft];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    setDraft(next);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    let key = toKey(name);
    while (draft.some((s) => s.key === key)) key = `${key}_2`;
    setDraft([
      ...draft,
      { id: `stg-${key}-${Date.now().toString(36)}`, key, name, order: draft.length },
    ]);
    setNewName('');
  };

  const onSave = () => {
    save.mutate(
      draft.map((s) => ({ ...s, name: s.name.trim() })),
      {
        onSuccess: () => toast.success('Journey stages saved'),
        onError: (err) =>
          toast.error('Could not save journey stages', { description: err.message }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journey stages</CardTitle>
        <CardDescription>
          Stages tag journey steps and findings. The compliance matrix shows them as columns in this
          order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editable ? <ReadOnlyNote /> : null}
        <ol className="divide-y rounded-md border" aria-label="Journey stages">
          {draft.map((stage, index) => (
            <li key={stage.id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-6 text-right text-sm text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              {editable ? (
                <Input
                  value={stage.name}
                  aria-label={`Name of stage ${index + 1}`}
                  onChange={(e) =>
                    setDraft(
                      draft.map((s) => (s.id === stage.id ? { ...s, name: e.target.value } : s)),
                    )
                  }
                  className="h-8"
                />
              ) : (
                <span className="flex-1 text-sm">{stage.name}</span>
              )}
              {editable ? (
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move ${stage.name} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move ${stage.name} down`}
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${stage.name}`}
                    onClick={() => setDraft(draft.filter((s) => s.id !== stage.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        {editable ? (
          <>
            <form onSubmit={add} className="flex max-w-md gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New stage name, e.g. Nominee Update"
                aria-label="New stage name"
              />
              <Button type="submit" variant="outline" disabled={newName.trim() === ''}>
                <Plus />
                Add
              </Button>
            </form>
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={!dirty || invalid || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save stages'}
              </Button>
              <Button variant="outline" onClick={() => setDraft(stages)} disabled={!dirty}>
                Discard changes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stages that already have findings cannot be removed.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
