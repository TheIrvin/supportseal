# SupportSeal agent guide

Process rules for coding agents working in this repository, extracted from
[Initial.md](Initial.md) (the master prompt). This file stays short; follow
the section links for the full text. Product behaviour questions go to
[docs/PRD.md](docs/PRD.md) / [docs/FRD.md](docs/FRD.md); anything undecided
lives in [docs/open-questions.md](docs/open-questions.md) — never guess an
answer to an open question.

## Repo state and commands

Docs-only: no code, no package manifest, no CI. There is nothing to install,
lint, typecheck, test or build yet.

TODO (foundation PR that adds the application): record install/dev/lint/
typecheck/test/build commands and the verify chain here.

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

## PR workflow (Initial.md §45–46, §50)

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

## PR sizing and stacking (Initial.md §48, §51)

- One coherent idea per PR. Target <600 meaningful changed lines; avoid
  >1,000 without a justified reason; split PRs that grow too large.
- Stacked PRs: base correctly on the parent, make the dependency obvious,
  never duplicate the parent's changes, retarget when the parent merges.

## Browser verification (Initial.md §52, §63)

Every important user-facing flow is verified in a real browser; unit tests
alone are not acceptance. The reference procedures are the V1 end-to-end
flow (Initial.md §52) and the two-Workspace cross-tenant sanity test
(Initial.md §63). Cross-Workspace access attempts must fail.

## Git

Feature branch + PR; Pete merges. Never push to main, never run
`gh pr merge`, never rewrite main history.
