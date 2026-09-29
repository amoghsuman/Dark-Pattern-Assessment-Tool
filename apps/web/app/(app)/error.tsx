'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/** Route-level error boundary for the signed-in app. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <AlertTriangle className="size-10 text-destructive" aria-hidden />
      <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
      <p className="text-sm text-muted-foreground">
        The error has been logged. You can try again, or go back to the assessments list.
        {error.digest ? (
          <span className="mt-1 block font-mono text-xs">Reference: {error.digest}</span>
        ) : null}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Assessments</Link>
        </Button>
      </div>
    </div>
  );
}
