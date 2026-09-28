'use client';

import { ROLE_LABELS } from '@dpat/shared';
import { LogOut } from 'lucide-react';
import { startTransition } from 'react';

import { signOut } from '@/app/access/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/data/hooks';
import { initials } from '@/lib/format';

export function UserMenu() {
  const { data: user } = useCurrentUser();

  if (!user) return <Skeleton className="size-8 rounded-full" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Account: ${user.name}, ${ROLE_LABELS[user.role]}`}
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block">{user.name}</span>
          <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {ROLE_LABELS[user.role]}
            {user.title ? ` · ${user.title}` : ''}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Call the action directly: a form inside the menu unmounts before it can submit. */}
        <DropdownMenuItem onSelect={() => startTransition(() => signOut())}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
