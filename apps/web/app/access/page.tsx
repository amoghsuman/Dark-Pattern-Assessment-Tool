import type { Metadata } from 'next';
import Image from 'next/image';

import { brand } from '@/config/brand';
import { getSitePasscode } from '@/lib/access/config';
import { safeNextPath } from '@/lib/access/redirect';

import { AccessForm } from './access-form';

export const metadata: Metadata = { title: 'Access' };

export default async function AccessPage({ searchParams }: PageProps<'/access'>) {
  const { next } = await searchParams;
  const configured = getSitePasscode() !== '';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src={brand.logoPath} alt="" width={40} height={40} priority />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">{brand.productName}</h1>
            <p className="text-sm text-muted-foreground">Enter the passcode to continue.</p>
          </div>
        </div>
        {configured ? (
          <AccessForm next={safeNextPath(Array.isArray(next) ? next[0] : next)} />
        ) : (
          <p role="alert" className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Access is not configured. Set <code className="font-mono">SITE_PASSCODE</code> and
            restart the app.
          </p>
        )}
      </div>
    </main>
  );
}
