// Fails when a term the project has agreed not to use appears in any tracked or
// new file, or in any file path. Matching is whole-word and case-insensitive,
// so longer words that merely contain the same letters pass.
// Terms are stored base64-encoded so this script does not trip its own check.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ENCODED_TERMS = ['ZGVtbw==', 'ZGVtb3M='];
const terms = ENCODED_TERMS.map((t) => Buffer.from(t, 'base64').toString('utf8'));
const pattern = new RegExp(String.raw`\b(?:${terms.join('|')})\b`, 'i');

const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|xlsx|woff2?|apk|ipa|zip)$/i;

const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  },
)
  .split('\0')
  .filter(Boolean)
  .filter((f) => f !== 'pnpm-lock.yaml');

const problems = [];
for (const file of files) {
  if (pattern.test(file)) problems.push(`${file}: file path`);
  if (BINARY.test(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted in the working tree
  }
  text.split('\n').forEach((line, i) => {
    if (pattern.test(line)) problems.push(`${file}:${i + 1}`);
  });
}

if (problems.length > 0) {
  console.error('Avoided term found (see CLAUDE.md, "Language"):');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Avoided-word check passed (${files.length} files).`);
