import { TARGET_TYPE_LABELS, type Target, type TargetType } from '@dpat/shared';
import { Code2, Globe, Server, Smartphone, type LucideIcon } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const TARGET_ICONS: Record<TargetType, LucideIcon> = {
  website: Globe,
  mobile_app: Smartphone,
  code_repository: Code2,
  backend_config: Server,
};

export function targetDetail(target: Target): string {
  switch (target.type) {
    case 'website':
      return `${target.baseUrl} (${target.environmentLabel ?? target.environment})`;
    case 'mobile_app':
      return `${target.appId} v${target.version} (${target.platform}, ${target.environment})`;
    case 'code_repository':
      return target.source.kind === 'repository'
        ? `${target.source.branch} @ ${target.source.commitSha.slice(0, 7)} (read-only)`
        : `Source archive · ${target.languages.join(', ')}`;
    case 'backend_config':
      return `${target.configArtifactIds.length} configuration files`;
  }
}

export function TargetIcons({ targets }: { targets: Target[] }) {
  return (
    <div className="flex items-center gap-1">
      {targets.map((t) => {
        const Icon = TARGET_ICONS[t.type];
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <span
                className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground"
                aria-label={`${TARGET_TYPE_LABELS[t.type]}: ${t.name}`}
                role="img"
              >
                <Icon className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{t.name}</p>
              <p className="text-xs opacity-80">{targetDetail(t)}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
