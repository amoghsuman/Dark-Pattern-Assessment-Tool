'use client';

import { SECTOR_LABELS, type Organization, type Regulator, type Sector } from '@dpat/shared';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization, useUpdateOrganization } from '@/lib/data/hooks';
import { can, useRole } from '@/lib/permissions';

import { ReadOnlyNote } from './read-only-note';

const REGULATORS: Regulator[] = ['IRDAI', 'RBI', 'SEBI', 'PFRDA'];
const NO_REGULATOR = 'none';

export function OrganisationSettings() {
  const { data, isPending, error } = useOrganization();
  if (error) return <ErrorState error={error} />;
  if (isPending) return <Skeleton className="h-64 w-full" />;
  // Keyed so the form resets when the stored organisation changes (e.g. after a reset).
  return (
    <OrganisationForm
      key={`${data.name}|${data.sector}|${data.regulator ?? ''}`}
      organization={data}
    />
  );
}

function OrganisationForm({ organization }: { organization: Organization }) {
  const role = useRole();
  const editable = role !== null && can.manageSettings(role);
  const update = useUpdateOrganization();
  const [name, setName] = useState(organization.name);
  const [sector, setSector] = useState<Sector>(organization.sector);
  const [regulator, setRegulator] = useState<string>(organization.regulator ?? NO_REGULATOR);

  const dirty =
    name !== organization.name ||
    sector !== organization.sector ||
    regulator !== (organization.regulator ?? NO_REGULATOR);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        name: name.trim(),
        sector,
        ...(regulator !== NO_REGULATOR ? { regulator: regulator as Regulator } : {}),
      },
      {
        onSuccess: () => toast.success('Organisation updated'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation</CardTitle>
        <CardDescription>Shown in the header and on report covers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
          {!editable ? <ReadOnlyNote /> : null}
          <div className="grid gap-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editable}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="org-sector">Sector</Label>
              <Select
                value={sector}
                onValueChange={(v) => setSector(v as Sector)}
                disabled={!editable}
              >
                <SelectTrigger id="org-sector" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SECTOR_LABELS) as Sector[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SECTOR_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-regulator">Primary regulator</Label>
              <Select value={regulator} onValueChange={setRegulator} disabled={!editable}>
                <SelectTrigger id="org-regulator" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REGULATOR}>None</SelectItem>
                  {REGULATORS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {editable ? (
            <div>
              <Button type="submit" disabled={!dirty || name.trim() === '' || update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
