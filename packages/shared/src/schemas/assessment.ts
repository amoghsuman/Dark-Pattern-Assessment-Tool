import { z } from 'zod';

import {
  AssessmentStatusSchema,
  IdSchema,
  JourneyStepActionSchema,
  PatternIdSchema,
  TimestampSchema,
} from './common';
import {
  ClientAccessItemSchema,
  CodeSourceSchema,
  ConfigTypeSchema,
  CredentialRefSchema,
  OtpHandlingSchema,
} from './inputs';

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
  /** Free-text environment name as the client calls it, e.g. "UAT-2". */
  environmentLabel: z.string().trim().min(1).optional(),
  credentials: z.array(CredentialRefSchema).default([]),
  testDataSetIds: z.array(IdSchema).default([]),
  otpHandling: OtpHandlingSchema.default({ mode: 'not_required' }),
});

export const MobileAppTargetSchema = TargetBase.extend({
  type: z.literal('mobile_app'),
  platform: z.enum(['android', 'ios']),
  /** Package name (Android) or bundle ID (iOS). */
  appId: z.string().min(1),
  version: z.string().min(1),
  environment: z.enum(['production', 'uat']),
  buildArtifactId: IdSchema.optional(),
  /** Whether the package name and version were read from the uploaded build. */
  appIdSource: z.enum(['read_from_file', 'entered']).optional(),
  /** iOS only: the client confirmed the IPA is a decrypted build. */
  decryptedBuild: z.boolean().optional(),
});

export const CodeRepositoryTargetSchema = TargetBase.extend({
  type: z.literal('code_repository'),
  source: CodeSourceSchema,
  languages: z.array(z.string().min(1)).min(1),
});

export const BackendConfigTargetSchema = TargetBase.extend({
  type: z.literal('backend_config'),
  /** Configuration files (artifacts of kind config_file, each tagged with a config type). */
  configArtifactIds: z.array(IdSchema).min(1),
});

export const TargetSchema = z
  .discriminatedUnion('type', [
    WebsiteTargetSchema,
    MobileAppTargetSchema,
    CodeRepositoryTargetSchema,
    BackendConfigTargetSchema,
  ])
  .superRefine((t, ctx) => {
    if (
      t.type === 'mobile_app' &&
      t.platform === 'ios' &&
      t.buildArtifactId &&
      t.decryptedBuild !== true
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['decryptedBuild'],
        message: 'An iOS build must be confirmed as a client-supplied decrypted build',
      });
    }
  });
export type Target = z.infer<typeof TargetSchema>;
export type WebsiteTarget = z.infer<typeof WebsiteTargetSchema>;
export type MobileAppTarget = z.infer<typeof MobileAppTargetSchema>;
export type CodeRepositoryTarget = z.infer<typeof CodeRepositoryTargetSchema>;
export type BackendConfigTarget = z.infer<typeof BackendConfigTargetSchema>;

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
  'screen_recording',
  'dom_snapshot',
  'source_archive',
  'apk',
  'aab',
  'ipa',
  'config_file',
  'api_spec',
]);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const ArtifactSchema = z
  .object({
    id: IdSchema,
    assessmentId: IdSchema,
    targetId: IdSchema.optional(),
    kind: ArtifactKindSchema,
    /** How the artifact arrived: captured by a journey, uploaded as an input, or a manual capture. */
    origin: z.enum(['captured', 'uploaded', 'manual_capture']),
    /** `/evidence/*.svg` or `sample://uploads/...` in sample mode; a storage path in Stage C. */
    uri: z.string().min(1),
    /** Sample mode keeps file metadata only; Stage C stores objects in Supabase Storage. */
    storage: z.enum(['metadata_only', 'object_storage', 'bundled']),
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
    /** Configuration files only. */
    configType: ConfigTypeSchema.optional(),
    /** Manual captures only: the journey and stage they belong to, and why they were manual. */
    journeyId: IdSchema.optional(),
    stageId: IdSchema.optional(),
    note: z.string().trim().min(1).optional(),
  })
  .superRefine((a, ctx) => {
    if (a.origin === 'uploaded' || a.origin === 'manual_capture') {
      if (!a.sha256)
        ctx.addIssue({
          code: 'custom',
          path: ['sha256'],
          message: 'Uploads record a SHA-256 checksum',
        });
      if (a.sizeBytes === undefined || !a.fileName) {
        ctx.addIssue({
          code: 'custom',
          path: ['fileName'],
          message: 'Uploads record file name and size',
        });
      }
    }
    if (a.kind === 'config_file' && !a.configType) {
      ctx.addIssue({
        code: 'custom',
        path: ['configType'],
        message: 'Configuration files are tagged with a type',
      });
    }
    if (a.origin === 'manual_capture') {
      if (a.kind !== 'screenshot' && a.kind !== 'screen_recording') {
        ctx.addIssue({
          code: 'custom',
          path: ['kind'],
          message: 'Manual captures are screenshots or recordings',
        });
      }
      if (!a.stageId)
        ctx.addIssue({
          code: 'custom',
          path: ['stageId'],
          message: 'Manual captures are tagged to a stage',
        });
      if (!a.note)
        ctx.addIssue({ code: 'custom', path: ['note'], message: 'Manual captures need a note' });
    }
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
  /** What the client has provided for the run, recorded at launch. */
  clientAccess: z.array(ClientAccessItemSchema).default([]),
  /** True when the assessment was launched while client access items were outstanding. */
  launchedWithOutstanding: z.boolean().optional(),
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
