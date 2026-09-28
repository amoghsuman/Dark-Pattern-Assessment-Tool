import { z } from 'zod';

import {
  AssessmentStatusSchema,
  IdSchema,
  JourneyStepActionSchema,
  PatternIdSchema,
  TimestampSchema,
} from './common';

// ---------------------------------------------------------------- targets

const TargetBase = z.object({
  id: IdSchema,
  assessmentId: IdSchema,
  name: z.string().trim().min(1),
});

export const WebsiteTargetSchema = TargetBase.extend({
  type: z.literal('website'),
  baseUrl: z.url(),
  environment: z.enum(['production', 'uat']),
});

export const MobileAppTargetSchema = TargetBase.extend({
  type: z.literal('mobile_app'),
  platform: z.enum(['android', 'ios']),
  appId: z.string().min(1),
  version: z.string().min(1),
  environment: z.enum(['production', 'uat']),
  buildArtifactId: IdSchema.optional(),
});

export const CodeRepositoryTargetSchema = TargetBase.extend({
  type: z.literal('code_repository'),
  repoUrl: z.url().optional(),
  branch: z.string().optional(),
  commitSha: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/)
    .optional(),
  sourceArtifactId: IdSchema.optional(),
  languages: z.array(z.string().min(1)).min(1),
});

export const TargetSchema = z.discriminatedUnion('type', [
  WebsiteTargetSchema,
  MobileAppTargetSchema,
  CodeRepositoryTargetSchema,
]);
export type Target = z.infer<typeof TargetSchema>;
export type WebsiteTarget = z.infer<typeof WebsiteTargetSchema>;
export type MobileAppTarget = z.infer<typeof MobileAppTargetSchema>;
export type CodeRepositoryTarget = z.infer<typeof CodeRepositoryTargetSchema>;

// ---------------------------------------------------------------- journeys

/** One action in a scripted journey. A `capture` step produces a screen artifact. */
export const JourneyStepSchema = z
  .object({
    id: IdSchema,
    order: z.number().int().nonnegative(),
    action: JourneyStepActionSchema,
    /** Stage tag used for the compliance matrix. */
    stageId: IdSchema,
    label: z.string().trim().min(1),
    /** URL (navigate), selector or accessibility label (click, fill). */
    target: z.string().optional(),
    /** Value for fill steps; sensitive values are masked in fixtures and UI. */
    value: z.string().optional(),
    sensitive: z.boolean().optional(),
    waitMs: z.number().int().positive().optional(),
    screenArtifactId: IdSchema.optional(),
  })
  .superRefine((step, ctx) => {
    const needsTarget =
      step.action === 'navigate' || step.action === 'click' || step.action === 'fill';
    if (needsTarget && !step.target) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: `${step.action} needs a target` });
    }
    if (step.action === 'fill' && step.value === undefined) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'fill needs a value' });
    }
    if (step.action === 'wait' && step.waitMs === undefined) {
      ctx.addIssue({ code: 'custom', path: ['waitMs'], message: 'wait needs waitMs' });
    }
  });
export type JourneyStep = z.infer<typeof JourneyStepSchema>;

export const JourneySchema = z.object({
  id: IdSchema,
  assessmentId: IdSchema,
  targetId: IdSchema,
  name: z.string().trim().min(1),
  stageIds: z.array(IdSchema).min(1),
  steps: z.array(JourneyStepSchema),
});
export type Journey = z.infer<typeof JourneySchema>;

// ---------------------------------------------------------------- artifacts

export const ArtifactKindSchema = z.enum([
  'screenshot',
  'dom_snapshot',
  'source_archive',
  'apk',
  'ipa',
  'config_file',
  'api_spec',
]);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const ArtifactSchema = z.object({
  id: IdSchema,
  assessmentId: IdSchema,
  targetId: IdSchema.optional(),
  kind: ArtifactKindSchema,
  /** `/evidence/*.svg` in sample mode; a storage path in Stage C. */
  uri: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  capturedAt: TimestampSchema,
  journeyStepId: IdSchema.optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// ---------------------------------------------------------------- assessment

export const AssessmentSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  name: z.string().trim().min(1),
  description: z.string().optional(),
  status: AssessmentStatusSchema,
  targetIds: z.array(IdSchema),
  patternIds: z.array(PatternIdSchema).min(1),
  /** Journey stages in scope (IDs from the organisation's stage configuration). */
  stageIds: z.array(IdSchema).min(1),
  /** Rule pack set the assessment ran against, e.g. "ccpa-2023@0.1.0-draft". */
  rulePackSetVersion: z.string().min(1),
  /**
   * Parts of the scope deliberately not assessed yet (for example a portal awaiting access).
   * These cells show as "not yet assessed" in the compliance matrix.
   */
  coverageGaps: z
    .array(
      z.object({
        stageId: IdSchema,
        /** Omit to mean every pattern in scope. */
        patternIds: z.array(PatternIdSchema).optional(),
        reason: z.string().min(1),
      }),
    )
    .default([]),
  progress: z.object({
    completedSteps: z.number().int().nonnegative(),
    totalSteps: z.number().int().nonnegative(),
  }),
  createdBy: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
});
export type Assessment = z.infer<typeof AssessmentSchema>;
