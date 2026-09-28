'use client';

import { ROLE_LABELS, SAMPLE_ROLE_USERS, type Role } from '@dpat/shared';
import { Database, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser, useSampleMode, useUsers } from '@/lib/data/hooks';

const ROLES: Role[] = ['admin', 'assessor', 'reviewer', 'viewer'];

/** Persistent "Sample data" badge with the role switcher and reset. Rendered only in sample mode. */
export function SampleDataBadge() {
  const sample = useSampleMode();
  const { data: currentUser } = useCurrentUser();
  const { data: users } = useUsers();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!sample.enabled) return null;

  const nameFor = (role: Role) => users?.find((u) => u.id === SAMPLE_ROLE_USERS[role])?.name;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-brand/50 bg-brand/10 px-2.5 text-xs font-medium text-brand transition-colors hover:bg-brand/15 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Sample data options"
          >
            <Database className="size-3.5" aria-hidden />
            Sample data
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            You are viewing fictitious sample data. Changes are saved only in this browser.
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Act as</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentUser?.role ?? ''}
            onValueChange={(value) => {
              const role = value as Role;
              sample.setRole(role);
              toast.success(`Now acting as ${ROLE_LABELS[role]}`, { description: nameFor(role) });
            }}
          >
            {ROLES.map((role) => (
              <DropdownMenuRadioItem key={role} value={role}>
                <span className="flex flex-col">
                  <span>{ROLE_LABELS[role]}</span>
                  <span className="text-xs text-muted-foreground">{nameFor(role) ?? ' '}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
            <RotateCcw />
            Reset sample data…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset sample data?</DialogTitle>
            <DialogDescription>
              This discards every change made in this browser: review actions, comments, new
              assessments and settings. Your selected role is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                sample.reset();
                setConfirmReset(false);
                toast.success('Sample data reset');
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
