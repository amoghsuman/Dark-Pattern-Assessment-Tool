'use client';

import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FacetOption<T extends string> {
  value: T;
  label: string;
  count: number;
  marker?: ReactNode;
}

/** Multi-select filter with search and per-option counts. */
export function FacetFilter<T extends string>({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: FacetOption<T>[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
}) {
  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
          aria-label={`Filter by ${title.toLowerCase()}`}
        >
          {title}
          {selected.length > 0 ? (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {selected.length}
            </Badge>
          ) : null}
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          {options.length > 6 ? <CommandInput placeholder={title} /> : null}
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = selected.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    onSelect={() => toggle(o.value)}
                    data-checked={isSelected}
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'opacity-60',
                      )}
                      aria-hidden
                    >
                      {isSelected ? <Check className="size-3" /> : null}
                    </span>
                    {o.marker}
                    <span className="flex-1 truncate">{o.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    Clear {title.toLowerCase()} filter
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
