'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';

import { NAV_ITEMS } from './nav-items';

/** Navigation drawer for narrow screens (below `md`). */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{brand.productName}</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={item.matches(pathname) ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-accent',
                item.matches(pathname) && 'bg-accent',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
