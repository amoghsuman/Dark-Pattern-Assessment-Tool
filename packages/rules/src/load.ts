/**
 * Node-only loader: reads the YAML rule packs, validates them and assembles the bundle.
 * The browser never parses YAML; it imports the generated JSON bundle via `@dpat/rules`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import { PATTERN_IDS } from './patterns';
import { RulePackBundleSchema, RulePackSchema, type RulePack, type RulePackBundle } from './schema';

export const PACK_SET_ID = 'ccpa-2023';
export const PACK_SET_VERSION = '0.1.0-draft';

export const PATTERNS_DIR = fileURLToPath(new URL('../patterns/', import.meta.url));
export const BUNDLE_PATH = fileURLToPath(new URL('./generated/rule-packs.json', import.meta.url));

export function loadRulePackFile(path: string): RulePack {
  const raw: unknown = parse(readFileSync(path, 'utf8'));
  const result = RulePackSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid rule pack ${path}:\n${issues}`);
  }
  return result.data;
}

export function loadRulePacksFromYaml(dir: string = PATTERNS_DIR): RulePackBundle {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  const packs = files.map((f) => loadRulePackFile(join(dir, f)));
  packs.sort((a, b) => PATTERN_IDS.indexOf(a.pattern_id) - PATTERN_IDS.indexOf(b.pattern_id));
  return RulePackBundleSchema.parse({
    pack_set_id: PACK_SET_ID,
    pack_set_version: PACK_SET_VERSION,
    packs,
  });
}
