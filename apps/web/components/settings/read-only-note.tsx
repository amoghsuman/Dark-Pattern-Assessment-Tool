import { Lock } from 'lucide-react';

export function ReadOnlyNote() {
  return (
    <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
      <Lock className="size-4" aria-hidden />
      Only admins can change settings. Switch role from the Sample data badge to try it.
    </p>
  );
}
