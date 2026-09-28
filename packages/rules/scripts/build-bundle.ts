/**
 * Regenerates src/generated/rule-packs.json from patterns/*.yaml.
 * Run with `pnpm --filter @dpat/rules bundle` after editing any rule pack.
 * A unit test fails if the committed bundle is out of date.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { BUNDLE_PATH, loadRulePacksFromYaml } from '../src/load';

const bundle = loadRulePacksFromYaml();
mkdirSync(dirname(BUNDLE_PATH), { recursive: true });
writeFileSync(BUNDLE_PATH, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
console.log(
  `Wrote ${bundle.packs.length} rule packs (${bundle.pack_set_id}@${bundle.pack_set_version}).`,
);
