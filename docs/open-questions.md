# Open questions

Decisions that need Pete, with options and source references. In the
numbered questions, nothing is decided unless it is marked **Resolved**;
never treat an option as an answer. When a question is resolved, move the
outcome into the owning document (PRD/FRD/architecture/ADR/design doc) and
mark the entry **Resolved** with Pete's answer and date. Entries marked
**Default** in "Design decisions" are working choices made on Pete's behalf.
They apply until Pete overrides them; an override updates the listed docs.

## Design decisions (2026-09-25)

Questions raised by the V1 design docs (`docs/design/`). Numbers follow the
design review list.

### Resolved by Pete

| # | Question | Pete's answer | Recorded in |
| --- | --- | --- | --- |
| D1 | Away mode scope | **Resolved:** one Workspace-wide Live/Away setting, not per Product | FR-CHAT-04; `design/app-shell.md`, `chat-widget.md` |
| D2 | Email to an archived Product | **Resolved:** it bounces | FR-PROD-01; `design/product-settings.md`, `support-inbox.md` |
| D3 | Reply to a Closed Conversation | **Resolved:** a customer or agent reply reopens the same Conversation; no new Conversation; it is counted once ever for billing (also resolves question 2 below) | FR-INBOX-02, FR-USE-01, architecture.md; `design/support-inbox.md`, `conversation-view.md`, `chat-widget.md` |
| D6 | Who deletes Conversations and Products | **Resolved:** Admins only | FR-ACC-01; `design/conversation-view.md`, `product-settings.md` |
| D9 | Page URL capture | **Resolved:** the widget records the page URL automatically | FR-CTX-01/02; `design/chat-widget.md`, `conversation-view.md` |
| D12 | Branding | **Resolved:** mint green; full palette, tokens and logo direction delegated to the design pass | `design/brand.md` |

### Defaults (Pete can override)

| # | Question | **Default** chosen | Why | Recorded in |
| --- | --- | --- | --- | --- |
| D1a | Who can toggle Live/Away | **Default:** Admins only; Agents see the status read-only | Workspace-wide change affects every Product; matches Admin ownership of channel settings (FR-ACC-01) | `design/app-shell.md` |
| D6a | Who manages saved replies | **Default:** Admins create, edit and delete; every role inserts them | FR-INBOX-02 says "managed" saved replies; keeps one curated set | `design/app-shell.md`, `conversation-view.md` |
| D4 | Agent name vs "{Product} Support" | **Default:** customers see "{Product} Support" in the widget and as the email sender name; the dashboard shows which agent replied | Keeps Product identity primary (FR-EMAIL-02) and avoids exposing staff names | `design/chat-widget.md`, `conversation-view.md`, `product-settings.md` |
| D5 | When a chat reply goes out by email | **Default:** email-started → email. Chat with the visitor's widget connected (stream or heartbeat within 60s) → chat. Visitor not connected and email known → email, also stored in the chat thread. No email → chat only, with a warning. The agent can override when both are possible | Delivers replies where the visitor actually is (FR-EMAIL-02) | `design/conversation-view.md` |
| D7 | Domains vs allowlist; subdomains | **Default:** one "Allowed domains" list serves as both; exact hostname match; explicit `*.example.com` covers subdomains but not the apex; localhost is a separate switch | Simplest model that satisfies FR-CHAT-01 without surprise access | `design/product-settings.md`, `onboarding.md` |
| D8 | Hosted test page security | **Default:** an Admin-only, signed, single-Product test token (30 minutes) lets the SupportSeal-hosted test page load that Product's widget. No allowlist entry is added; the token grants only a normal visitor session. Test Conversations get an automatic "test" tag and count for usage normally. Security review required in the widget PR | Avoids a blanket origin exception (FR-CHAT-01, FR-SEC-01) | `design/onboarding.md`, `chat-widget.md` |
| D10 | Widget size budget | **Default:** loader ≤ 5 KB gzip; panel app ≤ 50 KB gzip JS on first open (excluding images/attachments); both reported in the widget PR | Initial.md §55 lists widget size as critical | `design/chat-widget.md` |
| D11 | Archive before delete | **Default:** a Product must be archived before it can be deleted (Admins only, typed-name confirmation). Conversation deletion needs only a confirmation dialog | Two deliberate steps for the most destructive action | `design/product-settings.md` |
| D2a | Replying in an archived Product's Conversations | **Default:** read-only until the Product is unarchived (notes, tags and status still work) | Customer replies would bounce and the widget no longer loads, so replies could not continue | `design/conversation-view.md`, `support-inbox.md`, `product-settings.md` |
| D9a | Which part of the page URL | **Default:** origin plus path; query string and fragment stripped; developers may send a full URL via `context()` | Query strings often carry tokens or emails (FR-SEC-02) | `design/chat-widget.md`, `conversation-view.md` |
| D13 | Generated inbound address and `inboundEmailVerified` semantics | **Default:** every new Product gets an auto-generated `product_<random>@<inbound domain>` address (unique, allocated at create); `inboundEmailVerified` stays null in V1 because generation is not verification — "receiving" status derives from inbound deliveries (issue [#45](https://github.com/pietervw/supportseal/issues/45); a provider verification ping can stamp it later) | Keeps the checklist's "first inbound email received" proof honest without inventing a provider flow (Initial.md §13; `design/onboarding.md` open point) | `design/product-settings.md`, `design/onboarding.md` |

## Marketing site (2026-09-25)

Raised by [design/marketing-site.md](design/marketing-site.md) (launch
readiness, outside V1). Details and context are in that doc's "Open
questions".

| # | Question | **Default** (if any) |
| --- | --- | --- |
| M1 | Serve marketing only in hosted mode, or behind its own flag? | **Default:** hosted mode only; self-hosted `/` unchanged |
| M2 | Hosted tier shape: `usage.ts` gives Pro unlimited Conversations and no agent limits, unlike volume-based paid tiers and Initial.md §21's "one agent on Free" | **Resolved (Pete, 2026-09-26, issue [#15](https://github.com/pietervw/supportseal/issues/15)):** Free $0 — 100 new Conversations/month, 1 agent; Pro $39/month — 1,000 new Conversations/month, unlimited agents and Products; never advertised as unlimited Conversations. Recorded in `src/config/pricing.ts` (single source), FR-USE-02, marketing copy and SF-12 |
| M3 | Privacy/Terms pages before public hosted sign-up | None: launch-order decision. Drafts exist under `/legal` ([#14](https://github.com/pietervw/supportseal/issues/14)), marked draft and noindex, and are linked from nothing public until Pete sets `legalConfig.operative` in `src/config/legal.ts` after legal review; tests and the build refuse that while placeholders remain |
| M4 | Changelog: GitHub Releases or a site page | **Default:** GitHub Releases, link hidden until the first release |
| M5 | Run the real widget on the marketing site (dogfooding) | None |
| M6 | Demo seed (Initial.md §53) is required for all screenshots | None: scheduling |
| M7 | Commit the screenshot-capture script? | **Default:** not committed; procedure documented in the design doc |
| M8 | Keep a "Not yet" section on `/features` | **Default:** keep |

## Diagnostics (V2 design, 2026-09-29)

Raised by [design/diagnostics.md](design/diagnostics.md) (V2, not V1).
Details and the full list of defaults are in that doc's "Decisions and
defaults" and "Open questions".

| # | Question | **Default** (if any) |
| --- | --- | --- |
| Q1 | Notice or consent: is a customer-controlled switch plus a widget notice enough, or is a "wait for consent" mode and/or visitor opt-out needed (legal, GDPR/UK GDPR review)? | **Default:** notice line plus the developer pause hook (`diagnostics(false)` pauses and clears the buffer; `diagnostics(true)` resumes); wording from legal review |
| Q2 | Retention period for diagnostic snapshots | **Default:** 30 days, fixed until configurable retention lands |
| Q3 | Capture "warnings" via a narrow `console.warn`/`console.error` wrapper, or drop warnings from the slice? | **Default:** narrow wrapper; primitives as text, an `Error` as `name: message`, anything else as `[object]` |
| Q4 | Add a scheduled purge job (new infrastructure) or accept hidden-until-purged expired rows? | **Default:** read-time expiry filter plus bounded purge on ingest; no new job |

## Product branding (V2 design, 2026-10-01)

Raised by [design/branding.md](design/branding.md#open-questions). This is a
design for a later build, not a change to V1 or a record of Pete's approval.

| # | Question | Default or unresolved boundary |
| --- | --- | --- |
| BQ1 | Logo formats, budgets and no-logo fallback | **Default:** static PNG/JPEG/WebP, 2 MiB input, bounded dimensions, sanitised WebP ≤100 KiB; contained square mark with Product initial/colour fallback |
| BQ2 | Hosted/self-hosted storage and public vs signed delivery | **Default:** existing local persistent storage and public app route, five-minute cache; CDN/provider unselected, private delivery requires revised design |
| BQ3 | Launcher corners | **Default:** bottom-right initially, bottom-left optional; no top corners/free offsets |
| BQ4 | Greeting length, placement and i18n | **Default:** one plain-text value, 240 Unicode code points / three lines / 1,024 UTF-8 bytes, shown before messages in Live/Away; no translation; blank restores V1 behaviour |
| BQ5 | Image decoder dependency and deployment support | **Unresolved:** later build must propose a maintained decoder and obtain the normal dependency checkpoint before adding it |
| BQ6 | Crash recovery and failed asset deletion | **Default:** immediate compensating cleanup and observable failures; **unresolved:** concrete recovery procedure/retry ownership before shipping, with explicit approval if new infrastructure is needed |
||||||| parent of dab2f79 (docs: design V2 conversation assignment and priority)
## Assignment and priority (V2 design, 2026-10-01)

Proposed build contract: [design/assignment-priority.md](design/assignment-priority.md).
Its “Defaults and open questions” section owns AP-Q1–AP-Q7 and the associated
acceptance criteria. These are working defaults Pete can override, not
resolved decisions or additions to V1. None blocks the scoped design.

| ID | Question | **Default** |
| --- | --- | --- |
| AP-Q1 | Auto-assign on first agent reply? | No; explicit assignment only |
| AP-Q2 | Notify an assignee whose dashboard is inactive? | No; active-dashboard notices, Mine and private history only |
| AP-Q3 | Require an explicit priority choice? | No; required stored value defaults to Normal |
| AP-Q4 | Keep assignee and priority on reopen? | Yes, while the assignee remains a member |
| AP-Q5 | Allow Agents to reassign anyone's work/change priority? | Yes; same triage rights as Admins |
| AP-Q6 | Include bulk assignment/priority? | Defer; header controls only in the first slice |
| AP-Q7 | Default to Priority first sorting? | No; retain Latest activity, offer Priority first |dab2f79 (docs: design V2 conversation assignment and priority)
||||||| parent of 7370a49 (docs: design V2 accessibility requirements)
||||||| parent of c9226d3 (docs: design V2 accessibility requirements)
## Accessibility (V2 design, 2026-10-01)

Raised by [design/accessibility.md](design/accessibility.md). Its `AX-*`
criteria define the later build; **Defaults** are working choices, not
recorded approvals or a claim of conformance. The build can proceed with
WCAG 2.2 AA as its target, standard Tab navigation, opt-in inbox shortcuts
and the documented manual test matrix. Agent avatars, presence and typing
indicators remain outside this slice.

| # | Question | Working position |
| --- | --- | --- |
| AQ1 | Require an independent audit or published conformance report before a public AA claim? | Undecided. No external audit commissioned or public claim authorised; internal implementation and verification can proceed. |
| AQ2 | Additional customer-required assistive technology/browser/email-client coverage? | **Default:** the design's NVDA/Firefox, VoiceOver/Safari, TalkBack/Chrome and email-client matrix; record gaps, do not promise untested contractual coverage. |
| AQ3 | Publish an accessibility statement and dedicated feedback contact? | **Default:** existing support/contact routes; Pete decides ownership/contact and any public commitment. No invented address or SLA. |c9226d3 (docs: design V2 accessibility requirements)7370a49 (docs: design V2 accessibility requirements)

## 1. V1 scope: marketing site, analytics, legal drafts, demo data

Initial.md requires for V1/launch: the marketing site (§26, §62 "marketing
site represents the real product"), Umami analytics (§28, §62 "Umami
integration works as intended"), draft legal documents (§29) and a seeded
demo environment (§53). The PRD — canonical per Initial.md's "Durable project
documents" section — scopes V1 without them ([PRD.md](PRD.md) "V1 boundary"),
and the marketing site appears in neither its V1 boundary nor its "Later and
outside scope" list.

**Resolved (Pete, 2026-09-25):** V1 scope is the PRD's V1 boundary as
written. The marketing site, Umami analytics, draft legal documents and
demo data are out of V1. Recorded in [PRD.md](PRD.md) "V1 boundary".
Initial.md itself is unchanged; the PRD wins on this conflict.

## 2. Billable Conversation lifecycle

**Resolved (Pete, 2026-09-25, with design answer D3):** option a) is chosen:
a Conversation counts once ever, in the billing period in which it was
first opened. A reply to a Closed Conversation reopens it rather than
creating a new one, and reopening or continuing it in a later period never
counts again. Recorded in FR-USE-01 ([FRD.md](FRD.md)) and
[architecture.md](architecture.md). Pete stated this in his reopen answer
("consistent with a billable Conversation being counted once ever"), not as
a separate answer to this question; he can re-open it if that reading is
wrong.

## 3. Multi-Workspace self-hosting

Initial.md §16: "one deployment effectively represents one Workspace";
ADR-0001 previously said "normally has one Workspace"; FR-HOST-01 said "can
represent one Workspace". The docs now uniformly say a self-hosted deployment
represents one Workspace in V1, but none states whether additional Workspaces
are blocked, merely untested, or supported.

**Resolved (Pete, 2026-09-25):** enforced single-Workspace. A self-hosted
installation blocks creating additional Workspaces; the schema stays
multi-Workspace capable (Initial.md §16). Recorded in FR-HOST-01
([FRD.md](FRD.md)), [architecture.md](architecture.md) and
[ADR-0001](adr/0001-shared-codebase-and-tenancy.md).

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

**Resolved (Pete, 2026-09-25):** `pietervw/vauxey-theme` is the theme
repository, with no licensing restrictions. Its original components, tokens
and helpers may be copied into SupportSeal; PixInvent/Vuexy source still
must not be. How it is used is in [design/](design/) (baseline commit
`46e0cc7`). AGENTS.md's guardrail wording reflects this: the vauxey-theme
kit may be copied; PixInvent/Vuexy source may not.

## 5. AGPLv3 LICENSE file

**Resolved (Pete, 2026-09-25):** add the AGPLv3 LICENSE now. The standard GNU
AGPLv3 text (verbatim from the FSF) is at the repository root (`LICENSE`);
README.md's licence section links it.

## 6. Product name

**Resolved (Pete, 2026-09-25):** SupportSeal is the real product name. The
brand is mint green; the palette, tokens and logo direction are in
[design/brand.md](design/brand.md). The name stays centrally configured
(`src/config/site.ts` → `brand.name`, per Initial.md §58) rather than
scattered through code, tables or templates. README.md and AGENTS.md now
use the name accordingly.

**Update (Pete, 2026-09-29):** after a rename shortlist (challengers lost
on trademark or domain availability), the name **stays SupportSeal** and
the official domain is **supportseal.app** (free at the 2026-09-29 RDAP
check; Pete registers it). `supportseal.com` is held by a domain investor
(GoDaddy, sale-listed, created 2025-08) and is not pursued for now. The
host layout is decided the same day: **single origin** — marketing,
dashboard, widget and API all on `https://supportseal.app` (runbook:
[hosted-deployment.md](hosted-deployment.md); `app.supportseal.app` stays
reserved for a future split). Issue
[#23](https://github.com/pietervw/supportseal/issues/23) resolves via the
`NEXT_PUBLIC_APP_URL` deployment value — `trustedOrigins` is dynamic.

## 7. Tracking of deferred specs

**Resolved (Pete, 2026-09-25):** deferred specs are tracked as GitHub issues
on [pietervw/supportseal](https://github.com/pietervw/supportseal); each
issue links back to its owning document:

| Spec | Owning document | Issue |
| --- | --- | --- |
| Auth library | [ADR-0002](adr/0002-independent-authentication.md) | [#5](https://github.com/pietervw/supportseal/issues/5) |
| Realtime delivery spike | [ADR-0003](adr/0003-realtime-delivery.md) | [#2](https://github.com/pietervw/supportseal/issues/2) |
| Email provider | [ADR-0004](adr/0004-email-boundary.md) | [#4](https://github.com/pietervw/supportseal/issues/4) |
| Deployment host | [architecture.md](architecture.md) | [#3](https://github.com/pietervw/supportseal/issues/3) |
| Test framework | [repository-discovery.md](repository-discovery.md) | [#7](https://github.com/pietervw/supportseal/issues/7) |
| Free-tier limits | pricing configuration (centralised in the application) — decided in [#15](https://github.com/pietervw/supportseal/issues/15), recorded in `src/config/pricing.ts` | [#6](https://github.com/pietervw/supportseal/issues/6) | |

## 8. First email provider

ADR-0004 requires comparing hosted provider candidates for inbound
parsing, signatures, attachment limits, deliverability, local testing and
cost before selecting the first provider. Tracked as
[#4](https://github.com/pietervw/supportseal/issues/4).

**Resolved (Pete, 2026-09-26):** Postmark. The comparison of Postmark,
Mailgun, SendGrid and Amazon SES is in
[#4](https://github.com/pietervw/supportseal/issues/4). Postmark won on
its parsed-JSON inbound webhook (full threading headers, reply
stripping, plus-addressing, spam/SPF signals, message IDs for
idempotency), inbound retry and error visibility, transactional
deliverability and local-testing story. The adapter boundary stays
provider-neutral per [ADR-0004](adr/0004-email-boundary.md) — the ADR
records the selection only. Self-hosted deployments remain
provider-independent ([self-hosting.md](self-hosting.md)). The hosted
subprocessor row for #14 is "Postmark (ActiveCampaign LLC)".

## V2 sender-domain design

The [verified custom sending domains design](design/sender-domains.md) proposes
V2 behaviour; it does not change V1 or resolve Pete's product decisions.
Working defaults SD1–SD6 cover one active sender per Product, `support` as the
local-part, no composer From overrides, 30-day failed-setup retention, explicit
managed fallback, and required DNS checks with a 24-hour freshness limit.
See its [defaults and open questions](design/sender-domains.md#defaults-and-open-questions)
for trade-offs and override points.

**Open before hosted rollout:** Pete/operator must confirm Postmark account and
stream suitability for multi-tenant customer-domain sending and choose resource
isolation based on actual provider constraints. No account limit, reputation
isolation guarantee or pricing/plan restriction is decided by this design.
