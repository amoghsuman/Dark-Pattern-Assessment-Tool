import { z } from 'zod';

import { PatternIdSchema } from './patterns';

/** Every rule pack stays in this status until a compliance reviewer signs it off. */
export const RULE_PACK_DRAFT_STATUS = 'draft, pending compliance review';

const Id = z
  .string()
  .regex(/^[A-Z]{2}-[A-Z]+(-[A-Z]+)?-\d+$/, 'IDs look like FU-C-1 or FU-SIG-CODE-1');
const NonEmpty = z.string().trim().min(1);

export const SignalSchema = z.object({
  id: Id,
  description: NonEmpty,
  examples: z.array(NonEmpty).default([]),
});

export const AnalysisEngineSchema = z.enum([
  'screen_capture',
  'code_analysis',
  'backend_logic',
  'software_risk',
]);

export const DeterministicCheckSchema = z.object({
  id: Id,
  description: NonEmpty,
  engine: AnalysisEngineSchema,
  method: z.enum([
    'dom_query',
    'regex',
    'ast_query',
    'config_assertion',
    'visual_heuristic',
    'network_trace',
  ]),
  /** Selector, pattern or query. Illustrative until the Stage B engines implement them. */
  expression: NonEmpty.optional(),
  on_match: z.enum(['raise_finding', 'raise_signal']),
});

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const SeverityRuleSchema = z.object({
  severity: SeveritySchema,
  when: NonEmpty,
});

export const EvidenceKindSchema = z.enum([
  'screenshot',
  'code_snippet',
  'config_excerpt',
  'network_trace',
  'journey_recording',
]);

export const SectorVariantSchema = z.object({
  applicability: z.enum(['high', 'medium', 'low', 'not_applicable']),
  notes: NonEmpty,
  additional_criteria: z.array(NonEmpty).default([]),
  /** Titles of related sector instruments. To be confirmed by compliance. */
  regulatory_cross_references: z.array(NonEmpty).default([]),
});

export const RulePackSchema = z
  .object({
    id: z.string().regex(/^dp-\d{2}-[a-z-]+$/),
    pattern_id: PatternIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, 'semver'),
    status: z.literal(RULE_PACK_DRAFT_STATUS),
    name: NonEmpty,
    guideline_reference: z.object({
      instrument: NonEmpty,
      clause: NonEmpty,
      url: z.url().optional(),
    }),
    definition: NonEmpty,
    illustrations: z.array(NonEmpty).min(1),
    violation_criteria: z.array(z.object({ id: Id, description: NonEmpty })).min(1),
    exclusions: z.array(NonEmpty).default([]),
    detection_signals: z.object({
      code: z.array(SignalSchema),
      backend: z.array(SignalSchema),
      screen: z.array(SignalSchema),
    }),
    deterministic_checks: z.array(DeterministicCheckSchema),
    llm_rubric: z.object({
      instructions: NonEmpty,
      questions: z.array(NonEmpty).min(1),
      decision_rule: NonEmpty,
      confidence_guidance: NonEmpty,
    }),
    severity_logic: z.array(SeverityRuleSchema).min(1),
    evidence_required: z.array(EvidenceKindSchema).min(1),
    remediation_template: z.object({
      summary: NonEmpty,
      steps: z.array(NonEmpty).min(1),
      references: z.array(NonEmpty).default([]),
    }),
    sector_variants: z.object({
      insurance: SectorVariantSchema,
      banking: SectorVariantSchema,
      lending: SectorVariantSchema,
    }),
  })
  .superRefine((pack, ctx) => {
    const ids = [
      ...pack.violation_criteria.map((c) => c.id),
      ...pack.detection_signals.code.map((s) => s.id),
      ...pack.detection_signals.backend.map((s) => s.id),
      ...pack.detection_signals.screen.map((s) => s.id),
      ...pack.deterministic_checks.map((c) => c.id),
    ];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate ID "${id}" in ${pack.id}` });
      }
      seen.add(id);
    }
  });

export type RulePack = z.infer<typeof RulePackSchema>;
export type RulePackInput = z.input<typeof RulePackSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type SectorVariant = z.infer<typeof SectorVariantSchema>;

export const RulePackBundleSchema = z.object({
  pack_set_id: NonEmpty,
  pack_set_version: NonEmpty,
  packs: z.array(RulePackSchema).length(13),
});

export type RulePackBundle = z.infer<typeof RulePackBundleSchema>;
