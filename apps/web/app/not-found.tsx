import { SearchX } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you asked for does not exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Go to assessments</Link>
      </Button>
    </main>
  );
}
