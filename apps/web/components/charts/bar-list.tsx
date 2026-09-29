'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Tailwind background class for the mark. One series → one colour for every bar. */
  barClass?: string;
  /** Marker (dot) shown before the label, for status/severity rows. */
  dotClass?: string;
  href?: Route;
  tooltip?: ReactNode;
}

/**
 * Horizontal bar list: label, bar, value at the tip. Marks follow the dataviz specs (≤ 24px,
 * 4px rounded data end, square at the baseline, recessive axis) and every value is printed, so
 * the list is its own table view. Text never takes the mark colour.
 */
export function BarList({
  rows,
  ariaLabel,
  max,
  labelWidth = 'w-44',
}: {
  rows: BarRow[];
  ariaLabel: string;
  max?: number;
  labelWidth?: string;
}) {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => r.value)));

  return (
    <ul aria-label={ariaLabel} className="space-y-1.5">
      {rows.map((row) => {
        const pct = (row.value / top) * 100;
        const content = (
          <div
            className={cn(
              'group grid grid-cols-[auto_1fr_2.5rem] items-center gap-3 rounded-md px-1 py-1',
              row.href && 'transition-colors hover:bg-accent/60',
            )}
          >
            <span className={cn('flex min-w-0 items-center gap-2 text-sm', labelWidth)}>
              {row.dotClass ? (
                <span aria-hidden className={cn('size-2 shrink-0 rounded-full', row.dotClass)} />
              ) : null}
              <span className="truncate">{row.label}</span>
            </span>
            <span className="relative h-3 border-l border-border" aria-hidden>
              {row.value > 0 ? (
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-r-[4px]',
                    row.barClass ?? 'bg-brand',
                  )}
                  style={{ width: `max(${pct}%, 3px)` }}
                />
              ) : null}
            </span>
            <span className="text-right text-sm text-muted-foreground tabular-nums">
              {row.value}
            </span>
          </div>
        );
        const linked = row.href ? (
          <Link
            href={row.href}
            className="block rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {content}
          </Link>
        ) : (
          content
        );
        return (
          <li key={row.key}>
            {row.tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{linked}</div>
                </TooltipTrigger>
                <TooltipContent side="top" align="end">
                  {row.tooltip}
                </TooltipContent>
              </Tooltip>
            ) : (
              linked
            )}
          </li>
        );
      })}
    </ul>
  );
}
