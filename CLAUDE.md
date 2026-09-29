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
- M1 Access gate: done (proxy, signed cookie, access page, sign out).
- M2 Domain, schemas, rules: done (zod domain schemas, finding workflow, repository interfaces, 13 draft rule packs).
- M3 Sample data layer: done (fixtures, 14 SVG evidence screens, SampleDataRepository with localStorage overlay, derive functions, RepositoryProvider and hooks).
- M4 App shell, Home, Settings: done (sidebar, header with Sample data badge, role switcher and reset, Home list, Settings tabs).
- M5 Wizard and run view: done (six-step wizard with journey builder and saved draft; assessment shell with tabs; animated engine timeline with replay).
- M6 Overview and compliance matrix: done (KPIs, severity/engine/pattern charts, scope, compact matrix; full matrix with legend, markers and cell drawer).
- M7 Findings list and detail: done (URL filters, facets with counts, sort, bulk status; screenshot viewer, Shiki code viewer, criteria, review workflow, comments, audit trail).
- Next: M8 Rule library and reports; M9 hardening; M10 production-grade assessment inputs.

## Commands (run from the repo root, PowerShell or any shell)

| Command                             | What it does                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm install`                      | Install all workspace dependencies                                                      |
| `pnpm dev`                          | Next.js dev server for `apps/web` on http://localhost:3000                              |
| `pnpm build` / `pnpm start`         | Production build / serve                                                                |
| `pnpm lint`                         | Next route typegen, then ESLint (type-aware) + avoided-word check                       |
| `pnpm typecheck`                    | `tsc --noEmit` in every package (web runs `next typegen` first)                         |
| `pnpm test`                         | Vitest across all projects (`packages/*`, `apps/web`)                                   |
| `pnpm e2e`                          | Playwright (builds and serves the app on port 3100; desktop + 768 px tablet; 2 workers) |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                |

Milestone flow: run `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and `pnpm test` locally (plus only the relevant Playwright specs, under a hard `timeout`); commit to a branch named after the milestone (`m6`, `m7`, ...), push, check the CI run once with `gh run view` (Playwright runs there), then fast-forward merge into `main` and push. Wrap any long-running command (tests, servers, `gh run watch`) in `timeout`, and stop background servers explicitly.

Vercel builds every push (`main` → Production). Check both CI and the Vercel commit status after pushing: `gh run list --commit <sha>` and `gh api repos/amoghsuman/Dark-Pattern-Assessment-Tool/commits/<sha>/status`. If `gh` is not on the shell PATH, call `"/c/Program Files/GitHub CLI/gh.exe"`.

CI caches Playwright browsers (`~/.cache/ms-playwright`, keyed on the Playwright version) and uses the Node 24 majors of all actions.

First-time Playwright setup: `pnpm --filter @dpat/web exec playwright install chromium`.

## Architecture

```
apps/web          Next.js 16 App Router, Tailwind v4, shadcn/ui (new-york, slate)
packages/shared   Domain types, zod schemas, repository interfaces, sample data layer
packages/rules    Pattern catalogue (PatternId), rule pack zod schema, 13 YAML packs + generated JSON bundle
apps/worker       reserved (Stage B)
supabase          reserved (Stage B)
```

- Dependency direction: `@dpat/web` → `@dpat/shared` → `@dpat/rules`. `PatternId` and the rule pack schema live in `@dpat/rules` (the regulatory catalogue); `@dpat/shared` re-exports `PatternId`/`Severity` and holds the app domain.
- **Rule packs:** edit `packages/rules/patterns/NN-name.yaml`, then run `pnpm --filter @dpat/rules bundle` to regenerate `src/generated/rule-packs.json` (committed; a unit test fails if it is stale). The browser imports only the JSON via `@dpat/rules`; `@dpat/rules/load` (YAML loader) is Node-only. IDs follow `<CODE>-C-n` (criteria), `<CODE>-SIG-CODE|BE|SCR-n` (signals), `<CODE>-DC-n` (checks), where CODE is the two-letter pattern code in `src/patterns.ts`. Every pack keeps `status: 'draft, pending compliance review'` until compliance sign-off (the schema enforces it).
- **Domain:** zod schemas in `packages/shared/src/schemas` (types via `z.infer`); finding status workflow and role permissions in `src/domain/finding-workflow.ts`; display labels in `src/domain/labels.ts`; repository interfaces in `src/data/repositories.ts`. Findings store `rulePackId` + `rulePackVersion`; assessments store `rulePackSetVersion`.
- Workspace packages are consumed as TypeScript source (`exports` points at `src/index.ts`); `apps/web` lists them in `transpilePackages`. No package build step.
- **Data seam:** screens use hooks in `apps/web/lib/data` only. Hooks call the `Repositories` interface from `@dpat/shared`. `DATA_SOURCE` (parsed by `parseDataSource`) selects the implementation; Stage A supports `sample`. Never import fixtures or a concrete repository from a screen.
- **Sample data:** JSON fixtures in `packages/shared/fixtures/` are the source of truth (fictitious insurer "Example Life Insurance": 2 assessments, 4 targets, 4 journeys, 47 findings, full review histories). `src/data/sample/fixtures.test.ts` enforces schema validity and referential integrity (IDs, rule criteria, box criteria, correlation symmetry, valid status histories ending at the current status, engine counts, no findings inside coverage gaps, all matrix colours present). Evidence illustrations are SVGs in `apps/web/public/evidence/` (desktop 1440×900, mobile 390×844); bounding boxes are fractions of the image and are overlaid by the viewer, not drawn into the SVG.
- **Sample writes:** `createSampleRepositories` layers an `OverlayState` (status changes, history, comments, created assessments, settings, selected role) over the fixtures, stored in localStorage key `dpat.sample-overlay.v1` with in-memory fallback. `SampleControls` (role switcher, reset) are exposed via `useSampleMode()`. Role → acting user: admin Priya Raman, reviewer Kavya Iyer, assessor Arjun Mehta, viewer Rohan Das.
- **Derived data** (`packages/shared/src/data/derive`): `deriveMatrix` (colour rules documented in the file), `deriveKpis`, `deriveRiskSummary`, `deriveRiskRegister` (13 × stages rows), `filterFindings`, `buildRunReplay` (frames for the run view). Screens must use these rather than re-implementing the rules.
- **Web data access:** `apps/web/lib/data/repository-provider.tsx` (client) creates repositories from `DATA_SOURCE` (passed from the `(app)` layout, which calls `connection()` so env is read per request) and a TanStack Query client; `lib/data/hooks.ts` holds every query/mutation hook and the query keys.
- **Access gate:** `apps/web/proxy.ts` (Next 16 middleware) requires a valid `dpat_access` cookie on every route except Next internals and `/brand/*`; otherwise it redirects to `/access?next=<path>`. The cookie is `v1.<expiry>.<HMAC-SHA256(expiry, SITE_PASSCODE)>` (7-day TTL, `lib/access/token.ts`, Web Crypto), so rotating the passcode signs everyone out. Unlock and sign out are Server Actions in `app/access/actions.ts`. `next` is sanitised by `lib/access/redirect.ts`. Blank `SITE_PASSCODE` fails closed. It is a light gate, not user authentication.
- Server-only env access goes through `apps/web/lib/env.ts` (guarded by `server-only`).
- Branding (product name, logo, accent hue) lives only in `apps/web/config/brand.ts`. The hue is applied as `--brand-hue` on `<html>` and drives the `brand` colour (active nav, running status, links) and focus ring.
- **App shell** (`components/layout`): `AppSidebar` (full from `lg`, icon rail from `md`), `MobileNav` sheet below `md`, `AppHeader` (organisation, `SampleDataBadge`, theme toggle, `UserMenu` with sign out). Shared UI: `components/common` (severity/status badges, risk chips, target icons, `PageHeader`, `EmptyState`, `ErrorState`). Formatting helpers in `lib/format.ts` (dates always in IST). UI permission helpers in `lib/permissions.ts` mirror the repository rules.
- **Wizard** (`components/wizard`, route `/assessments/new`): state, per-step validation and conversion to `NewAssessmentInput` live in `lib/wizard/draft.ts` (unit tested); the draft is saved to localStorage key `dpat.wizard-draft.v1` and restored on return. The wizard renders client-only because it reads that draft.
- **Assessment pages** share `app/(app)/assessments/[assessmentId]/layout.tsx` → `AssessmentShell` (header, tabs: Overview, Run, Compliance matrix, Findings, Report). **Run view** (`components/run/run-view.tsx`): completed runs open at their final state and animate on Replay; queued/running runs stream frames from `subscribeToRun` (replay of `buildRunReplay`); a new sample assessment completes after its replay and becomes "In review".
- **Findings** (`components/findings`): list filters live in the URL (`lib/findings/filter-params.ts`, unit tested) and go to `FindingRepository.list` as a `FindingFilter`; facet counts respect the other active filters; bulk updates report skipped findings with reasons. Detail page: `ScreenshotViewer` (zoom/pan/fit, boxes in the transformed layer, regions linked to criteria), `CodeViewer` (Shiki loaded on demand, dual theme, file line numbers, highlighted lines; styles in `globals.css`), `ReviewPanel` (transitions from `allowedTransitions`), comments and audit trail.
- shadcn/ui components are added with the CLI from `apps/web`. The CLI currently mis-resolves the utils alias and adds a stray `cn` npm package: after adding, replace `from "cn"` with `from "@/lib/utils"` and remove the `cn` dependency. Two generated components needed small fixes for `exactOptionalPropertyTypes` (dropdown-menu checkbox item, sonner theme).
- Typed routes are on: links to pages that do not exist yet need `as Route` (remove the cast when the page lands; currently `/rules`, `/rules/:pattern` and the report tab).
- Design tokens (base palette, severity, compliance-matrix colours) live only in `apps/web/app/globals.css`, exposed as Tailwind colours such as `bg-matrix-non-compliant`, `text-severity-high`.
- **Colour palettes are validated**, not eyeballed: severity (ordered) and compliance-matrix (status) tokens in `globals.css` were checked with the dataviz skill's `validate_palette.js` for light (`#ffffff`) and dark (`#131824`) surfaces; remaining WARNs are covered by visible labels/icons. Text never uses a severity or status colour: badges use a tint + coloured dot, matrix cells use foreground tokens that meet 4.5:1. Re-run the validator if you change these tokens.
- **Analysis screens** use `useAssessmentAnalysis(assessmentId)` (`lib/data/use-assessment-analysis.ts`), which derives matrix and KPIs with the shared rules. Charts are plain HTML bar lists (`components/charts/bar-list.tsx`: ≤24px bars, 4px rounded data end, values printed, per-row tooltip and link). The compliance matrix (`components/matrix`) keeps the open cell in the URL (`?pattern=&stage=`); exceptions are solid, compliant cells a green tint, every cell has an icon and an accessible label.
- PDF export uses the print stylesheet `apps/web/styles/print.css` (`.print-hidden`, `.print-break-before`, `.print-avoid-break`).

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any`. Use `import type` for types.
- Domain types come from `@dpat/shared` only (inferred from zod schemas).
- Pure derivation logic (matrix cells, KPIs, risk register) lives in `packages/shared` and is unit tested.
- Unit tests sit next to the code as `*.test.ts(x)`; Playwright specs in `apps/web/e2e`. The `setup` project (`e2e/auth.setup.ts`) unlocks the gate once and saves the session to `e2e/.auth/state.json` (git-ignored); `desktop` and `tablet` reuse it. Specs that must start signed out call `test.use({ storageState: { cookies: [], origins: [] } })`.
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
- Playwright starts the server with the `next` binary directly, not `pnpm start`: on Linux a server started through the pnpm 12 wrapper can outlive Playwright's shutdown and hang CI. CI runs `pnpm build` as its own step; locally the web server command builds first.

## Environment variables

See `apps/web/.env.example`. `DATA_SOURCE=sample`, `SITE_PASSCODE=<passcode>`.
