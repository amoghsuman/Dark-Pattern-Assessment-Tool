import type { ClientAccessItem } from '@dpat/shared';
import { CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

const STATUS = {
  provided: { icon: CheckCircle2, label: 'Provided', className: 'text-matrix-compliant' },
  outstanding: { icon: CircleDashed, label: 'Outstanding', className: 'text-severity-high' },
  not_required: { icon: MinusCircle, label: 'Not required', className: 'text-muted-foreground' },
} as const;

const CATEGORY_LABELS: Record<ClientAccessItem['category'], string> = {
  website: 'Website',
  android: 'Android app',
  ios: 'iOS app',
  source: 'Source code',
  backend_config: 'Backend configuration',
  general: 'General',
};

/** Client access checklist grouped by target. Status is shown by icon and text, not colour alone. */
export function ClientAccessList({
  items,
  compact = false,
}: {
  items: ClientAccessItem[];
  compact?: boolean;
}) {
  const categories = [...new Set(items.map((i) => i.category))];
  const outstanding = items.filter((i) => i.status === 'outstanding').length;

  return (
    <div className="space-y-3">
      <p className="text-sm" data-testid="client-access-summary">
        {items.filter((i) => i.status === 'provided').length} provided ·{' '}
        <span className={outstanding > 0 ? 'font-medium' : undefined}>
          {outstanding} outstanding
        </span>
      </p>
      {categories.map((category) => (
        <div key={category} className="space-y-1.5">
          {!compact ? (
            <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {CATEGORY_LABELS[category]}
            </h4>
          ) : null}
          <ul className="space-y-1.5" aria-label={`${CATEGORY_LABELS[category]} access`}>
            {items
              .filter((i) => i.category === category)
              .map((item) => {
                const s = STATUS[item.status];
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 text-sm"
                    data-status={item.status}
                  >
                    <s.icon className={cn('mt-0.5 size-4 shrink-0', s.className)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      {item.label}
                      {item.detail ? (
                        <span className="block text-xs text-muted-foreground">{item.detail}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{s.label}</span>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
