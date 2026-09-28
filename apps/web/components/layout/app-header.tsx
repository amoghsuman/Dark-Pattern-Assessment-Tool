'use client';

import { Building2 } from 'lucide-react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/lib/data/hooks';

import { MobileNav } from './mobile-nav';
import { SampleDataBadge } from './sample-data-badge';
import { UserMenu } from './user-menu';

export function AppHeader() {
  const { data: organization } = useOrganization();

  return (
    <header className="print-hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6">
      <MobileNav />
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {organization ? (
          <span className="truncate font-medium" data-testid="organization-name">
            {organization.name}
          </span>
        ) : (
          <Skeleton className="h-4 w-40" />
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <SampleDataBadge />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
