# Dark Pattern Assessment Tool: Build Plan (Stage A)

Status: **approved 2026-09-29**. Decisions on the open questions are recorded in section 9.

This tool assesses websites, mobile apps and code repositories of Indian regulated entities (banks, insurers, fintechs) against the 13 specified dark patterns in the CCPA _Guidelines for Prevention and Regulation of Dark Patterns, 2023_. It produces audit-grade findings with evidence, rule traceability and remediation guidance.

| Stage | Scope                                                          | This plan             |
| ----- | -------------------------------------------------------------- | --------------------- |
| A     | Complete frontend on realistic sample data, deployed to Vercel | Detailed below        |
| B     | Supabase schema, worker, Claude API analysis pipeline          | Folders reserved only |
| C     | Connect frontend to backend (swap the data source)             | Seams designed now    |

The main design constraint: **Stage C changes one factory function and one environment variable. It does not touch any screen.**

---

## 1. Folder structure

```
dark-pattern-assessment-tool/
├─ .github/workflows/ci.yml          # lint, typecheck, unit tests, Playwright
├─ .gitattributes                    # * text=auto eol=lf, binary overrides
├─ .editorconfig                     # LF, 2 spaces, UTF-8
├─ .prettierrc / .prettierignore
├─ eslint.config.mjs                 # flat config shared by all packages
├─ package.json                      # root scripts: lint, typecheck, test, e2e, format
├─ pnpm-workspace.yaml
├─ tsconfig.base.json                # strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
├─ CLAUDE.md                         # architecture, conventions, commands (kept current)
├─ README.md                         # local setup on Windows, deployment
├─ PLAN.md
│
├─ apps/
│  ├─ web/                           # Next.js App Router (Vercel root directory)
│  │  ├─ vercel.json                 # regions: ["bom1"]
│  │  ├─ .env.example                # DATA_SOURCE, SITE_PASSCODE
│  │  ├─ proxy.ts                    # passcode gate (Next.js middleware; file is named
│  │  │                              #   middleware.ts on Next < 16)
│  │  ├─ app/
│  │  │  ├─ access/                  # passcode screen + POST route handler
│  │  │  ├─ (app)/                   # authenticated shell (header, sidebar, badge)
│  │  │  │  ├─ page.tsx              # Home: assessments list
│  │  │  │  ├─ assessments/new/
│  │  │  │  ├─ assessments/[assessmentId]/
│  │  │  │  │  ├─ page.tsx           # Overview
│  │  │  │  │  ├─ run/
│  │  │  │  │  ├─ matrix/
│  │  │  │  │  ├─ findings/
│  │  │  │  │  ├─ findings/[findingId]/
│  │  │  │  │  └─ report/
│  │  │  │  ├─ rules/  rules/[patternId]/
│  │  │  │  └─ settings/             # organisation | users | journey stages
│  │  ├─ components/
│  │  │  ├─ ui/                      # shadcn/ui primitives (generated)
│  │  │  ├─ layout/                  # header, sidebar, sample-data badge, theme toggle
│  │  │  ├─ charts/                  # severity distribution, by-pattern, by-engine
│  │  │  ├─ matrix/                  # compliance matrix + cell drawer
│  │  │  ├─ evidence/                # screenshot viewer, code viewer, config viewer
│  │  │  ├─ findings/                # table, filters, bulk actions, review panel
│  │  │  ├─ wizard/                  # step components, journey step editor
│  │  │  └─ report/                  # report sections, print layout
│  │  ├─ lib/
│  │  │  ├─ data/                    # RepositoryProvider + query hooks (the only data seam)
│  │  │  ├─ export/                  # exceljs risk register builder
│  │  │  └─ access/                  # passcode token sign/verify (Web Crypto)
│  │  ├─ config/brand.ts             # product name, logo path, colours: single source
│  │  ├─ public/
│  │  │  ├─ brand/                   # neutral default logo (SVG)
│  │  │  └─ evidence/                # SVG screen illustrations referenced by fixtures
│  │  ├─ styles/print.css            # PDF via print stylesheet
│  │  └─ e2e/                        # Playwright specs
│  └─ worker/                        # RESERVED for Stage B (README placeholder only)
│
├─ packages/
│  ├─ shared/
│  │  ├─ src/domain/                 # TypeScript domain types (inferred from zod)
│  │  ├─ src/schemas/                # zod schemas for every entity
│  │  ├─ src/data/
│  │  │  ├─ repositories.ts          # repository interfaces
│  │  │  ├─ sample/                  # SampleDataRepository implementations
│  │  │  ├─ create-repositories.ts   # factory selected by DATA_SOURCE
│  │  │  └─ derive/                  # pure functions: matrix cells, KPIs, risk summary
│  │  └─ fixtures/                   # JSON sample data (validated by tests)
│  └─ rules/
│     ├─ patterns/                   # 13 YAML files, one per pattern
│     ├─ src/schema.ts               # zod RulePack schema
│     ├─ src/load.ts                 # build-time YAML → validated JSON bundle
│     └─ dist/rule-packs.json        # generated; consumed by shared + web
│
└─ supabase/                         # RESERVED for Stage B (README placeholder only)
```

Notes

- `packages/rules` compiles its YAML into a validated JSON bundle at build time (a `prebuild` script), so the browser never parses YAML and a malformed pack fails CI rather than a page.
- `apps/web` depends on `@dpat/shared` and `@dpat/rules` via `workspace:*`. Next.js `transpilePackages` handles the TypeScript sources; no separate package build step is needed for the app.
- Package scope `@dpat/*` is a placeholder (see open questions).

---

## 2. Domain types (`packages/shared`)

All types are inferred from zod schemas (`z.infer`), so fixtures, the future Supabase rows and the UI share one definition. IDs are strings (UUID-shaped in fixtures). Timestamps are ISO 8601 strings in UTC; the UI renders in IST.

```ts
// ---- enumerations ----
type PatternId =
  | 'false_urgency'
  | 'basket_sneaking'
  | 'confirm_shaming'
  | 'forced_action'
  | 'subscription_trap'
  | 'interface_interference'
  | 'bait_and_switch'
  | 'drip_pricing'
  | 'disguised_advertisement'
  | 'nagging'
  | 'trick_question'
  | 'saas_billing'
  | 'rogue_malware';

type Sector = 'insurance' | 'banking' | 'lending' | 'payments' | 'other';
type Role = 'admin' | 'assessor' | 'reviewer' | 'viewer';
type TargetType = 'website' | 'mobile_app' | 'code_repository';
type Engine =
  'screen_capture' | 'code_analysis' | 'backend_logic' | 'software_risk' | 'correlation';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type FindingStatus =
  'detected' | 'under_review' | 'confirmed' | 'dismissed' | 'remediation_in_progress' | 'closed';
type AssessmentStatus = 'draft' | 'queued' | 'running' | 'in_review' | 'completed';
type MatrixCellState = 'non_compliant' | 'in_progress' | 'compliant' | 'not_assessed';

// ---- organisation and people ----
interface Organization {
  id: string;
  name: string;
  sector: Sector;
  regulator?: 'IRDAI' | 'RBI' | 'SEBI' | 'PFRDA';
  journeyStages: JourneyStage[]; // configurable, ordered
  createdAt: string;
}
interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
interface JourneyStage {
  id: string;
  key: string;
  name: string;
  order: number;
  description?: string;
}

// ---- assessment scope ----
interface Assessment {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: AssessmentStatus;
  targetIds: string[];
  patternIds: PatternId[]; // patterns in scope
  rulePackSetVersion: string; // e.g. "ccpa-2023@0.1.0-draft"
  progress: { completedSteps: number; totalSteps: number }; // 0..1 derivable
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

type Target =
  | {
      id: string;
      assessmentId: string;
      type: 'website';
      name: string;
      baseUrl: string;
      environment: 'production' | 'uat';
    }
  | {
      id: string;
      assessmentId: string;
      type: 'mobile_app';
      name: string;
      platform: 'android' | 'ios';
      appId: string;
      version: string;
      buildArtifactId?: string;
    }
  | {
      id: string;
      assessmentId: string;
      type: 'code_repository';
      name: string;
      repoUrl?: string;
      branch?: string;
      commitSha?: string;
      sourceArtifactId?: string;
      languages: string[];
    };

interface Journey {
  id: string;
  assessmentId: string;
  targetId: string;
  name: string;
  stageIds: string[]; // stages this journey covers
  steps: JourneyStep[];
}
type JourneyStepAction = 'navigate' | 'click' | 'fill' | 'wait' | 'capture';
interface JourneyStep {
  // one step = one action; 'capture' produces a screen
  id: string;
  order: number;
  action: JourneyStepAction;
  stageId: string; // stage tag
  target?: string; // URL, selector, or accessibility label
  value?: string; // fill value (masked if sensitive)
  waitMs?: number;
  label: string; // human-readable ("Open quote page")
  screenArtifactId?: string; // set after capture
}

interface Artifact {
  // anything captured or uploaded
  id: string;
  assessmentId: string;
  targetId?: string;
  kind:
    'screenshot' | 'dom_snapshot' | 'source_archive' | 'apk' | 'ipa' | 'config_file' | 'api_spec';
  uri: string; // /evidence/*.svg in sample mode; storage path later
  mimeType: string;
  width?: number;
  height?: number;
  sha256?: string;
  capturedAt: string;
  journeyStepId?: string;
}

// ---- rules and analysis ----
// RulePack: see section 4 (inferred from the rules package schema)

interface AnalysisRun {
  id: string;
  assessmentId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  rulePackSetVersion: string;
  engines: EngineRun[];
  startedAt?: string;
  completedAt?: string;
}
interface EngineRun {
  engine: Engine;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  events: { at: string; message: string; level: 'info' | 'warn' | 'error' }[]; // drives the timeline
  metrics: { itemsTotal: number; itemsProcessed: number; findingsRaised: number };
}

interface Finding {
  id: string;
  assessmentId: string;
  analysisRunId: string;
  targetId: string;
  reference: string; // human ID, e.g. "ELI-2026-014"
  patternId: PatternId;
  rulePackId: string;
  rulePackVersion: string; // audit traceability (per finding)
  violationCriterionIds: string[]; // which criteria in the pack were met
  stageId: string;
  journeyStepId?: string;
  engine: Engine;
  title: string;
  summary: string;
  rationale: string;
  severity: Severity;
  confidence: number; // 0..1
  status: FindingStatus;
  evidence: Evidence[];
  correlatedFindingIds: string[];
  remediation: {
    guidance: string;
    effort: 'low' | 'medium' | 'high';
    ownerTeam?: string;
    targetDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

type BoundingBox = { x: number; y: number; width: number; height: number; label: string }; // fractions 0..1
type Evidence =
  | { id: string; kind: 'screenshot'; artifactId: string; caption: string; boxes: BoundingBox[] }
  | {
      id: string;
      kind: 'code_snippet';
      filePath: string;
      language: 'typescript' | 'java' | 'kotlin' | 'swift' | 'javascript';
      startLine: number;
      endLine: number;
      highlightLines: number[];
      code: string;
      commitSha?: string;
      caption: string;
    }
  | {
      id: string;
      kind: 'config_excerpt';
      source: string;
      format: 'yaml' | 'json' | 'properties' | 'sql';
      startLine?: number;
      endLine?: number;
      highlightLines: number[];
      content: string;
      caption: string;
    };

interface Review {
  // one per finding
  findingId: string;
  history: {
    id: string;
    from: FindingStatus | null;
    to: FindingStatus;
    by: string;
    at: string;
    note?: string;
  }[];
  comments: { id: string; by: string; at: string; body: string }[];
}
```

Derived, not stored (pure functions in `packages/shared/src/data/derive`, unit tested):

- `deriveMatrix(assessment, findings, journeys, stages)` → `MatrixCell[]` (see section 5, screen 6).
- `deriveKpis(findings)`, `deriveRiskSummary(findings)` (overall risk rating for the home list), `deriveRiskRegister(...)` (one row per pattern × stage for the Excel export).

Bounding boxes are stored as fractions of the image so they stay correct at any zoom level or rendered size.

---

## 3. Repository interface (the data seam)

```ts
// packages/shared/src/data/repositories.ts
interface OrganizationRepository {
  getCurrent(): Promise<Organization>;
  update(
    patch: Partial<Pick<Organization, 'name' | 'sector' | 'regulator'>>,
  ): Promise<Organization>;
  listUsers(): Promise<User[]>;
  upsertUser(user: UserInput): Promise<User>;
  saveJourneyStages(stages: JourneyStage[]): Promise<JourneyStage[]>;
}

interface AssessmentRepository {
  list(): Promise<AssessmentSummary[]>; // includes progress + risk summary
  get(id: string): Promise<AssessmentDetail>; // assessment + targets + journeys
  create(input: NewAssessmentInput): Promise<Assessment>; // from the wizard
  listArtifacts(assessmentId: string): Promise<Artifact[]>;
  getLatestRun(assessmentId: string): Promise<AnalysisRun | null>;
  subscribeToRun(runId: string, onUpdate: (run: AnalysisRun) => void): () => void; // sample: timed replay; Stage C: Supabase Realtime
}

interface FindingRepository {
  list(assessmentId: string, filter?: FindingFilter): Promise<Finding[]>;
  get(id: string): Promise<Finding>;
  getReview(findingId: string): Promise<Review>;
  updateStatus(ids: string[], to: FindingStatus, note?: string): Promise<Finding[]>; // single + bulk
  addComment(findingId: string, body: string): Promise<Review>;
}

interface RuleRepository {
  listPacks(): Promise<RulePack[]>;
  getPack(patternId: PatternId): Promise<RulePack>;
  getPackSetVersion(): Promise<string>;
}

interface Repositories {
  organizations: OrganizationRepository;
  assessments: AssessmentRepository;
  findings: FindingRepository;
  rules: RuleRepository;
  source: 'sample' | 'supabase';
}

function createRepositories(source: DataSource, ctx: RepositoryContext): Repositories;
```

How screens reach data

- Screens never import a repository implementation. They use hooks from `apps/web/lib/data` (`useAssessments`, `useFinding`, `useUpdateFindingStatus`, and so on), built on TanStack Query over the `Repositories` object supplied by a `RepositoryProvider`.
- The root layout (a server component) reads `DATA_SOURCE` and passes it to the provider. `DATA_SOURCE=sample` gives `SampleDataRepository`; Stage C adds `supabase` in `createRepositories` and nothing else changes.
- Every method is async and returns zod-validated domain objects, so the sample implementation behaves like a network source (it adds a small artificial latency, so loading states get exercised).

Sample-mode writes (recommended approach, see open question 1)

- `SampleDataRepository` = immutable JSON fixtures + a **write overlay** (status changes, comments, new assessments, settings edits) persisted to the browser's `localStorage`.
- Changes made during a walkthrough survive navigation and refresh on that browser. The sample-data badge offers "Reset sample data" to clear the overlay.
- This avoids the Vercel serverless problem where in-memory server state disappears between requests.

Current user: sample mode has a fixed signed-in user (an admin, "Priya Raman (Assessor Lead)", fictitious) with a role switcher in the badge menu, so the walkthrough can show how the reviewer and viewer roles restrict actions. Stage C replaces this with Supabase Auth.

---

## 4. Rule pack schema (`packages/rules`)

One YAML file per pattern: `packages/rules/patterns/01-false-urgency.yaml` … `13-rogue-malware.yaml`.

```ts
// packages/rules/src/schema.ts
const Signal = z.object({
  id: z.string(),
  description: z.string(),
  examples: z.array(z.string()).default([]),
});

const DeterministicCheck = z.object({
  id: z.string(),
  description: z.string(),
  engine: z.enum(['screen_capture', 'code_analysis', 'backend_logic', 'software_risk']),
  method: z.enum([
    'dom_query',
    'regex',
    'ast_query',
    'config_assertion',
    'visual_heuristic',
    'network_trace',
  ]),
  expression: z.string().optional(), // selector, regex or query, illustrative in Stage A
  on_match: z.enum(['raise_finding', 'raise_signal']),
});

const SeverityRule = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  when: z.string(), // plain-language condition
});

const SectorVariant = z.object({
  applicability: z.enum(['high', 'medium', 'low', 'not_applicable']),
  notes: z.string(),
  additional_criteria: z.array(z.string()).default([]),
  regulatory_cross_references: z.array(z.string()).default([]), // e.g. IRDAI, RBI circular titles
});

export const RulePackSchema = z.object({
  id: z.string(), // "dp-01-false-urgency"
  pattern_id: PatternIdSchema, // "false_urgency"
  version: z.string(), // semver, e.g. "0.1.0"
  status: z.literal('draft, pending compliance review'), // widened in Stage B (approved, retired)
  name: z.string(),
  guideline_reference: z.object({
    instrument: z.string(), // "CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023"
    clause: z.string(), // "Annexure 1, item 1"
    url: z.string().url().optional(),
  }),
  definition: z.string(), // paraphrased in our own words
  illustrations: z.array(z.string()).min(1),
  violation_criteria: z.array(z.object({ id: z.string(), description: z.string() })).min(1),
  detection_signals: z.object({
    code: z.array(Signal),
    backend: z.array(Signal),
    screen: z.array(Signal),
  }),
  deterministic_checks: z.array(DeterministicCheck),
  llm_rubric: z.object({
    instructions: z.string(),
    questions: z.array(z.string()).min(1),
    decision_rule: z.string(),
    confidence_guidance: z.string(),
  }),
  severity_logic: z.array(SeverityRule).min(1),
  evidence_required: z.array(
    z.enum(['screenshot', 'code_snippet', 'config_excerpt', 'network_trace', 'journey_recording']),
  ),
  remediation_template: z.object({
    summary: z.string(),
    steps: z.array(z.string()).min(1),
    references: z.array(z.string()).default([]),
  }),
  sector_variants: z.object({
    insurance: SectorVariant,
    banking: SectorVariant,
    lending: SectorVariant,
  }),
});
```

- The bundle has a `pack_set_version` (for example `ccpa-2023@0.1.0-draft`). Each finding stores both `rulePackId` and `rulePackVersion`, and each assessment stores the pack-set version it ran against.
- All 13 packs are drafted in our own words, marked `status: draft, pending compliance review`, and show a visible "Draft, pending compliance review" banner in the Rule library and in report annexures.
- Rogue Malware and SaaS Billing are low-relevance for an insurer. Their sector variants will say so, and the sample assessment will mostly show them as assessed and compliant (green), which is realistic.
- Tests: every YAML file parses and validates; IDs are unique; there are exactly 13 packs covering every `PatternId`; each criterion ID referenced by a fixture finding exists in its pack.

---

## 5. Screen map and navigation

```
/access  ──(correct passcode, sets signed httpOnly cookie)──►  /  (Home)
                                                               │
      ┌──────────────── sidebar (always visible) ───────────────┼───────────────┐
      │ Assessments (/)   Rule library (/rules)   Settings (/settings)          │
      └──────────────────────────────────────────────────────────────────────────┘
/ ── "New assessment" ──► /assessments/new (wizard) ── Launch ──► /assessments/:id/run
/ ── row click ─────────► /assessments/:id  (Overview)
                             ├─ tabs: Overview | Run | Compliance matrix | Findings | Report
                             ├─ matrix cell ──► drawer (evidence, rationale, rule, remediation) ──► finding detail
                             ├─ /findings ──► /findings/:findingId ──► correlated finding / rule pack
                             └─ /report  ──► Export Excel | Print to PDF
/rules ──► /rules/:patternId  (also linked from every finding and drawer)
```

| #   | Screen                | Route                                  | Key contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | --------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Access gate           | `/access`                              | Passcode field; proxy redirects all other routes here until the cookie is valid. Cookie holds an HMAC of `SITE_PASSCODE` (Web Crypto, works at the edge). Light access gate only, not user authentication.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2   | Home                  | `/`                                    | Assessments table: name, targets (icons), status, progress bar, risk summary (critical/high/medium/low counts plus an overall rating), last updated. "New assessment" button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3   | New assessment wizard | `/assessments/new`                     | Steps: (1) target type, (2) target details (URL/environment; app ID/platform/version; repo URL/branch), (3) upload placeholders (APK/IPA, source archive, config files; a drop zone that records file metadata only in Stage A), (4) journey builder with an ordered step editor (navigate, click, fill, wait, capture; drag to reorder; per-step stage tag), (5) pattern selection (13 with select all, sector relevance hints), (6) review and launch. State is validated with zod per step; the draft is kept if the user leaves mid-wizard.                                                                                                                                                                                                                                                                                                                                                          |
| 4   | Run view              | `/assessments/:id/run`                 | Five-engine vertical timeline (screen capture, code analysis, backend and logic, software risk, correlation), each with status, progress, log events and running finding count, replayed from the sample `AnalysisRun` through `subscribeToRun`. Completed runs show the final state with a "Replay" control.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5   | Overview              | `/assessments/:id`                     | KPI cards (total findings, confirmed, critical/high open, patterns non-compliant out of 13, remediation progress), severity distribution, findings by pattern, findings by engine, compact compliance matrix linking to the full view.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | Compliance matrix     | `/assessments/:id/matrix`              | 13 patterns × configured stages. Cell state (derived): **red** if any finding is Confirmed; else **yellow** if any is Detected, Under Review or Remediation in Progress; else **green** if the pattern was in scope and the stage was covered by at least one journey or code target (all findings Dismissed or Closed, or none raised); else **grey**. Markers: a yellow cell whose findings are all Detected shows **Awaiting review** (unreviewed AI output never shows as red); a green cell whose findings are all Closed shows **Remediated**; all Dismissed is plain green. Mixed cells take the most severe colour present (red > yellow > green). Each cell shows a count, and states are marked with icons as well as colour for accessibility. Clicking a cell opens a side drawer: findings in the cell, evidence thumbnail, rationale, rule reference, remediation, link to finding detail. |
| 7   | Findings list         | `/assessments/:id/findings`            | Dense table; filters for pattern, stage, severity, status, engine and confidence (range); free-text search; column sort; multi-select with bulk status update (with note); filters kept in the URL query string so views are shareable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 8   | Finding detail        | `/assessments/:id/findings/:findingId` | Annotated screenshot viewer (zoom, pan, fit, toggle boxes, box labels, click a box to highlight its criterion), code/config viewer (Shiki highlighting, line numbers, highlighted lines, file path and commit), confidence meter, criteria met, correlated findings, rule reference (pack ID + version), remediation guidance, review actions (allowed transitions enforced by a state machine and role), comments, audit trail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 9   | Rule library          | `/rules`, `/rules/:patternId`          | Grid of 13 packs with draft banner; detail: definition, illustrations, violation criteria, detection signals by channel, deterministic checks, LLM rubric, severity logic, evidence required, remediation template, sector variants (tabs).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 10  | Reports               | `/assessments/:id/report`              | On-screen report: cover, executive summary, scope and methodology, heatmap, findings by pattern with evidence, remediation plan, annexures (rule pack versions, finding index, glossary). "Export Excel risk register" (exceljs, loaded on click, one row per pattern × stage with state, counts, highest severity, finding references, remediation owner/date). "Download PDF" opens the browser print dialog with a dedicated print stylesheet (A4, page breaks, running header/footer, app chrome hidden).                                                                                                                                                                                                                                                                                                                                                                                            |
| 11  | Settings              | `/settings`                            | Tabs: Organisation (name, sector, regulator); Users and roles (table, invite dialog, role select); Journey stages (add, rename, reorder, remove with a guard when findings exist).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Finding status state machine

```
detected ──► under_review ──► confirmed ──► remediation_in_progress ──► closed
   │              │
   └──────────────┴──► dismissed ──► under_review (reopen)
```

Assessors can move Detected to Under Review; reviewers and admins can Confirm, Dismiss and Close; viewers are read-only. Every transition writes a history entry.

Global UI

- Header: brand name and logo from `config/brand.ts`, organisation name, **"Sample data" badge** (only when `DATA_SOURCE=sample`, with a menu for role switcher and reset), theme toggle (light, dark, system), user menu.
- Design: neutral slate palette with a single configurable accent; Inter for text, JetBrains Mono for code; severity and matrix colours checked for WCAG AA contrast in both themes; tables use compact density with sticky headers; layout works down to 768 px (sidebar collapses to icons, the matrix scrolls horizontally with a sticky pattern column).
- Charts: shadcn/ui chart components (Recharts).

---

## 6. Sample data

Organisation: **Example Life Insurance** (fictitious; sector insurance, regulator IRDAI). All people, products, URLs and app IDs are fictitious (for example `www.examplelife.example`, `com.examplelife.app`).

| Assessment                                 | Status                | Targets                                                                         | Scope                             |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| "Digital Journeys Review, H1 FY2026-27"    | completed (in review) | Website (production), Android app v4.2.0, plus the policy-admin code repository | All 13 patterns, all 9 stages     |
| "Renewal and Servicing Revamp: Pre-launch" | running               | Mobile app (UAT build)                                                          | 8 patterns, 4 stages, partial run |

Findings: about 40 in the completed assessment and about 8 in the running one, spread across patterns, stages, severities, statuses and engines. The mix is about 55% screen, 30% code, 15% backend or config. Examples:

- Pre-ticked "Critical Illness Rider" in proposal state (`ProposalFormState.ts`), shown on the proposal form screen (Basket Sneaking, Proposal and Onboarding).
- Pricing rule that adds a "policy administration fee" only at the payment step (`pricing-rules.yaml` + `PremiumCalculator.java`) (Drip Pricing, Payment).
- Notification scheduler with no frequency cap on renewal reminders (`notification-scheduler.yaml`, `ReminderJob.kt`) (Nagging, Renewal).
- Countdown "Offer ends in 09:59" that resets on reload (`QuoteTimer.tsx`) (False Urgency, Quote and Comparison).
- "No, I don't care about my family's future" opt-out link (Confirm Shaming, Quote and Comparison).
- Auto-debit mandate cancellation buried five screens deep (Subscription Trap, Consent Withdrawal).
- Double-negative consent checkbox on marketing preferences (Trick Question, Proposal and Onboarding).
- Grievance form requiring an app download before submission (Forced Action, Grievance).
- Sponsored "Top rated plans" styled as editorial comparison (Disguised Advertisement, Product Discovery).
- Advertised premium versus higher premium after the medical questionnaire, without explanation (Bait and Switch).
- Visually dominant "Continue with add-ons" versus greyed "Skip" (Interface Interference, Payment).

Every status appears (Detected, Under Review, Confirmed, Dismissed, Remediation in Progress, Closed), so all four matrix colours appear, and several findings have multi-entry audit trails and comments.

Evidence illustrations: about 12 hand-authored SVG files in `apps/web/public/evidence/` (desktop at 1440×900 and mobile at 390×844): quote page with countdown, plan comparison with sponsored cards, proposal form with pre-ticked rider, marketing consent with a double negative, payment summary with a late fee line, add-on upsell modal, renewal reminder push notifications, app home with a nagging interstitial, cancellation flow, grievance page, claims intake. Each visibly contains the violation; bounding boxes are overlaid by the viewer from the fixture coordinates, not drawn into the SVG.

Code evidence: plausible TypeScript (React components, state), Java (pricing service), Kotlin (Android reminder job) and YAML (scheduler, pricing rules) snippets with realistic file paths and line numbers.

Integrity: a Vitest suite parses every fixture with the zod schemas and checks referential integrity (every ID reference resolves, the rule criterion exists, evidence artifact files exist on disk).

---

## 7. Stage A milestones

Each milestone ends with `pnpm lint && pnpm typecheck && pnpm test` (plus `pnpm e2e` from M3 on), a commit with a clear message, a CLAUDE.md update, and a summary for you.

| #   | Milestone                      | Deliverables                                                                                                                                                                                                                                                                                                                                   | Acceptance criteria                                                                                                                                                                                                                           |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Foundation                     | git init, pnpm workspace, TS strict base config, ESLint flat config, Prettier, Vitest, Playwright, `.gitattributes` (LF), `.editorconfig`, GitHub Actions CI, Next.js app with Tailwind + shadcn/ui, `config/brand.ts`, `vercel.json` (bom1), `.env.example`, CLAUDE.md, README (Windows setup), reserved `apps/worker` and `supabase` folders | `pnpm install` + `pnpm dev` work on Windows PowerShell; all checks pass locally; CI workflow file valid; `git ls-files --eol` shows LF                                                                                                        |
| M1  | Access gate                    | Passcode page, route handler, proxy, signed cookie, logout                                                                                                                                                                                                                                                                                     | Unauthenticated requests to any route redirect to `/access`; wrong passcode shows an error; correct passcode reaches `/`; static assets excluded; unit tests for token sign/verify; Playwright test for the gate                              |
| M2  | Domain, schemas, rules         | zod schemas and types, repository interfaces, rule pack schema, 13 draft YAML packs, YAML → JSON bundle build                                                                                                                                                                                                                                  | 13 packs validate; exactly one per `PatternId`; schema unit tests (valid and invalid cases); all packs marked draft                                                                                                                           |
| M3  | Sample data layer              | Fixtures, SVG illustrations, `SampleDataRepository` with localStorage overlay, `createRepositories`, derive functions, `RepositoryProvider` + hooks                                                                                                                                                                                            | Fixture integrity suite passes; derive functions unit tested (matrix precedence rules, KPIs, risk register); overlay write/reset tested                                                                                                       |
| M4  | App shell, Home, Settings      | Layout, sidebar, header, sample-data badge (role switcher, reset), theme toggle, Home list, Settings tabs                                                                                                                                                                                                                                      | Badge only visible when `DATA_SOURCE=sample`; light/dark both usable; Home shows both assessments with progress and risk summary; stage reorder in Settings reflects in the matrix columns; works at 768 px                                   |
| M5  | Wizard and run view            | Six-step wizard with journey step editor, pattern selection, launch; engine timeline with replay                                                                                                                                                                                                                                               | A new assessment can be created end to end and appears on Home; invalid steps block progress with messages; the run view animates through all five engines and links to the overview when finished                                            |
| M6  | Overview and compliance matrix | KPI cards, three charts, full matrix, cell drawer                                                                                                                                                                                                                                                                                              | Matrix shows red, yellow, green and grey cells per the precedence rules; drawer shows evidence, rationale, rule reference, remediation and links to finding detail; keyboard accessible                                                       |
| M7  | Findings list and detail       | Filters, search, URL state, bulk update, screenshot viewer, code/config viewer, review panel, audit trail, correlated findings                                                                                                                                                                                                                 | Every filter narrows results correctly (unit + e2e); bulk update writes history entries; transitions respect role and state machine; zoom/pan keep boxes aligned; code highlights the right lines                                             |
| M8  | Rule library and reports       | Rule list and detail, report preview, Excel export, print stylesheet                                                                                                                                                                                                                                                                           | Excel file opens in Excel with one row per pattern × stage (13 × 9 = 117 rows for the completed assessment); the print preview paginates cleanly on A4 with no app chrome                                                                     |
| M9  | Hardening and deployment       | Full-flow Playwright spec, accessibility pass (axe), empty/loading/error states, README deploy section, Vercel project setup guidance, final CLAUDE.md                                                                                                                                                                                         | Full walkthrough spec passes (gate → home → wizard → run → overview → matrix → finding → review → report → export); the banned-word check passes; deployed URL works behind the passcode (you create the Vercel project, see open question 6) |

---

## 8. Conventions (to be captured in CLAUDE.md)

- TypeScript strict everywhere; no `any`; domain types come only from `@dpat/shared`.
- Screens use only `lib/data` hooks; no fixture imports outside `packages/shared/src/data/sample`.
- Pure derivation logic lives in `packages/shared` and is unit tested; components stay presentational where possible.
- Fixed tokens for severity, status and matrix colours in one Tailwind theme file.
- Banned-word check: a CI script fails the build if the excluded term from the brief appears anywhere (the script stores the term encoded so the repository itself stays clean).
- Commits: conventional style (`feat(web): …`, `chore: …`).
- Windows: all scripts are cross-platform (no bash-only syntax in `package.json`); LF enforced by `.gitattributes`.

---

## 9. Decisions (approved 2026-09-29)

1. **Sample-mode writes:** saved in a browser localStorage overlay; the Sample data badge keeps the reset option and role switcher.
2. **Matrix colours:** all Detected = yellow with "Awaiting review" marker (unreviewed AI output is never red); all Closed = green with "Remediated" marker; all Dismissed = green; mixed cells take the most severe colour present (red > yellow > green).
3. **Guideline text:** rule packs drafted from Annexure 1 in our own words, all marked "draft, pending compliance review". The official PDF will be placed in `docs/reference/` later for cross-checking.
4. **Product name:** "Dark Pattern Assessment Tool", package prefix `@dpat`. Name and logo live only in `apps/web/config/brand.ts`.
5. **Report:** the structure in screen 10, with one component per report section so a house template can replace sections later.
6. **Repository:** `https://github.com/amoghsuman/Dark-Pattern-Assessment-Tool` as `origin`, branch `main`. Vercel is linked by the owner.
7. **Responsive target:** optimised for desktop and tablet; phone widths readable.
8. **Toolchain:** Node 24, pnpm 12, Next.js 16, Tailwind v4, pinned via `engines` and `packageManager`. README notes selecting Node 24 in Vercel project settings. TypeScript is pinned to 6.0.x because typescript-eslint does not yet support TypeScript 7; ESLint is pinned to 9.x for plugin compatibility.
9. **Avoided-word check:** whole-word, case-insensitive match, so words that merely contain those letters pass.
