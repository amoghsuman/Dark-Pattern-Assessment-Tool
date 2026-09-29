'use client';

import { getPatternInfo, type PatternId } from '@dpat/rules';
import {
  MATRIX_CELL_STATE_LABELS,
  type ComplianceMatrix as Matrix,
  type MatrixCell,
} from '@dpat/shared';
import { CheckCheck, Eye } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  CELL_CLASSES,
  CELL_ICON_CLASSES,
  CELL_ICONS,
  cellLabel,
  MARKER_LABELS,
  STATE_DESCRIPTIONS,
  STATE_ORDER,
  SWATCH_CLASSES,
} from './matrix-style';

export interface CellSelection {
  patternId: PatternId;
  stageId: string;
}

function cellMap(matrix: Matrix) {
  return new Map(matrix.cells.map((c) => [`${c.patternId}|${c.stageId}`, c]));
}

export function MatrixLegend({ matrix }: { matrix: Matrix }) {
  const counts = Object.fromEntries(
    STATE_ORDER.map((s) => [s, matrix.cells.filter((c) => c.state === s).length]),
  );
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3" aria-label="Legend">
      {STATE_ORDER.map((state) => {
        const Icon = CELL_ICONS[state];
        return (
          <div key={state} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                'mt-0.5 flex size-5 items-center justify-center rounded',
                CELL_CLASSES[state],
              )}
              aria-hidden
            >
              <Icon className={cn('size-3.5', CELL_ICON_CLASSES[state])} />
            </span>
            <span>
              <span className="font-medium">{MATRIX_CELL_STATE_LABELS[state]}</span>{' '}
              <span className="text-muted-foreground tabular-nums">({counts[state]})</span>
              <span className="block text-xs text-muted-foreground">
                {STATE_DESCRIPTIONS[state]}
              </span>
            </span>
          </div>
        );
      })}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Eye className="size-3.5" aria-hidden /> {MARKER_LABELS.awaiting_review}: every finding is
          still Detected
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCheck className="size-3.5" aria-hidden /> {MARKER_LABELS.remediated}: every finding
          is Closed
        </span>
      </div>
    </div>
  );
}

/** Full matrix: 13 patterns (rows) × configured journey stages (columns). */
export function ComplianceMatrixGrid({
  matrix,
  onSelect,
  selected,
}: {
  matrix: Matrix;
  onSelect: (selection: CellSelection) => void;
  selected?: CellSelection | null;
}) {
  const cells = cellMap(matrix);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table
        className="w-full min-w-[56rem] border-separate border-spacing-0.5 p-1 text-sm"
        aria-label="Compliance matrix"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-card px-2 py-2 text-left text-xs font-medium text-muted-foreground"
            >
              Pattern
            </th>
            {matrix.stages.map((stage) => (
              <th
                key={stage.id}
                scope="col"
                className="min-w-20 px-1 py-2 text-center align-bottom text-xs leading-tight font-medium text-muted-foreground"
              >
                {stage.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.patternIds.map((patternId) => {
            const info = getPatternInfo(patternId);
            return (
              <tr key={patternId}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium whitespace-nowrap"
                >
                  <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">
                    {info.annexureItem}.
                  </span>
                  {info.name}
                </th>
                {matrix.stages.map((stage) => {
                  const cell = cells.get(`${patternId}|${stage.id}`);
                  if (!cell) return <td key={stage.id} />;
                  const isSelected =
                    selected?.patternId === patternId && selected.stageId === stage.id;
                  return (
                    <td key={stage.id} className="p-0">
                      <MatrixCellButton
                        cell={cell}
                        label={`${info.name}, ${stage.name}: ${cellLabel(cell)}`}
                        selected={isSelected}
                        onClick={() => onSelect({ patternId, stageId: stage.id })}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatrixCellButton({
  cell,
  label,
  selected,
  onClick,
}: {
  cell: MatrixCell;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = CELL_ICONS[cell.state];
  const count = cell.findingIds.length;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      data-state={cell.state}
      data-marker={cell.marker ?? undefined}
      className={cn(
        'relative flex h-10 w-full items-center justify-center gap-1 rounded-[4px] text-xs font-semibold tabular-nums transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none dark:hover:brightness-110',
        CELL_CLASSES[cell.state],
        selected && 'ring-2 ring-foreground ring-offset-1 ring-offset-card',
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', CELL_ICON_CLASSES[cell.state])} aria-hidden />
      {count > 0 ? <span>{count}</span> : null}
      {cell.marker === 'awaiting_review' ? (
        <Eye className="absolute top-0.5 right-0.5 size-3" aria-hidden />
      ) : null}
      {cell.marker === 'remediated' ? (
        <CheckCheck className="absolute top-0.5 right-0.5 size-3" aria-hidden />
      ) : null}
    </button>
  );
}

/** Compact heatmap for the overview. Each cell links to the full matrix with that cell open. */
export function CompactMatrix({
  matrix,
  hrefFor,
}: {
  matrix: Matrix;
  hrefFor: (s: CellSelection) => string;
}) {
  const cells = cellMap(matrix);
  return (
    <div className="overflow-x-auto">
      <table
        className="border-separate border-spacing-0.5 text-xs"
        aria-label="Compliance matrix summary"
      >
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Pattern
            </th>
            {matrix.stages.map((s) => (
              <th
                key={s.id}
                scope="col"
                className="w-6 font-normal text-muted-foreground"
                title={s.name}
              >
                <span className="sr-only">{s.name}</span>
                <span aria-hidden>{s.order + 1}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.patternIds.map((patternId) => {
            const info = getPatternInfo(patternId);
            return (
              <tr key={patternId}>
                <th
                  scope="row"
                  className="pr-2 text-left font-normal whitespace-nowrap text-muted-foreground"
                >
                  {info.name}
                </th>
                {matrix.stages.map((stage) => {
                  const cell = cells.get(`${patternId}|${stage.id}`);
                  if (!cell) return <td key={stage.id} />;
                  return (
                    <td key={stage.id} className="p-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={hrefFor({ patternId, stageId: stage.id }) as Route}
                            aria-label={`${info.name}, ${stage.name}: ${cellLabel(cell)}`}
                            className={cn(
                              'block size-5 rounded-[3px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                              SWATCH_CLASSES[cell.state],
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">
                            {info.name} · {stage.name}
                          </p>
                          <p className="text-xs opacity-80">{cellLabel(cell)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
