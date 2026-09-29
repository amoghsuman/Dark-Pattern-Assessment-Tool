import { getPatternInfo } from '@dpat/rules';
import { MATRIX_CELL_STATE_LABELS } from '@dpat/shared';
import { CheckCheck, Eye } from 'lucide-react';

import {
  CELL_CLASSES,
  CELL_ICON_CLASSES,
  CELL_ICONS,
  cellLabel,
  STATE_ORDER,
} from '@/components/matrix/matrix-style';
import { cn } from '@/lib/utils';

import { SectionHeading } from '../report-primitives';
import type { ReportData } from '../report-types';

export function HeatmapSection({ data, number }: { data: ReportData; number: number }) {
  const { matrix } = data;
  const cells = new Map(matrix.cells.map((c) => [`${c.patternId}|${c.stageId}`, c]));

  return (
    <>
      <SectionHeading number={number} title="Compliance heatmap" id="heatmap" />
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {STATE_ORDER.map((s) => {
          const Icon = CELL_ICONS[s];
          return (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-sm',
                  CELL_CLASSES[s],
                )}
                aria-hidden
              >
                <Icon className={cn('size-3', CELL_ICON_CLASSES[s])} />
              </span>
              {MATRIX_CELL_STATE_LABELS[s]} ({matrix.cells.filter((c) => c.state === s).length})
            </span>
          );
        })}
        <span className="flex items-center gap-1">
          <Eye className="size-3" aria-hidden /> Awaiting review
        </span>
        <span className="flex items-center gap-1">
          <CheckCheck className="size-3" aria-hidden /> Remediated
        </span>
      </div>
      <table
        className="w-full border-separate border-spacing-0.5 text-[11px]"
        aria-label="Compliance heatmap"
      >
        <thead>
          <tr>
            <th scope="col" className="text-left font-medium text-muted-foreground">
              Pattern
            </th>
            {matrix.stages.map((s) => (
              <th
                key={s.id}
                scope="col"
                className="px-0.5 text-center align-bottom leading-tight font-medium text-muted-foreground"
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.patternIds.map((p) => (
            <tr key={p}>
              <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap">
                {getPatternInfo(p).name}
              </th>
              {matrix.stages.map((s) => {
                const cell = cells.get(`${p}|${s.id}`);
                if (!cell) return <td key={s.id} />;
                const Icon = CELL_ICONS[cell.state];
                return (
                  <td key={s.id} className="p-0">
                    <div
                      className={cn(
                        'relative flex h-7 items-center justify-center gap-0.5 rounded-[3px] font-semibold',
                        CELL_CLASSES[cell.state],
                      )}
                      aria-label={cellLabel(cell)}
                      role="img"
                    >
                      <Icon className={cn('size-3', CELL_ICON_CLASSES[cell.state])} aria-hidden />
                      {cell.findingIds.length > 0 ? cell.findingIds.length : null}
                      {cell.marker === 'awaiting_review' ? (
                        <Eye className="absolute top-0 right-0 size-2.5" aria-hidden />
                      ) : null}
                      {cell.marker === 'remediated' ? (
                        <CheckCheck className="absolute top-0 right-0 size-2.5" aria-hidden />
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
