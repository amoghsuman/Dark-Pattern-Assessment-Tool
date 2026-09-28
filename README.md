# Dark Pattern Assessment Tool

An AI-assisted tool for Indian regulated entities (banks, insurers, fintechs) to assess websites, mobile apps and code repositories against the 13 dark patterns specified in the CCPA _Guidelines for Prevention and Regulation of Dark Patterns, 2023_. It combines screen analysis, code analysis and backend logic review, and produces audit-grade findings with evidence, rule traceability and remediation guidance.

> **Stage A:** the complete frontend runs on realistic sample data for a fictitious insurer ("Example Life Insurance"). The backend (Supabase, analysis worker, Claude API pipeline) arrives in Stage B. See [PLAN.md](PLAN.md).

## Repository layout

```
apps/web          Next.js web app (deployed to Vercel)
packages/shared   Domain types, zod schemas, data layer (repositories + sample data)
packages/rules    Rule packs for the 13 dark patterns
apps/worker       Reserved for Stage B
supabase          Reserved for Stage B
docs/reference    Reference material (official Guidelines PDF)
```

## Local setup on Windows

### 1. Prerequisites

Install these once (PowerShell):

```powershell
# Node.js 24 LTS (or use nvm-windows: nvm install 24; nvm use 24)
winget install OpenJS.NodeJS.LTS

# pnpm 12 via Corepack (ships with Node)
corepack enable
corepack prepare pnpm@12.6.0 --activate

# Git
winget install Git.Git
```

Check versions:

```powershell
node -v   # v24.x
pnpm -v   # 12.x
```

### 2. Clone and install

```powershell
git clone https://github.com/amoghsuman/Dark-Pattern-Assessment-Tool.git
cd Dark-Pattern-Assessment-Tool
pnpm install
```

The repository enforces LF line endings through `.gitattributes`, which overrides a global `core.autocrlf` setting. If `git status` ever shows files changed only by line endings, run:

```powershell
git add --renormalize .
```

### 3. Environment variables

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local`:

| Variable        | Required                  | Description                                              |
| --------------- | ------------------------- | -------------------------------------------------------- |
| `DATA_SOURCE`   | No (defaults to `sample`) | Data source for the app. Stage A supports `sample` only. |
| `SITE_PASSCODE` | Yes                       | Passcode for the access gate shown before any page.      |

### 4. Run

```powershell
pnpm dev
```

Open http://localhost:3000.

### 5. Checks

```powershell
pnpm lint         # ESLint + avoided-word check
pnpm typecheck    # TypeScript in every package
pnpm test         # Vitest unit tests
pnpm format:check # Prettier

# Playwright (first time only: install the browser)
pnpm --filter @dpat/web exec playwright install chromium
pnpm e2e
```

The same checks run in GitHub Actions on every push and pull request (`.github/workflows/ci.yml`).

## Deployment (Vercel)

1. In Vercel, **Add New Project** and import `amoghsuman/Dark-Pattern-Assessment-Tool`.
2. **Root Directory:** `apps/web`. Vercel detects Next.js and the pnpm workspace; leave the build and install commands at their defaults.
3. **Settings > General > Node.js Version:** select **24.x**.
4. **Settings > Environment Variables:** add
   - `DATA_SOURCE` = `sample`
   - `SITE_PASSCODE` = a long random passcode
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1` (makes Vercel use the pnpm version pinned in `package.json`)
5. Deploy. `apps/web/vercel.json` pins the function region to `bom1` (Mumbai).

Share the deployment URL together with the passcode.

## Branding

The product name, short name, tagline, logo and accent hue live in `apps/web/config/brand.ts`. Replace `apps/web/public/brand/logo.svg` (and `apps/web/app/icon.svg` for the browser tab) to change the logo.

## Contributing

Architecture, conventions and commands are documented in [CLAUDE.md](CLAUDE.md).
