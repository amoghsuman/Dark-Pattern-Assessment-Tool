import { z } from 'zod';

export { PatternIdSchema, SeveritySchema, type PatternId, type Severity } from '@dpat/rules';

/** Entity IDs are opaque strings (UUID-shaped in fixtures, UUIDs in Supabase). */
export const IdSchema = z.string().min(1);

/** ISO 8601 timestamp with offset, stored in UTC. The UI renders in IST. */
export const TimestampSchema = z.iso.datetime({ offset: true });

/** Calendar date (YYYY-MM-DD). */
export const DateSchema = z.iso.date();

export const SectorSchema = z.enum(['insurance', 'banking', 'lending', 'payments', 'other']);
export type Sector = z.infer<typeof SectorSchema>;

export const RegulatorSchema = z.enum(['IRDAI', 'RBI', 'SEBI', 'PFRDA']);
export type Regulator = z.infer<typeof RegulatorSchema>;

export const RoleSchema = z.enum(['admin', 'assessor', 'reviewer', 'viewer']);
export type Role = z.infer<typeof RoleSchema>;

export const TargetTypeSchema = z.enum(['website', 'mobile_app', 'code_repository']);
export type TargetType = z.infer<typeof TargetTypeSchema>;

/** Analysis engines, in pipeline order. */
export const EngineSchema = z.enum([
  'screen_capture',
  'code_analysis',
  'backend_logic',
  'software_risk',
  'correlation',
]);
export type Engine = z.infer<typeof EngineSchema>;

export const FindingStatusSchema = z.enum([
  'detected',
  'under_review',
  'confirmed',
  'dismissed',
  'remediation_in_progress',
  'closed',
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const AssessmentStatusSchema = z.enum([
  'draft',
  'queued',
  'running',
  'in_review',
  'completed',
]);
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;

export const JourneyStepActionSchema = z.enum(['navigate', 'click', 'fill', 'wait', 'capture']);
export type JourneyStepAction = z.infer<typeof JourneyStepActionSchema>;

export const MatrixCellStateSchema = z.enum([
  'non_compliant',
  'in_progress',
  'compliant',
  'not_assessed',
]);
export type MatrixCellState = z.infer<typeof MatrixCellStateSchema>;
