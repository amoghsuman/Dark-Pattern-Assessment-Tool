'use client';

import { RULE_PACK_SET_VERSION } from '@dpat/rules';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';

import { NAV_ITEMS } from './nav-items';

/** Full sidebar from `lg`; an icon rail between `md` and `lg`; hidden below `md` (see MobileNav). */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="print-hidden sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r bg-card md:flex lg:w-60">
      <Link
        href="/"
        className="flex h-14 items-center gap-2 border-b px-4 font-semibold tracking-tight"
        aria-label={`${brand.productName} home`}
      >
        <Image src={brand.logoPath} alt="" width={28} height={28} priority />
        <span className="hidden text-sm leading-tight lg:inline">{brand.productName}</span>
      </Link>
      <nav aria-label="Main" className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = item.matches(pathname);
          const link = (
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                'justify-center lg:justify-start',
                active && 'bg-accent text-foreground',
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                />
              ) : null}
              <item.icon className="size-4 shrink-0" />
              <span className="sr-only lg:not-sr-only">{item.label}</span>
            </Link>
          );
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className="hidden border-t p-4 text-xs text-muted-foreground lg:block">
        <p className="font-medium text-foreground">Rule packs</p>
        <p className="font-mono">{RULE_PACK_SET_VERSION}</p>
        <p className="mt-1">Draft, pending compliance review</p>
      </div>
    </aside>
  );
}
