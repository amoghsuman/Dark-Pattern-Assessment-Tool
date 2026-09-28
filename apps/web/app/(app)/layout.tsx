import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { brand } from '@/config/brand';

/** Application shell. The full header, sidebar and sample-data badge arrive in M4. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="print-hidden flex h-14 items-center justify-between border-b bg-card px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Image src={brand.logoPath} alt="" width={24} height={24} priority />
          <span>{brand.productName}</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
