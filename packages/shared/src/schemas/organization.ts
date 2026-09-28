import { z } from 'zod';

import { IdSchema, RegulatorSchema, RoleSchema, SectorSchema, TimestampSchema } from './common';

export const JourneyStageSchema = z.object({
  id: IdSchema,
  /** Stable machine key, e.g. "proposal_onboarding". Survives renames. */
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().trim().min(1),
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type JourneyStage = z.infer<typeof JourneyStageSchema>;

export const OrganizationSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1),
  sector: SectorSchema,
  regulator: RegulatorSchema.optional(),
  /** Configurable and ordered; the compliance matrix columns follow this order. */
  journeyStages: z.array(JourneyStageSchema).min(1),
  createdAt: TimestampSchema,
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const UserSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  name: z.string().trim().min(1),
  email: z.email(),
  role: RoleSchema,
  title: z.string().optional(),
  active: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;
