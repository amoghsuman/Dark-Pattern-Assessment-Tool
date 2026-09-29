'use client';

import type { ScreenshotEvidence } from '@dpat/shared';
import { Eye, EyeOff, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useArtifact } from '@/lib/data/hooks';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const STEP = 0.5;
const PAN_STEP = 60;

/**
 * Annotated screenshot viewer. Boxes are positioned in fractions inside the same transformed layer
 * as the image, so they stay aligned at every zoom level and pan offset.
 */
export function ScreenshotViewer({
  evidence,
  activeCriterion,
  onSelectCriterion,
}: {
  evidence: ScreenshotEvidence;
  activeCriterion?: string | null;
  onSelectCriterion?: (criterionId: string | null) => void;
}) {
  const { data: artifact } = useArtifact(evidence.artifactId);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showBoxes, setShowBoxes] = useState(true);
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  if (!artifact) return <Skeleton className="h-[28rem] w-full" />;
  const ratio = artifact.width && artifact.height ? artifact.width / artifact.height : 16 / 10;
  const mobile = ratio < 1;

  const setZoomClamped = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    setZoom(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  };
  const fit = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (zoom === 1 || (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + e.clientX - drag.current.x,
      y: drag.current.oy + e.clientY - drag.current.y,
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const pan = (dx: number, dy: number) => setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    const actions: Record<string, () => void> = {
      '+': () => setZoomClamped(zoom + STEP),
      '=': () => setZoomClamped(zoom + STEP),
      '-': () => setZoomClamped(zoom - STEP),
      '0': fit,
      ArrowLeft: () => pan(PAN_STEP, 0),
      ArrowRight: () => pan(-PAN_STEP, 0),
      ArrowUp: () => pan(0, PAN_STEP),
      ArrowDown: () => pan(0, -PAN_STEP),
    };
    const action = actions[e.key];
    if (action && (zoom > 1 || !e.key.startsWith('Arrow'))) {
      e.preventDefault();
      action();
    }
  };

  const selectBox = (index: number | null) => {
    setActiveBox(index);
    const criterion = index === null ? null : (evidence.boxes[index]?.criterionId ?? null);
    onSelectCriterion?.(criterion);
  };

  return (
    <figure className="space-y-3">
      <div
        className="flex flex-wrap items-center gap-1"
        role="toolbar"
        aria-label="Screenshot controls"
      >
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setZoomClamped(zoom - STEP)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
        >
          <ZoomOut />
        </Button>
        <span
          className="w-12 text-center text-xs text-muted-foreground tabular-nums"
          aria-live="polite"
          data-testid="zoom-level"
        >
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setZoomClamped(zoom + STEP)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          <ZoomIn />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={fit}
          disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
        >
          <Maximize2 />
          Fit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setShowBoxes((v) => !v)}
          aria-pressed={showBoxes}
        >
          {showBoxes ? <EyeOff /> : <Eye />}
          {showBoxes ? 'Hide boxes' : 'Show boxes'}
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground md:inline">
          Drag or use arrow keys to pan when zoomed · + and − to zoom · 0 to fit
        </span>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-lg border bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
          mobile ? 'h-[36rem]' : 'aspect-[16/10] max-h-[36rem]',
          zoom > 1 && 'cursor-grab active:cursor-grabbing',
        )}
        tabIndex={0}
        role="group"
        aria-label={`Screenshot: ${evidence.caption}. ${evidence.boxes.length} annotated regions.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setZoomClamped(zoom + (e.deltaY < 0 ? STEP : -STEP));
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-3 transition-transform duration-150 ease-out motion-reduce:transition-none"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          data-testid="screenshot-layer"
        >
          <div
            className="relative max-h-full max-w-full bg-white shadow-sm"
            style={{
              aspectRatio: ratio,
              height: mobile ? '100%' : undefined,
              width: mobile ? undefined : '100%',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG evidence served as-is */}
            <img
              src={artifact.uri}
              alt={evidence.caption}
              className="size-full select-none"
              draggable={false}
            />
            {showBoxes
              ? evidence.boxes.map((box, i) => {
                  const active =
                    activeBox === i || (!!activeCriterion && box.criterionId === activeCriterion);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectBox(activeBox === i ? null : i)}
                      aria-label={`Region ${i + 1}: ${box.label}`}
                      aria-pressed={active}
                      className={cn(
                        'absolute rounded-[3px] border-2 border-matrix-non-compliant bg-matrix-non-compliant/10 transition-colors hover:bg-matrix-non-compliant/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active && 'border-[3px] bg-matrix-non-compliant/25',
                      )}
                      style={{
                        left: `${box.x * 100}%`,
                        top: `${box.y * 100}%`,
                        width: `${box.width * 100}%`,
                        height: `${box.height * 100}%`,
                      }}
                    >
                      <span
                        className="absolute -top-2.5 -left-2.5 flex size-5 items-center justify-center rounded-full bg-matrix-non-compliant text-[10px] font-bold text-matrix-non-compliant-foreground shadow"
                        style={{ transform: `scale(${1 / zoom})` }}
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      </div>

      <figcaption className="space-y-2">
        <ol className="grid gap-1.5 sm:grid-cols-2" aria-label="Annotated regions">
          {evidence.boxes.map((box, i) => {
            const active =
              activeBox === i || (!!activeCriterion && box.criterionId === activeCriterion);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectBox(activeBox === i ? null : i)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                    active && 'border-matrix-non-compliant bg-matrix-non-compliant/5',
                  )}
                >
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-matrix-non-compliant text-[10px] font-bold text-matrix-non-compliant-foreground"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{box.label}</span>
                  {box.criterionId ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {box.criterionId}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          {evidence.caption} · {artifact.fileName ?? artifact.uri} · captured{' '}
          {formatDateTime(artifact.capturedAt)}
        </p>
      </figcaption>
    </figure>
  );
}
