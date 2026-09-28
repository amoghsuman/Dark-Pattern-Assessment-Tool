import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getRulePack, RULE_PACK_SET_VERSION, rulePackBundle } from './index';
import { BUNDLE_PATH, loadRulePacksFromYaml, PATTERNS_DIR } from './load';
import { getPatternInfo, PATTERN_IDS, PATTERNS } from './patterns';
import { RULE_PACK_DRAFT_STATUS, RulePackSchema } from './schema';

const fromYaml = loadRulePacksFromYaml();

describe('rule pack YAML files', () => {
  it('has exactly one valid pack per pattern, in Annexure order', () => {
    expect(fromYaml.packs.map((p) => p.pattern_id)).toEqual([...PATTERN_IDS]);
  });

  it('names each file after its pack ID', () => {
    const files = readdirSync(PATTERNS_DIR).filter((f) => f.endsWith('.yaml'));
    expect(files).toHaveLength(13);
    for (const pack of fromYaml.packs) {
      expect(files).toContain(`${pack.id.replace(/^dp-/, '')}.yaml`);
    }
  });

  it.each(fromYaml.packs.map((p) => [p.pattern_id, p] as const))(
    '%s is consistent with the pattern catalogue',
    (_id, pack) => {
      const info = getPatternInfo(pack.pattern_id);
      expect(pack.name).toBe(info.name);
      expect(pack.status).toBe(RULE_PACK_DRAFT_STATUS);
      expect(pack.id).toMatch(new RegExp(`^dp-${String(info.annexureItem).padStart(2, '0')}-`));
      expect(pack.guideline_reference.clause).toContain(`Annexure 1, item ${info.annexureItem}`);

      const ids = [
        ...pack.violation_criteria.map((c) => c.id),
        ...pack.detection_signals.code.map((s) => s.id),
        ...pack.detection_signals.backend.map((s) => s.id),
        ...pack.detection_signals.screen.map((s) => s.id),
        ...pack.deterministic_checks.map((c) => c.id),
      ];
      for (const id of ids) expect(id.startsWith(`${info.code}-`)).toBe(true);
    },
  );

  it('uses unique pattern codes', () => {
    expect(new Set(PATTERNS.map((p) => p.code)).size).toBe(PATTERNS.length);
  });
});

describe('generated bundle', () => {
  it('is up to date with the YAML files (run `pnpm --filter @dpat/rules bundle`)', () => {
    const committed: unknown = JSON.parse(readFileSync(BUNDLE_PATH, 'utf8'));
    expect(committed).toEqual(JSON.parse(JSON.stringify(fromYaml)));
  });

  it('exposes a pack set version and lookup', () => {
    expect(RULE_PACK_SET_VERSION).toBe('ccpa-2023@0.1.0-draft');
    expect(getRulePack('drip_pricing').id).toBe('dp-08-drip-pricing');
    expect(rulePackBundle.packs).toHaveLength(13);
  });
});

describe('RulePackSchema', () => {
  const valid = fromYaml.packs[0];

  it('rejects a pack that is not marked as a draft', () => {
    expect(RulePackSchema.safeParse({ ...valid, status: 'approved' }).success).toBe(false);
  });

  it('rejects duplicate IDs within a pack', () => {
    const criteria = valid?.violation_criteria ?? [];
    const duplicated = { ...valid, violation_criteria: [...criteria, criteria[0]] };
    expect(RulePackSchema.safeParse(duplicated).success).toBe(false);
  });

  it('rejects a pack without violation criteria', () => {
    expect(RulePackSchema.safeParse({ ...valid, violation_criteria: [] }).success).toBe(false);
  });

  it('rejects malformed IDs', () => {
    const bad = {
      ...valid,
      violation_criteria: [{ id: 'criterion one', description: 'x' }],
    };
    expect(RulePackSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown pattern', () => {
    expect(RulePackSchema.safeParse({ ...valid, pattern_id: 'dark_mode' }).success).toBe(false);
  });
});

describe('fixture directory', () => {
  it('contains only YAML rule packs', () => {
    for (const f of readdirSync(PATTERNS_DIR)) {
      expect(join(PATTERNS_DIR, f)).toMatch(/\.yaml$/);
    }
  });
});
