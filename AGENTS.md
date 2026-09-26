# SupportSeal agent guide

Open-source customer support platform for people building several products
(SupportSeal is the product name; centrally configured in
`src/config/site.ts` — never hard-code it). Product behaviour questions go
to docs/PRD.md / docs/FRD.md; anything undecided lives in
docs/open-questions.md — never guess an answer to an open question.

## Setup and exact commands

- Node ≥22 <25 (`.nvmrc` = 22), npm. `npm install` runs `postinstall` →
  `prisma generate`.
- Copy `.env.example` → `.env`. Dev: `npm run db:dev` (migrates the local
  file-backed PGlite database at `.dev-data/`), then `npm run dev`. With a
  real Postgres: set `DATABASE_URL`, use `npm run db:migrate`.
- Build: `npm run build` (prisma generate + next build, standalone output),
  then `npm run start`.
- Path alias `@/*` → `src/*` (tsconfig + vitest). Next.js 16 App Router,
  React 19, Tailwind CSS 4 with the vauxey-theme kit (`src/components`,
  `src/styles/tokens.css`).
- Prisma client output → `src/generated/prisma` (gitignored). After schema
  changes: `npx prisma generate` and a migration via `npx prisma migrate dev`
  against a real Postgres (or hand-write `prisma/migrations/<ts>_name/`
  and replay with `npm run db:dev` + tests).

## Verification matrix

| Command | Meaning |
| --- | --- |
| `npm run verify:fast` | lint + typecheck + unit/integration tests |
| `npm run verify` | verify:fast + build |
| `npm run verify:full` | verify + Playwright E2E (hosted + self-hosted) |

- Single test file: `npm run test:run -- src/lib/__tests__/brand.test.ts`.
- Integration tests run on in-memory PGlite (no external database needed).

## Architecture map

- Modular monolith (Next.js 16 App Router, React 19) + separately bundled
  chat widget. Dashboard routes in `src/app/(app)`, auth pages in
  `src/app/(auth)`, API routes in `src/app/api`, onboarding and widget
  preview under `src/app/`. Route protection lives in `src/proxy.ts`.
- Domain modules in `src/lib/`: workspace, products, conversations,
  saved-replies, attachments, usage (billing metering), stripe, `email/`
  (inbound/outbound adapters), widget, events (SSE delivery), dev-context.
  UI kit from vauxey-theme in `src/components` + `src/styles/tokens.css`.
- Auth is better-auth in-process against Prisma (`src/lib/auth.ts`,
  ADR-0002). Prisma schema at `prisma/schema.prisma`; client output →
  `src/generated/prisma` (gitignored). CI: `.github/workflows/ci.yml`;
  dev scripts in `scripts/` (`dev-db.mjs`, `seed-dev.ts`).
- Still pending from the direction docs: the ADR-0003 realtime spike
  (two processes behind a reverse proxy, [issue
  #2](https://github.com/pietervw/supportseal/issues/2)) and the managed-SaaS
  host decision ([issue #3](https://github.com/pietervw/supportseal/issues/3)).
- Document map: docs/PRD.md (why/scope) and docs/FRD.md (observable V1
  behaviour, stable requirement IDs) are canonical; Initial.md is the master
  prompt (mission, full V1 scope, process rules) and yields to the PRD/FRD
  on conflicts; docs/open-questions.md records decisions taken and defaults
  Pete can override.

## Important invariants and safety constraints

- Workspace isolation is a security boundary: every tenant-aware operation
  must prove Workspace ownership (Initial.md §30, ADR-0001). A self-hosted
  deployment serves exactly one Workspace; additional Workspaces are blocked.
- The UI kit derives from vauxey-theme (original components, no licensing
  restrictions — docs/repository-discovery.md). Never copy Vuexy/PixInvent
  source, assets or components into this AGPL repository.
- Licence is AGPLv3 (LICENSE at the root).
- SupportSeal is the product name; use the central configurable brand name
  (application config), never scattered hard-coded names.

## Model routing and cost (Initial.md §42–47)

- Default implementation model: **OpenCode + GLM-5.3** — backend, database,
  API routes, routine frontend, tests, refactoring, migrations, Docker, CI,
  docs, bug fixes.
- Significant frontend design/UX decisions: **Cursor Agent + Opus 5.5**
  (fallback Astra 6 Medium; Grok 4.7 last resort only).
- Canonical marketing copy: **Codex harness + Astra 6 High**, then GLM-5.3
  implements it.
- Before using an expensive model ask: "Will it materially improve this
  particular task?" If not, use GLM-5.3.

## PR workflow (Initial.md §45–46, §48–51)

- Before a substantive PR: run `/cursor-prep` where available (soft
  requirement); primary local review coderabbit-cli, fallback
  OpenCode + GLM-5.3.
- After opening: run `/babysit-reviews`. PR reviewers: CodeRabbit,
  OpenCode + GLM-5.3 and Codex as complementary reviewers.
- Evaluate every finding against requirements, tests, architecture and
  runtime behaviour; do not blindly apply reviewer suggestions.
- Before any PR: formatting, lint, typecheck, tests and build **where they
  exist**; for user-facing functionality actually run the application —
  compilation is not proof. Visual PRs include screenshots with realistic
  data.
- One coherent idea per PR. Target <600 meaningful changed lines; avoid
  >1,000 without a justified reason. Stacked PRs: base correctly on the
  parent, make the dependency obvious, never duplicate the parent's changes,
  retarget when the parent merges.

## Verification matrix

| Command | Meaning |
| --- | --- |
| `npm run verify:fast` | lint + typecheck + unit/integration tests |
| `npm run verify` | verify:fast + build |
| `npm run verify:full` | verify + Playwright E2E (hosted + self-hosted) |

- E2E (`npm run test:e2e`) boots its own `next dev` servers on ports 3100 (hosted)
  and 3200 (self-hosted) against throwaway PGlite databases; it needs
  `npx playwright install chromium` once and free ports 3100/3101/3200/1025.
  On hosts where the pinned Chromium cannot run, set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a working build.
- Browser verification is mandatory for every important user-facing flow;
  unit tests alone are not acceptance. Reference
  procedures: the V1 end-to-end flow (Initial.md §52) and the two-Workspace
  cross-tenant sanity test (Initial.md §63). Cross-Workspace access
  attempts must fail.

## Deployment and post-deployment checks

- Self-hosting target is `docker compose up` (Postgres + one-shot migrate +
  app; groundwork committed) — full guide in [docs/self-hosting.md](docs/self-hosting.md).
  The managed-SaaS host is undecided — test
  long-lived request and background-job requirements before committing to
  one ([issue #3](https://github.com/pietervw/supportseal/issues/3)).
  Self-hosted mode must never require Stripe, the hosted API or external
  telemetry (Initial.md §17).

## Known non-obvious gotchas

- The PRD/FRD are canonical; when Initial.md conflicts with them, resolve
  it explicitly via docs/open-questions.md instead of silently picking a
  side (Initial.md, "Durable project documents").
- Commit `0594e5a` ("Update print statement from 'Hello' to 'Goodbye'")
  actually adds all of Initial.md — misleading label in history.
- Deferred specs live as GitHub issues on pietervw/supportseal
  (docs/open-questions.md has the pointers).

## Definition of done

- Docs-only PRs: lint + build still apply where the toolchain covers the
  changed files; otherwise state explicitly which checks were run.
- PR opened for Pete to merge — the merge is the deploy trigger; never push
  `main` directly.
- Target <600 meaningful changed lines per PR (Initial.md §48).
