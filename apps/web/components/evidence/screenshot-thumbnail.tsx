'use client';

import type { ScreenshotEvidence } from '@dpat/shared';

import { Skeleton } from '@/components/ui/skeleton';
import { useArtifact } from '@/lib/data/hooks';
import { cn } from '@/lib/utils';

/** Small screenshot preview with bounding boxes overlaid from the evidence coordinates. */
export function ScreenshotThumbnail({
  evidence,
  className,
}: {
  evidence: ScreenshotEvidence;
  className?: string;
}) {
  const { data: artifact } = useArtifact(evidence.artifactId);
  if (!artifact) return <Skeleton className={cn('aspect-video w-full', className)} />;
  const ratio = artifact.width && artifact.height ? artifact.width / artifact.height : 16 / 10;

  return (
    <figure className={cn('space-y-1', className)}>
      <div
        className="relative mx-auto max-h-72 overflow-hidden rounded-md border bg-white"
        style={{ aspectRatio: ratio, maxWidth: ratio < 1 ? '12rem' : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG evidence served as-is */}
        <img src={artifact.uri} alt={evidence.caption} className="size-full object-contain" />
        {evidence.boxes.map((box, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute rounded-sm border-2 border-matrix-non-compliant bg-matrix-non-compliant/10"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
          />
        ))}
      </div>
      <figcaption className="text-xs text-muted-foreground">{evidence.caption}</figcaption>
    </figure>
  );
}
