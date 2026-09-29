import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SectionHeading({
  number,
  title,
  id,
}: {
  number: number;
  title: string;
  id: string;
}) {
  return (
    <h2
      id={id}
      className="mb-4 flex items-baseline gap-3 border-b pb-2 text-xl font-semibold tracking-tight"
    >
      <span className="text-muted-foreground tabular-nums">{number}.</span>
      {title}
    </h2>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-5 mb-2 text-sm font-semibold">{children}</h3>;
}

/** Compact table styling tuned for screen and A4 print. */
export function ReportTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table
        className={cn(
          'w-full border-collapse text-left text-xs [&_td]:border-b [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:border-b-2 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold',
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}
