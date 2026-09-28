import { LogOut } from 'lucide-react';

import { signOut } from '@/app/access/actions';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
        <LogOut />
      </Button>
    </form>
  );
}
