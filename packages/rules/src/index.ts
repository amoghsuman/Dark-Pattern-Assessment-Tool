import bundleJson from './generated/rule-packs.json';
import { RulePackBundleSchema, type RulePack, type RulePackBundle } from './schema';
import type { PatternId } from './patterns';

export * from './patterns';
export * from './schema';

/** The validated rule pack bundle, generated from patterns/*.yaml. */
export const rulePackBundle: RulePackBundle = RulePackBundleSchema.parse(bundleJson);

/** Pack set identifier stored on every assessment, e.g. "ccpa-2023@0.1.0-draft". */
export const RULE_PACK_SET_VERSION = `${rulePackBundle.pack_set_id}@${rulePackBundle.pack_set_version}`;

export function getRulePack(patternId: PatternId): RulePack {
  const pack = rulePackBundle.packs.find((p) => p.pattern_id === patternId);
  if (!pack) throw new Error(`No rule pack for pattern "${patternId}"`);
  return pack;
}
