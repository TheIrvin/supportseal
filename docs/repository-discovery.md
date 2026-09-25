# Repository discovery

## Scope of inspection

The target repository, [`pietervw/supportseal`](https://github.com/pietervw/supportseal), contained only `Initial.md` and `.gitignore` at inspection (2026-09-25, before this docs/ set was added in the same PR); no app stack is established yet. Representative existing projects inspected for conventions: [`auditseal`](https://github.com/pietervw/auditseal), [`engineering-comments-register`](https://github.com/pietervw/engineering-comments-register), [`schoolreports-multi`](https://github.com/pietervw/schoolreports-multi), [`checkid`](https://github.com/pietervw/checkid), [`vauxey-theme`](https://github.com/pietervw/vauxey-theme) and [`coding-agent-template`](https://github.com/pietervw/coding-agent-template). This is a focused sample, not a claim that every mapped repository was audited.

## Reusable patterns observed

| Area | Observation | Support app implication |
| --- | --- | --- |
| Application | Recent apps use Next.js App Router, TypeScript and React; project structures vary. | A Next.js/TypeScript app matches established work, pending runtime checks for persistent chat. |
| Package/build | Main apps use npm and `package-lock.json`; `coding-agent-template` instead uses pnpm. | Prefer npm for this project; keep normal lint, typecheck, test and build commands. |
| Data | `auditseal`, `schoolreports-multi` and the web app in `engineering-comments-register` use Prisma; the template uses Drizzle. | PostgreSQL and Prisma are a familiar starting point; tenant isolation needs product-specific safeguards. |
| Auth | Existing apps commonly use Clerk. | Do not inherit Clerk as a required dependency: this product must work independently when self-hosted. See ADR-0002. |
| UI | `vauxey-theme` uses original React components, Radix-style primitives, Tailwind tokens and a Vuexy-inspired visual language. | Use its design system as a reference; do not copy proprietary Vuexy source or assets without licence verification. |
| Forms/tests | React Hook Form and Zod recur; Vitest/Jest and Playwright are used, with verification scripts and CI in several repos. | Reuse the conventions that fit; prioritise cross-tenant integration tests and browser workflows. |
| Operations | `auditseal` contains Docker groundwork, Stripe integration and verify workflows; other apps use SendGrid and S3-compatible storage. | Familiar integration examples exist, but provider choices and local Docker operations require validation for this product. |

## Decisions to validate during implementation

Check the current documentation and licences for chosen auth, email and UI dependencies; test a clean self-hosted install and chat reconnect; verify PostgreSQL-backed event delivery behind the target reverse proxy; compare inbound email provider capabilities before selecting one. Resolved (2026-09-25): [`vauxey-theme`](https://github.com/pietervw/vauxey-theme) is the mapped theme repository — original React components with a Vuexy-inspired visual language and no licensing restrictions on reuse — so its kit may be copied into this AGPL repository; PixInvent/Vuexy source itself remains prohibited. Test-framework choice is tracked as [pietervw/supportseal#7](https://github.com/pietervw/supportseal/issues/7).

The source of observed conventions is the repositories above, especially their root manifests and `AGENTS.md` files. This document records reusable constraints and source locations, not package versions or a snapshot of implementation progress.
