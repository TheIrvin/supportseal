# Open questions

Decisions that need Pete, with options and source references. Nothing here is
decided; never treat an option as an answer. When a question is resolved, move
the outcome into the owning document (PRD/FRD/architecture/ADR), update this
file, and delete the resolved entry.

## 1. V1 scope: marketing site, analytics, legal drafts, demo data

Initial.md requires for V1/launch: the marketing site (§26, §62 "marketing
site represents the real product"), Umami analytics (§28, §62 "Umami
integration works as intended"), draft legal documents (§29) and a seeded
demo environment (§53). The PRD — canonical per Initial.md's "Durable project
documents" section — scopes V1 without them ([PRD.md](PRD.md) "V1 boundary"),
and the marketing site appears in neither its V1 boundary nor its "Later and
outside scope" list.

Options:

- a) Extend the PRD V1 boundary to include all four items.
- b) Reclassify them as launch-readiness work outside the V1 product boundary
  (tracked in a separate checklist document).
- c) Descope them from V1 (requires an explicit correction to Initial.md).

## 2. Billable Conversation lifecycle

Initial.md §21: "Define the billable Conversation lifecycle clearly and
document it." No document defines it. FR-USE-01 ([FRD.md](FRD.md)) and
[architecture.md](architecture.md) now share one wording — a Conversation is
counted once, when first opened, in that billing period — but the cross-period
case is undecided: does a Conversation continued or reopened in a **later**
billing period count again in that period?

Options:

- a) Count once ever, per Conversation.
- b) Count once per billing period in which the Conversation is active.
- c) Count only on first open; later periods never re-count.

## 3. Multi-Workspace self-hosting

Initial.md §16: "one deployment effectively represents one Workspace";
ADR-0001 previously said "normally has one Workspace"; FR-HOST-01 said "can
represent one Workspace". The docs now uniformly say a self-hosted deployment
represents one Workspace in V1, but none states whether additional Workspaces
are blocked, merely untested, or supported.

Options: enforced single-Workspace / permitted but unsupported / fully
supported (schema stays multi-Workspace capable per Initial.md §16 either way).

## 4. Vuexy theme repository

Initial.md §19: "I own/use Vuexy and have a mapped repository containing my
theme implementation. Discover that repository."
[repository-discovery.md](repository-discovery.md) inspected `vauxey-theme`
(described as original React components with a Vuexy-inspired visual language)
and left the Vuexy/PixInvent redistribution conclusion "not established".
Is `vauxey-theme` that mapped repository, or is there a separate Vuexy
source/licence to inspect? This must be answered — and the licence conclusion
documented — before any theme code or assets are copied into the AGPL
repository.

## 5. AGPLv3 LICENSE file

[PRD.md](PRD.md) commits to "Publish the core under AGPLv3", but no LICENSE
file exists, so GitHub shows the repository as unlicensed. Adding a licence is
a legal/visibility action, so it stays Pete's call.

Options: add the AGPLv3 LICENSE now / add it with the first code PR / defer
until question 4 (Vuexy) is resolved.

## 6. Product name

Initial.md §58: the final product name is undecided; use a central
configurable application/brand name and avoid scattering a temporary name.
"SupportSeal" is currently only the repository working name (README.md uses it
as such). Decide the final name, and where the central brand configuration
lives once application code exists.

## 7. Tracking of deferred specs

These choices are open only in status lines (see the table). Decide where they
are tracked — GitHub issues, this file, or ADR updates — and record each
outcome when made.

| Spec | Current status line | Next step |
| --- | --- | --- |
| Auth library | ADR-0002: "implementation library pending validation" | validate candidates; record choice in ADR-0002 |
| Realtime delivery | ADR-0003: "Proposed; validate with two processes and a reverse proxy" | run the spike; accept or amend the ADR |
| Email provider | ADR-0004: "first provider pending comparison" | compare providers; select first provider |
| Deployment host | architecture.md: "before committing to a host" | test long-lived requests/jobs; choose host |
| Test framework | repository-discovery.md: Vitest/Jest + Playwright observed, undecided | pick unit and E2E frameworks in the foundation PR |
| Free-tier limits | Initial.md §21: "A possible default is one agent on Free" — never landed in the FRD | decide limits; record centrally with pricing config |
