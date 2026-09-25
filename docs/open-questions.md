# Open questions

Decisions that need Pete, with options and source references. Nothing here is
decided; never treat an option as an answer. When a question is resolved, move
the outcome into the owning document (PRD/FRD/architecture/ADR), update this
file, and delete the resolved entry. All entries open on 2026-09-25 have been
resolved into the owning documents; their outcomes are recorded in
[PRD.md](PRD.md) (V1 boundary, licence), [FRD.md](FRD.md) (FR-HOST-01,
FR-USE-01), [ADR-0001](adr/0001-shared-codebase-and-tenancy.md),
[repository-discovery.md](repository-discovery.md) (theme repository) and
README.md (product name: SupportSeal; AGPLv3 LICENSE added at the root).

## Deferred specs tracked as GitHub issues

These choices are open only in status lines; each is tracked on
[pietervw/supportseal](https://github.com/pietervw/supportseal):

| Spec | Owning document | Issue |
| --- | --- | --- |
| Auth library | [ADR-0002](adr/0002-independent-authentication.md) | [#5](https://github.com/pietervw/supportseal/issues/5) |
| Realtime delivery spike | [ADR-0003](adr/0003-realtime-delivery.md) | [#2](https://github.com/pietervw/supportseal/issues/2) |
| Email provider | [ADR-0004](adr/0004-email-boundary.md) | [#4](https://github.com/pietervw/supportseal/issues/4) |
| Deployment host | [architecture.md](architecture.md) | [#3](https://github.com/pietervw/supportseal/issues/3) |
| Test framework | [repository-discovery.md](repository-discovery.md) | [#7](https://github.com/pietervw/supportseal/issues/7) |
| Free-tier limits | pricing configuration (to be centralised in the application) | [#6](https://github.com/pietervw/supportseal/issues/6) |
