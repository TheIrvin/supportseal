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

## Marketing site (2026-09-25)

Raised by [design/marketing-site.md](design/marketing-site.md) (launch
readiness, outside V1). Details and context are in that doc's "Open
questions".

| # | Question | **Default** (if any) |
| --- | --- | --- |
| M1 | Serve marketing only in hosted mode, or behind its own flag? | **Default:** hosted mode only; self-hosted `/` unchanged |
| M2 | Hosted tier shape: `usage.ts` gives Pro unlimited Conversations and no agent limits, unlike volume-based paid tiers and Initial.md §21's "one agent on Free" | None: needs Pete (issue [#6](https://github.com/pietervw/supportseal/issues/6)); blocks the pricing page |
| M3 | Privacy/Terms pages before public hosted sign-up | None: launch-order decision |
| M4 | Changelog: GitHub Releases or a site page | **Default:** GitHub Releases, link hidden until the first release |
| M5 | Run the real widget on the marketing site (dogfooding) | None |
| M6 | Demo seed (Initial.md §53) is required for all screenshots | None: scheduling |
| M7 | Commit the screenshot-capture script? | **Default:** not committed; procedure documented in the design doc |
| M8 | Keep a "Not yet" section on `/features` | **Default:** keep |

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
| Free-tier limits | pricing configuration (centralised in the application) | [#6](https://github.com/pietervw/supportseal/issues/6) | |
