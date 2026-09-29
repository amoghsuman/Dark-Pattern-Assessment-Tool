import { MATRIX_CELL_STATE_LABELS, type MatrixCell, type MatrixCellState } from '@dpat/shared';
import { CheckCircle2, Clock, Minus, XCircle, type LucideIcon } from 'lucide-react';

/**
 * Fill + foreground per state. Exceptions (red, amber) are solid so they stand out; compliant
 * cells are a green tint so a mostly compliant matrix stays calm. Every cell also shows an
 * icon, so colour is never the only cue.
 */
export const CELL_CLASSES: Record<MatrixCellState, string> = {
  non_compliant: 'bg-matrix-non-compliant text-matrix-non-compliant-foreground',
  in_progress: 'bg-matrix-in-progress text-matrix-in-progress-foreground',
  compliant: 'bg-matrix-compliant/15 text-foreground ring-1 ring-inset ring-matrix-compliant/35',
  not_assessed: 'bg-matrix-not-assessed text-matrix-not-assessed-foreground',
};

/** Icon colour where it differs from the cell foreground. */
export const CELL_ICON_CLASSES: Partial<Record<MatrixCellState, string>> = {
  compliant: 'text-matrix-compliant',
};

export const SWATCH_CLASSES: Record<MatrixCellState, string> = {
  non_compliant: 'bg-matrix-non-compliant',
  in_progress: 'bg-matrix-in-progress',
  compliant: 'bg-matrix-compliant',
  not_assessed: 'bg-matrix-not-assessed ring-1 ring-inset ring-border',
};

export const CELL_ICONS: Record<MatrixCellState, LucideIcon> = {
  non_compliant: XCircle,
  in_progress: Clock,
  compliant: CheckCircle2,
  not_assessed: Minus,
};

export const STATE_ORDER: MatrixCellState[] = [
  'non_compliant',
  'in_progress',
  'compliant',
  'not_assessed',
];

export const STATE_DESCRIPTIONS: Record<MatrixCellState, string> = {
  non_compliant: 'At least one finding is confirmed.',
  in_progress: 'Findings are detected, under review or in remediation.',
  compliant: 'Assessed with no open findings.',
  not_assessed: 'Out of scope, deferred or not yet analysed.',
};

export const MARKER_LABELS = {
  awaiting_review: 'Awaiting review',
  remediated: 'Remediated',
} as const;

export function cellLabel(cell: MatrixCell): string {
  const parts: string[] = [MATRIX_CELL_STATE_LABELS[cell.state]];
  if (cell.marker) parts.push(MARKER_LABELS[cell.marker]);
  const n = cell.findingIds.length;
  if (n > 0) parts.push(`${n} ${n === 1 ? 'finding' : 'findings'}`);
  return parts.join(', ');
}
