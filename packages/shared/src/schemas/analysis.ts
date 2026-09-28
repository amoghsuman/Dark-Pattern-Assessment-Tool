import { z } from 'zod';

import { EngineSchema, IdSchema, TimestampSchema } from './common';

export const EngineRunEventSchema = z.object({
  at: TimestampSchema,
  level: z.enum(['info', 'warn', 'error']),
  message: z.string().min(1),
});
export type EngineRunEvent = z.infer<typeof EngineRunEventSchema>;

export const EngineRunSchema = z.object({
  engine: EngineSchema,
  status: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  /** Drives the run-view timeline. */
  events: z.array(EngineRunEventSchema),
  metrics: z.object({
    itemsTotal: z.number().int().nonnegative(),
    itemsProcessed: z.number().int().nonnegative(),
    findingsRaised: z.number().int().nonnegative(),
  }),
});
export type EngineRun = z.infer<typeof EngineRunSchema>;

export const AnalysisRunSchema = z.object({
  id: IdSchema,
  assessmentId: IdSchema,
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  rulePackSetVersion: z.string().min(1),
  engines: z.array(EngineRunSchema).length(5),
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
});
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;
