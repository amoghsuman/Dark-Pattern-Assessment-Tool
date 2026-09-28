import { z } from 'zod';

import {
  DateSchema,
  EngineSchema,
  FindingStatusSchema,
  IdSchema,
  PatternIdSchema,
  SeveritySchema,
  TimestampSchema,
} from './common';

// ---------------------------------------------------------------- evidence

const Fraction = z.number().min(0).max(1);

/** Box on a screenshot, as fractions of the image so it scales with zoom. */
export const BoundingBoxSchema = z
  .object({
    x: Fraction,
    y: Fraction,
    width: Fraction.positive(),
    height: Fraction.positive(),
    label: z.string().min(1),
    /** Violation criterion this box illustrates. */
    criterionId: z.string().optional(),
  })
  .refine((b) => b.x + b.width <= 1.0001 && b.y + b.height <= 1.0001, {
    message: 'Bounding box extends past the image',
  });
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

const LineRange = {
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  highlightLines: z.array(z.number().int().positive()),
};

export const ScreenshotEvidenceSchema = z.object({
  id: IdSchema,
  kind: z.literal('screenshot'),
  artifactId: IdSchema,
  caption: z.string().min(1),
  boxes: z.array(BoundingBoxSchema).min(1),
});

export const CodeSnippetEvidenceSchema = z.object({
  id: IdSchema,
  kind: z.literal('code_snippet'),
  filePath: z.string().min(1),
  language: z.enum(['typescript', 'tsx', 'javascript', 'java', 'kotlin', 'swift']),
  ...LineRange,
  code: z.string().min(1),
  commitSha: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/)
    .optional(),
  caption: z.string().min(1),
});

export const ConfigExcerptEvidenceSchema = z.object({
  id: IdSchema,
  kind: z.literal('config_excerpt'),
  /** File path, table or service the excerpt came from. */
  source: z.string().min(1),
  format: z.enum(['yaml', 'json', 'properties', 'sql']),
  ...LineRange,
  content: z.string().min(1),
  caption: z.string().min(1),
});

function linesAreConsistent(e: { startLine: number; endLine: number; highlightLines: number[] }) {
  return (
    e.endLine >= e.startLine && e.highlightLines.every((l) => l >= e.startLine && l <= e.endLine)
  );
}

export const EvidenceSchema = z
  .discriminatedUnion('kind', [
    ScreenshotEvidenceSchema,
    CodeSnippetEvidenceSchema,
    ConfigExcerptEvidenceSchema,
  ])
  .superRefine((e, ctx) => {
    if (e.kind === 'screenshot') return;
    if (!linesAreConsistent(e)) {
      ctx.addIssue({ code: 'custom', message: 'Line range or highlighted lines are inconsistent' });
    }
    const body = e.kind === 'code_snippet' ? e.code : e.content;
    const lineCount = body.replace(/\n$/, '').split('\n').length;
    if (lineCount !== e.endLine - e.startLine + 1) {
      ctx.addIssue({
        code: 'custom',
        message: `Excerpt has ${lineCount} lines but the range ${e.startLine}-${e.endLine} implies ${e.endLine - e.startLine + 1}`,
      });
    }
  });
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ScreenshotEvidence = z.infer<typeof ScreenshotEvidenceSchema>;
export type CodeSnippetEvidence = z.infer<typeof CodeSnippetEvidenceSchema>;
export type ConfigExcerptEvidence = z.infer<typeof ConfigExcerptEvidenceSchema>;

// ---------------------------------------------------------------- finding

export const FindingSchema = z.object({
  id: IdSchema,
  assessmentId: IdSchema,
  analysisRunId: IdSchema,
  targetId: IdSchema,
  /** Human-readable reference, e.g. "ELI-2026-014". */
  reference: z.string().min(1),
  patternId: PatternIdSchema,
  /** Rule pack and version the finding was raised under (audit traceability). */
  rulePackId: z.string().min(1),
  rulePackVersion: z.string().min(1),
  violationCriterionIds: z.array(z.string().min(1)).min(1),
  stageId: IdSchema,
  journeyStepId: IdSchema.optional(),
  engine: EngineSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  status: FindingStatusSchema,
  evidence: z.array(EvidenceSchema).min(1),
  correlatedFindingIds: z.array(IdSchema),
  remediation: z.object({
    guidance: z.string().min(1),
    effort: z.enum(['low', 'medium', 'high']),
    ownerTeam: z.string().optional(),
    targetDate: DateSchema.optional(),
  }),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Finding = z.infer<typeof FindingSchema>;

// ---------------------------------------------------------------- review

export const StatusChangeSchema = z.object({
  id: IdSchema,
  from: FindingStatusSchema.nullable(),
  to: FindingStatusSchema,
  by: IdSchema,
  at: TimestampSchema,
  note: z.string().optional(),
});
export type StatusChange = z.infer<typeof StatusChangeSchema>;

export const ReviewCommentSchema = z.object({
  id: IdSchema,
  by: IdSchema,
  at: TimestampSchema,
  body: z.string().trim().min(1),
});
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;

/** Review record for one finding: status history (oldest first) plus comments. */
export const ReviewSchema = z.object({
  findingId: IdSchema,
  history: z.array(StatusChangeSchema).min(1),
  comments: z.array(ReviewCommentSchema),
});
export type Review = z.infer<typeof ReviewSchema>;
