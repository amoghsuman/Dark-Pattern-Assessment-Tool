'use client';

import { LockKeyhole } from 'lucide-react';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { unlock, type UnlockState } from './actions';

const initialState: UnlockState = { error: null };

export function AccessForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(unlock, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="passcode">Passcode</Label>
        <Input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? 'passcode-error' : undefined}
        />
        {state.error ? (
          <p id="passcode-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        <LockKeyhole />
        {pending ? 'Checking…' : 'Continue'}
      </Button>
    </form>
  );
}
