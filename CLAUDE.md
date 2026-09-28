# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository. Keep it current at the end of every milestone.

## What this is

Dark Pattern Assessment Tool: assesses websites, mobile apps and code repositories of Indian regulated entities (banks, insurers, fintechs) against the 13 dark patterns in the CCPA _Guidelines for Prevention and Regulation of Dark Patterns, 2023_, and produces audit-grade findings with evidence and remediation guidance.

- **Stage A (current):** complete frontend on sample data, deployed to Vercel.
- **Stage B:** Supabase, worker, Claude API analysis pipeline (`apps/worker`, `supabase/` are reserved placeholders).
- **Stage C:** swap the data source. No screen changes.

The approved build plan and milestone list are in [PLAN.md](PLAN.md).

## Current status

- M0 Foundation: done (monorepo, tooling, CI, Next.js shell, theme, brand config).
- Next: M1 Access gate.

## Commands (run from the repo root, PowerShell or any shell)

| Command                             | What it does                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm install`                      | Install all workspace dependencies                                           |
| `pnpm dev`                          | Next.js dev server for `apps/web` on http://localhost:3000                   |
| `pnpm build` / `pnpm start`         | Production build / serve                                                     |
| `pnpm lint`                         | ESLint (type-aware) across the repo + avoided-word check                     |
| `pnpm typecheck`                    | `tsc --noEmit` in every package (web runs `next typegen` first)              |
| `pnpm test`                         | Vitest across all projects (`packages/*`, `apps/web`)                        |
| `pnpm e2e`                          | Playwright (builds and serves the app on port 3100; desktop + 768 px tablet) |
| `pnpm format` / `pnpm format:check` | Prettier                                                                     |

Milestone gate: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`, then commit.

First-time Playwright setup: `pnpm --filter @dpat/web exec playwright install chromium`.

## Architecture

```
apps/web          Next.js 16 App Router, Tailwind v4, shadcn/ui (new-york, slate)
packages/shared   Domain types, zod schemas, repository interfaces, sample data layer
packages/rules    13 rule packs (YAML) + zod schema (arrives in M2)
apps/worker       reserved (Stage B)
supabase          reserved (Stage B)
```

- Workspace packages are consumed as TypeScript source (`exports` points at `src/index.ts`); `apps/web` lists them in `transpilePackages`. No package build step.
- **Data seam:** screens use hooks in `apps/web/lib/data` only. Hooks call the `Repositories` interface from `@dpat/shared`. `DATA_SOURCE` (parsed by `parseDataSource`) selects the implementation; Stage A supports `sample`. Never import fixtures or a concrete repository from a screen.
- Sample mode writes go to a browser localStorage overlay (resettable from the Sample data badge).
- Server-only env access goes through `apps/web/lib/env.ts` (guarded by `server-only`).
- Branding (product name, logo, accent hue) lives only in `apps/web/config/brand.ts`.
- Design tokens (base palette, severity, compliance-matrix colours) live only in `apps/web/app/globals.css`, exposed as Tailwind colours such as `bg-matrix-non-compliant`, `text-severity-high`.
- PDF export uses the print stylesheet `apps/web/styles/print.css` (`.print-hidden`, `.print-break-before`, `.print-avoid-break`).

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any`. Use `import type` for types.
- Domain types come from `@dpat/shared` only (inferred from zod schemas).
- Pure derivation logic (matrix cells, KPIs, risk register) lives in `packages/shared` and is unit tested.
- Unit tests sit next to the code as `*.test.ts(x)`; Playwright specs in `apps/web/e2e`.
- `apps/web/components/ui` holds generated shadcn/ui primitives; they are excluded from ESLint and Prettier. Add new ones with `pnpm dlx shadcn@latest add <name>` from `apps/web`.
- Commits: conventional style, e.g. `feat(web): ...`, `chore: ...`, `test(shared): ...`.
- Line endings: LF everywhere, enforced by `.gitattributes` and `.editorconfig`. Keep `package.json` scripts cross-platform (no bash-only syntax).

## Language

- One term from the brief is not used anywhere in code, UI copy, file names, comments or docs; say "sample data", "walkthrough" or "preview" instead. `scripts/check-avoided-words.mjs` enforces this (whole word, case-insensitive; the term is stored base64-encoded) and runs as part of `pnpm lint`.
- Use only fictitious names for organisations, people, products, URLs and app IDs.
- Rule packs are drafts: always marked "draft, pending compliance review".

## Toolchain notes

- Node 24, pnpm 12 (pinned in `package.json` `engines` / `packageManager`, `.nvmrc`).
- TypeScript is pinned to 6.0.x because typescript-eslint does not support TypeScript 7 yet. ESLint is pinned to 9.x for plugin compatibility.
- `eslint.config.mjs` drops Next's `next/typescript` preset entry and restores the typescript-eslint parser for `apps/web`, because Next's preset otherwise clashes with the type-aware config.
- pnpm 12 blocks unapproved dependency build scripts; approvals live under `allowBuilds` in `pnpm-workspace.yaml`.
- Next.js 16 names middleware `proxy.ts`.

## Environment variables

See `apps/web/.env.example`. `DATA_SOURCE=sample`, `SITE_PASSCODE=<passcode>`.
