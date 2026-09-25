# SupportSeal

**SupportSeal** is an open-source customer support platform for people who
build several independent products: one unified inbox, a chat widget and
first-class support email per Product, deliberate developer/application
context, and a choice between managed hosting and genuine self-hosting from
the same source. See [docs/PRD.md](docs/PRD.md) for the product promise.

## Status

**Pre-code.** This repository currently contains project documents only —
no application code, package manifest, CI or Docker setup yet. The intended
starting stack (Next.js/TypeScript, PostgreSQL, Prisma) is direction, not a
decision; see [docs/architecture.md](docs/architecture.md).

## Read this first

- [docs/PRD.md](docs/PRD.md) and [docs/FRD.md](docs/FRD.md) are the
  **canonical** product requirements (scope and observable V1 behaviour).
- [Initial.md](Initial.md) is the master prompt: mission, full V1 scope,
  process and model-routing instructions. Where it conflicts with the
  PRD/FRD, the PRD/FRD win; unresolved conflicts are tracked in
  [docs/open-questions.md](docs/open-questions.md).
- [AGENTS.md](AGENTS.md) extracts the process rules coding agents need.

## Document map

| File | What it owns |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Durable product why and scope |
| [docs/FRD.md](docs/FRD.md) | Observable V1 behaviour (stable requirement IDs) |
| [docs/product-positioning.md](docs/product-positioning.md) | Positioning hypothesis and message hierarchy |
| [docs/repository-discovery.md](docs/repository-discovery.md) | Conventions observed in related repositories (snapshot, 2026-09-25) |
| [docs/architecture.md](docs/architecture.md) | Technical direction |
| [docs/adr/](docs/adr) | Decisions: tenancy (0001), auth (0002), realtime (0003), email boundary (0004) |
| [docs/open-questions.md](docs/open-questions.md) | Decisions pending Pete |
| [Initial.md](Initial.md) | Master prompt: mission, full V1 scope, process rules |
| [AGENTS.md](AGENTS.md) | Agent process guide (model routing, PR workflow, verification) |

## Licence

AGPLv3 — see [LICENSE](LICENSE). The UI kit derives from
[vauxey-theme](https://github.com/pietervw/vauxey-theme) (original components,
no licensing restrictions); PixInvent/Vuexy source is never copied.
