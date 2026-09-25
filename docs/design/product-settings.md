# Product settings — V1 design

Status: design direction for the build thread. Grounded in [PRD](../PRD.md)
(journeys 1–3), [FRD](../FRD.md) (FR-ACC-01, FR-PROD-01, FR-PROD-02,
FR-CHAT-01, FR-CTX-01, FR-EMAIL-01, FR-EMAIL-02, FR-SEC-02) and Initial.md
§6, §9, §11, §13, §14.

**Theme baseline:** vauxey-theme (`pietervw/vauxey-theme` `main` @
`46e0cc7`, paths relative to `src/`), copied into SupportSeal per Pete's
2026-09-25 decision. Colours only via `--vx-*` tokens. `ProductMark`,
`ProductChip`, `CopyButton`, `EmptyState` and `Skeleton` are SupportSeal
additions following theme conventions.

## Scope

Admin-only pages to list, create, edit, archive, unarchive and delete
Products, and to configure each Product's identity, widget/domains, support
email and developer-context setup (FR-PROD-01). Agents cannot open these
pages (FR-ACC-01); the server enforces this too. Onboarding reuses the
create form (`onboarding.md`).

## Layout

Settings pages use the shell's `page` mode: document scroll, content
`max-w-5xl`, `PageHeader` (`components/ui/page-header.tsx`) with a
breadcrumb.

### Products list (`/settings/products`)

- `PageHeader` "Products" with a primary action "Add Product".
- A simple list card (`components/ui/card.tsx`), not a DataTable. Products
  are few, and sorting/filtering/pagination add noise. One row per
  Product:
  - `ProductMark` (md) plus name, and primary domain beneath in `text-muted`
    (with "+n" when more).
  - Email: `Badge` "Receiving" (`success`) once inbound mail has arrived,
    else "Not set up" (`secondary`).
  - Status: nothing for active; "Archived" `Badge` for archived.
  - The row links to the Product detail page. Chevron at the right.
- Active Products first (alphabetical), then an "Archived (n)" section
  collapsed by default.
- Empty: `EmptyState` "No Products yet" with the "Add Product" action.

### New Product (`/settings/products/new`)

The same form as onboarding steps 2–3 on one page: name, colour (8 preset
swatches as a `RadioGroup` plus custom hex, with advisory contrast warning
under 3:1 against white), domains, localhost switch, and a live widget
preview in the right column on `≥ lg`. On create, go to the Product's
**Widget** tab with a success toast, "Acme Analytics created. Add the
snippet to your site." The inbox scope resets to All Products so the new
Product appears alongside existing ones (second aha).

### Product detail (`/settings/products/<id>`)

Header: `ProductMark` (md), name, "Archived" badge if relevant, and
breadcrumb Settings / Products / {name}. Below, tabs (`components/ui/tabs.tsx`
with the `underline` variant added for the inbox; keep Radix semantics) that
sync to the URL (`?tab=`):

**General · Widget · Email · Developer**

Each tab is its own form with explicit **Save**. When a form is dirty, a
sticky action bar appears at the bottom ("Unsaved changes" · Discard ·
Save), following the theme's sticky-actions layout (`app/(dashboard)/forms/
layouts/sticky/page.tsx`). Leaving with unsaved changes prompts a confirm
`Dialog`.

#### General

- **Name** (`Input`) with hint "Shown to customers in the widget and
  email sender."
- **Primary colour**: swatches plus hex, with a live preview of launcher,
  chip and mark. The contrast warning is advisory.
- **Danger zone** (bordered `Card` `outline` `danger` at the bottom):
  - **Archive Product** (active only): `Dialog` explaining the effects:
    "The widget stops loading on your sites and no new conversations can
    start. Existing conversations stay in the inbox." (FR-PROD-01). Button
    "Archive". Afterwards, the page shows an `Alert` (`secondary`) "This
    Product is archived" with an **Unarchive** button.
  - **Delete Product** (FR-SEC-02): `Dialog` requiring the Product name to
    be typed. It states the consequences plainly: all Conversations,
    messages, attachments and the widget key are permanently deleted, and
    this cannot be undone. If deletion runs asynchronously, the list shows
    the Product as "Deleting…" until done.

#### Widget

- **Embed snippet**: code block (`bg-surface-2`, mono, horizontal scroll)
  plus `CopyButton`. The note "This key is public. It only works on your
  allowed domains." (FR-CHAT-01).
- **Public key**: read-only mono text with `CopyButton`.
- **Allowed domains**: `TagInput` (`components/ui/tag-input.tsx`).
  Entries normalise to hostnames; invalid entries are rejected inline. The
  hint says whether subdomains are covered (per open point). Removing the
  last domain shows a warning `Alert`: "With no domains, the widget only
  works on localhost (if enabled)."
- **Development**: `Switch` "Allow localhost" (FR-CHAT-01 explicit
  localhost path), with hint "Turn off once you're live if you don't need
  it."
- **Preview**: the real widget in preview mode, toggling Live/Away
  (`RadioGroup` or small Tabs) so Admins can see both states in the Product
  colour.

#### Email (FR-EMAIL-01, FR-EMAIL-02)

- **Inbound**: a step list (numbered, like the onboarding checklist):
  1. "Forward your support address to:" the generated inbound address in a
     mono field with `CopyButton` (Initial.md §13 forwarding path).
  2. "Send a test email to your support address." A live status line
     updates from realtime: "Waiting for a test email…" → "Last email
     received {time} from {sender}" (`success`).
  - An optional field "Your support address" (e.g. `support@acme.com`),
    used for display and instructions only (see open point).
  - A collapsible "Forwarding help": short, provider-neutral guidance
    (Gmail/Google Workspace, Microsoft 365, generic) naming the setting to
    change. Provider-specific screenshots aren't needed.
- **Outbound (read-only in V1)**: a preview of how replies arrive:
  "From: {Product} Support <{managed sender}>", "Reply-To: {threading
  address}". Hint: "Replies are sent from SupportSeal's managed sender so
  customers see {Product}. Custom sending domains are coming later."
  (Initial.md §14; don't promise dates.) Self-hosted: shows the configured
  sender from instance configuration, or an `Alert` warning "Outbound email
  isn't configured for this installation" linking to the self-hosting docs.
- **Delivery problems**: a count of undelivered replies in the last 30
  days, linking to the inbox (FR-EMAIL-03 "visible for follow-up"). Hidden
  when zero.

#### Developer (FR-CTX-01)

- Two copyable code examples: `identify({ id, email, name })` and
  `context({ plan, appVersion, accountId, adminUrl })`, using the API as
  finally implemented (Initial.md §11 says the exact API is an
  implementation decision).
- A short list of what not to send: "Only send what helps support. Never
  send passwords, tokens or secrets. Context is shown to your team as
  plain text." It also states the size/depth limits (FR-CTX-02).
- An example rendering of the context panel, so developers see where the
  data appears.

## Components (vauxey-theme)

| Need | Source | Notes |
| --- | --- | --- |
| Page header | `components/ui/page-header.tsx`, `components/ui/breadcrumb.tsx` | |
| List card and danger zone | `components/ui/card.tsx` | `outline` + `danger` variant for danger zone |
| Tabs | `components/ui/tabs.tsx` | `underline` variant |
| Fields | `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/form-field.tsx` | |
| Colour swatches | `components/ui/radio-group.tsx` | Custom swatch items |
| Domains | `components/ui/tag-input.tsx` | Hostname normalisation; remove-button aria-labels |
| Localhost toggle | `components/ui/switch.tsx` | |
| Confirmations | `components/ui/dialog.tsx` | Archive, delete (typed name), unsaved changes |
| Status | `components/ui/badge.tsx`, `components/ui/alert.tsx` | |
| Sticky save bar | pattern from `app/(dashboard)/forms/layouts/sticky/page.tsx` | |
| Toasts | `sonner` | Saved / created / archived |
| Copy | new `CopyButton` | idle/copied/error states |
| Preview | widget preview mode | See `chat-widget.md` |

## States

| State | Behaviour |
| --- | --- |
| Loading | `Skeleton` for the header and first form section; tabs visible |
| Not found / no access | One `EmptyState` "Product not found" with "Back to Products" (no cross-Workspace leak, FR-SEC-01) |
| Agent opens URL | In-shell "Only Workspace admins can manage Products" |
| Saving | Save button `Spinner`; fields stay editable; the bar shows "Saving…" |
| Save failed | `Alert` danger in the sticky bar; values kept |
| Field validation | Inline under the field; Save focuses the first error |
| Saved | Toast "Changes saved"; the bar disappears |
| Concurrent edit (another Admin saved) | On save conflict: `Alert` "This Product was changed by someone else. Reload to see their changes." with Reload. Don't overwrite silently |
| Archived Product | Alert with Unarchive; the Widget and Email tabs stay viewable, with a note that they're inactive while archived |
| Email not yet received | Waiting line (neutral), not an error |
| Clipboard blocked | CopyButton error label; text remains selectable |

## Responsive

- `≥ lg`: forms in a two-column grid where it helps (colour plus preview;
  snippet plus preview); otherwise single column, `max-w-2xl` fields.
- `< lg`: single column. The preview moves below the fields and collapses
  to launcher-only with "Show panel".
- Tabs scroll horizontally on narrow screens (four short labels fit at
  360px).
- The sticky save bar spans full width on mobile, with buttons at least
  44px tall.

## Accessibility

- Tabs: Radix provides roles and arrow-key navigation; the URL sync keeps
  Back usable.
- Every input has a visible label; hints and errors are linked via
  `aria-describedby`.
- Swatch radios have colour names; custom hex has format help ("#RRGGBB").
- Copy buttons announce the result through a polite live region ("Copied
  to clipboard").
- The destructive dialog focuses the typed-confirmation input; the Delete
  button stays disabled until the text matches, and Esc cancels.
- Code blocks are `<pre><code>` with a label, and scroll horizontally with
  keyboard focus (`tabindex="0"`).

## Not in V1

Logo/avatar, launcher position, greeting (V2) · launcher icon, custom
online/offline wording, required contact fields (V3) · custom CSS (never in
V1) · verified custom sending domains, SPF/DKIM guidance, Product-specific
senders (V2) · widget key rotation · per-Product agents/teams or
permissions · business-hours schedules · webhooks, integrations, API keys ·
per-Product usage analytics · Product duplication/templates.

## Open points

- **Domains vs allowlist**: FR-PROD-01 lists "one or more domains" and a
  "domain allowlist" separately. This design merges them into one
  "Allowed domains" list. If they are distinct (e.g. marketing domains vs
  embed origins), split the Widget tab into two lists. Whether
  `example.com` also covers subdomains is undecided.
- **Archive effects on email**: after archiving, is inbound mail to the
  Product's forwarding address rejected, bounced or stored? And can agents
  still reply to existing Conversations? The archive dialog copy depends
  on both.
- **Delete precondition**: this design lets any Product be deleted with a
  typed confirmation. Requiring archive first is a safer alternative, but
  it isn't specified.
- **Support address field**: whether the customer's own support address is
  stored (for display, loop protection or future sending domains) is not
  specified.
- **Availability per Product**: if Live/Away becomes per-Product (see
  `app-shell.md`), it belongs in the Widget tab.
- **Self-hosted outbound**: the exact configuration surface (environment
  variables vs admin UI) depends on the email provider comparison
  (ADR-0004); this tab only displays the result.
