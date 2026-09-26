# Marketing site — design direction

Status: visual and structural direction for the public marketing site. This
is launch-readiness work outside the V1 boundary ([PRD](../PRD.md) "V1
boundary"; [open-questions.md](../open-questions.md) §1). Grounded in
[product-positioning.md](../product-positioning.md), [brand.md](brand.md),
[app-shell.md](app-shell.md), FR-HOST-01, FR-USE-01/02 and Initial.md §21–26,
§37–38, §44, §55, §57–58.

This doc sets layout, hierarchy and visual rules only. **Copy comes from a
separate copy pass** (Initial.md §44: Codex + Astra 6 High), then GLM-5.3
implements it. Headings below are short placeholders, not copy.

**Theme baseline:** the app's vauxey-theme kit as already adapted to
SupportSeal (`src/components`, `src/styles/tokens.css`, `src/app/globals.css`).
Colours only via `--vx-*` tokens. Never copy Vuexy/PixInvent landing-page
templates or assets.

## Conventions in this doc

- **`[copy: key]`** marks a copy slot. The key (`home.hero.title`) is the
  identifier the copy pass fills. Text in quotes next to a slot is a
  placeholder heading for layout only; it must not ship.
- **`{cfg: path}`** marks a value that renders from central configuration,
  never typed into a page. Brand values come from `siteConfig`
  (`src/config/site.ts`, fed by `src/lib/brand.ts`); pricing values come from
  the pricing config (see "Pricing configuration").
- **`{name}`** is shorthand for `{cfg: siteConfig.name}`. The product name
  never appears as a literal in marketing components, metadata, alt text or
  image files, so a rename is a config change (Initial.md §58). Screenshots
  show the name in the app sidebar; they are re-captured after a rename (see
  "Screenshots").
- **S-ids** (`S1`, `S2m`) refer to the shot list in "Screenshots".

## Principles

1. **Show the product within seconds.** The first viewport on desktop shows
   the real inbox; on mobile it starts within one scroll (Initial.md §26).
2. **Real UI only.** Every product image is a screenshot of the running
   app. No redrawn UI, no fake mock-ups, no composited states the app
   cannot show (Initial.md §57).
3. **Lead with the workflow**, in the positioning order: outcome → how →
   choice → economics ([product-positioning.md](../product-positioning.md)
   "Message hierarchy"). No giant feature matrix on the home page.
4. **Calm and premium.** Brand mint, cool neutrals, generous whitespace,
   strong type. No gradients, glassmorphism, blobs, glows, stock
   illustration, fake logos, testimonials, counters or star widgets
   (Initial.md §26, §37).
5. **More expressive than the app, same family.** Larger type, more space,
   one ink band per page. Same tokens, radius, shadows, icons and
   components as the dashboard, so moving from site to app feels continuous.
6. **Every claim traceable.** Each feature statement maps to shipped
   behaviour (an FR ID) so the copy pass cannot overclaim.

## Routing and gating

The marketing site lives in the existing Next.js app as a `(marketing)`
route group with its own layout (marketing header and footer; not the
authenticated shell).

| Path | Page |
| --- | --- |
| `/` | Home |
| `/features` | Features |
| `/pricing` | Pricing |
| `/open-source` | Self-host / open source |
| Docs | External link to `docs/self-hosting.md` on GitHub (no docs site yet) |
| Changelog | External link to GitHub Releases, shown only once a release exists |

- **Hosted deployment only (default).** A self-hosted installation serves one
  Workspace and must not advertise the managed service or its pricing. In
  self-hosted mode the marketing paths are not served, and `/` keeps its
  current behaviour (first-run → `/register`, otherwise `/inbox`,
  `src/app/page.tsx`). Open question M1.
- **Signed-in visitors** on hosted `/` still see the home page (keeps it
  statically rendered). "Sign in" goes to `/login`, which forwards an
  existing session to `/inbox`. The app logo already links to `/inbox`.
- **Primary CTA** → `/register` (hosted). **Self-host CTA** → `/open-source`
  on the site, GitHub from that page.
- All marketing pages are **statically rendered** and cacheable. They read no
  session, cookies or database. The gating decision runs in `proxy.ts`
  (runtime), not in page code, so one build serves both modes.
- `/features`, `/pricing` and `/open-source` must not be added to
  `PROTECTED_PREFIXES`.

## Global frame

### Header (sticky)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [mark] {name}   Features  Pricing  Open source  Docs↗  GitHub↗   [◐] Sign in [Start free] │
└──────────────────────────────────────────────────────────────────────┘
```

- Height `h-header` (same token as the app header). Solid `bg-body-bg`,
  `border-b border-border`. No blur, no transparency, no shadow change on
  scroll.
- Left: `Logo` (horizontal lockup, links `/`). Centre-left: nav links in
  `text-body`, hover `text-heading`, current page `text-heading` +
  `aria-current="page"` + a 2px `primary` underline.
- Right: theme toggle (icon button, same control as the app header), "Sign
  in" (`Button variant="text"`), `[copy: nav.cta.primary]` "Start free"
  (`Button variant="solid" color="primary" size="sm"`).
- External links (Docs, GitHub) carry a 14px `IconArrowUpRight` and
  visually hidden "(opens GitHub)" text. They open in the same tab.
- `< lg`: logo, primary CTA, menu button. The menu opens the existing
  `Sheet` (right side) with the links stacked, theme toggle and "Sign in".

### Footer

Four columns on `lg`, two on `sm`, one on mobile. Background `bg-surface`,
`border-t border-border`, text `text-muted` (4.5:1 per brand.md).

1. `Logo`, `[copy: footer.tagline]`, licence line "AGPLv3" linking to
   `LICENSE` on GitHub.
2. Product: Features, Pricing, Changelog (when it exists).
3. Open source: GitHub, Self-hosting guide, Licence.
4. Company: Contact `[copy: footer.contact]`, Privacy, Terms. **Privacy and
   Terms render only when the legal pages exist** (legal drafts are deferred;
   open question M3). No dead links.

Bottom row: `© {year} {name}` and the theme toggle again (consistent place
for users who scroll to the end).

### Page rhythm and grid

- Root font size stays 15px (app-wide). All sizes below are rem at that root,
  with px in brackets.
- Container: `max-w-[80rem]` (1200px), `px-5 sm:px-8`. Prose columns
  `max-w-[40rem]` (≈ 65 characters).
- Sections: `py-16 lg:py-24`. Adjacent sections alternate `bg-body-bg` and
  `bg-surface`, separated by `border-y border-border`. This band rhythm
  replaces decorative backgrounds.
- **Ink band** (at most one per page, used for the closing CTA or the open
  source band): background `--vx-brand-ink` (`#053B2A`), heading `#FFFFFF`
  (12.61:1), body `mint-100` `#D3F6E6`, accent `--vx-brand-mint` (7.13:1 on
  ink). In dark mode the band keeps ink but adds `border-y` in
  `--vx-border` so it separates from `#0E1614`. The primary button on the
  band uses the mint fill with ink text (dark-mode button styling), not the
  light-mode `#08765A` fill.
- Grid: 12 columns, `gap-8 lg:gap-12`. Feature rows split 5/7 (text/image),
  alternating sides from row to row on `lg`.

### Type scale (marketing only)

| Role | Size | Weight / tracking / line-height |
| --- | --- | --- |
| Display (h1) | `clamp(2.4rem, 1.6rem + 3.2vw, 3.73rem)` [36→56px] | 600 / -0.02em / 1.1 |
| Section (h2) | `clamp(1.87rem, 1.5rem + 1.4vw, 2.4rem)` [28→36px] | 600 / -0.015em / 1.2 |
| Row (h3) | 1.33rem [20px] | 600 / -0.01em / 1.35 |
| Lead | 1.2rem [18px] | 400 / 0 / 1.6, `text-body` |
| Body | 1.067rem [16px] | 400 / 0 / 1.65 |
| Caption, table | 0.933rem [14px] | 400–500, `text-muted` |
| Label (row kicker) | 0.867rem [13px] | 600 / 0.04em, `text-primary`, sentence case |

- Public Sans only (already loaded via `next/font`). Headings use
  `text-heading`; marketing overrides the app's global h-weight of 500 with
  600.
- Row kickers are allowed on feature rows only (they name the capability,
  e.g. "Developer context"). No kicker above the hero or section headings.
- Links in running text are underlined (`underline-offset-4`); nav and
  buttons are not.

### Icons and shapes

- Tabler icons, 20px, stroke 1.75, `text-primary` on `bg-primary-label`
  tiles only where they carry meaning (principles, steps). No icon for
  decoration next to every heading.
- The one decorative shape is the logo's rounded square (radius ≈ 28%).
  It is used for step numbers and principle tiles, so the site shares the
  app's shape language (`ProductMark`, `SealMark`).
- Motion: hover and focus transitions ≤ 150ms. No scroll-triggered
  animation, parallax, auto-advancing carousels or autoplay video.

## Screenshots

### Policy

- **Source:** the production build of the app, running the demo seed
  (Initial.md §53) in hosted mode. The seed is deferred work (open
  questions §1), so it is a hard dependency of the marketing build (M6).
- **Data:** fictional Products with distinct colours from the brand.md
  presets (e.g. blue `#2563EB`, pink `#DB2777`, amber `#CA8A04`), fictional
  people, and emails and URLs on reserved domains (`example.com`,
  `*.example`). No real companies, no lorem ipsum, no personal data.
- **Capture:** desktop viewport 1440×900 CSS px at DPR 2; mobile 390×844 at
  DPR 3 (exported at 2×). Sidebar expanded, no browser chrome, no cursor,
  no dev overlays. Every shot in both light and dark theme.
- **Allowed:** cropping, scaling, compression, and CSS framing (border,
  radius, shadow applied by the component, never baked into the file).
  HTML annotation markers over the image (see `ScreenshotFrame`).
- **Not allowed:** pixel edits, compositing several captures into one
  image, adding or removing UI, blurring (use fictional data instead), fake
  browser chrome, perspective tilts or device mock-ups.
- **Truthfulness:** a shot only shows shipped behaviour. When a PR changes
  UI shown in a shot, the PR lists the affected S-ids and they are
  re-captured before the next marketing deploy. A rename of `{name}`
  triggers a full re-capture.
- **Files:** `public/marketing/<S-id>-<light|dark>.png` as masters;
  delivered through `next/image` as AVIF/WebP with `srcset`. File names never
  contain the product name.
- **Capture procedure:** a Playwright run against the seeded instance, using
  this table as its spec. Whether that script is committed is open question
  M7; until decided, the procedure lives here and not in the repo.

### Shot list

| S-id | What it shows (real state) | Proves | Used on |
| --- | --- | --- | --- |
| S1 | Inbox, All Products scope: sidebar lists 3 Products; list shows Conversations from at least 2 Products with chat and email channel icons; one open Conversation with an agent reply and the context panel filled from `identify()`/`context()` | FR-INBOX-01, FR-PROD-02, FR-CTX-01 | Home hero, Features (inbox) |
| S1m | Mobile inbox list, All Products, same data | FR-INBOX-01 | Home hero (mobile) |
| S2 | Widget panel, Product A (blue), live chat with one exchange, on the test page; cropped to the widget | FR-CHAT-02/03 | Home demo, Features (widget) |
| S3 | Widget panel, Product B (pink), live chat; same crop | FR-PROD-02 | Home demo |
| S2m | Widget open on a 390px viewport | FR-CHAT-05 | Features (widget) |
| S4 | Sidebar and list pane with Product A selected as scope, filtered list | FR-INBOX-01 | Home rows, Features (Products) |
| S5 | Context panel crop: identified user, plan, version, page URL, admin link | FR-CTX-01 | Home rows, Features (context) |
| S6 | Conversation that started as chat and continued by email; email reply visible with the Product sender | FR-INBOX-03, FR-EMAIL-02 | Home rows, Features (email) |
| S7 | Widget in away mode: message form with email field | FR-CHAT-04 | Features (away) |
| S8 | Onboarding install step: script with copy button and "Open test page" | Onboarding (`onboarding.md`) | Home install, Features |
| S9 | Team settings with Admin and Agent roles | FR-ACC-01 | Features (team) |
| S10 | Hosted billing page: usage meter for the current period | FR-USE-01/02 | Pricing |
| S11 | Conversation with note, tag and saved-reply picker open | FR-INBOX-02 | Features (inbox) |

### Product identity in captions

Where a figure shows specific Products, its caption uses `ProductChip`
(mark + name) so the Product identity is in HTML text too, not only inside
the image.

## Home (`/`)

Order follows the message hierarchy. Each section is one idea.

### 1. Hero (outcome)

```
┌───────────────────────────────────────────────────────────────┐
│ H1 [copy: home.hero.title]  "One desk for all products"        │
│ Lead [copy: home.hero.lead]                                    │
│ [Start free]  [Self-host it →]                                 │
│ Small print [copy: home.hero.note]  (e.g. hosting choice)      │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │                     S1 (inbox, full width)                │ │
│ └───────────────────────────────────────────────────────────┘ │
│ Caption: ProductChip A · ProductChip B · ProductChip C         │
└───────────────────────────────────────────────────────────────┘
```

- Text left-aligned in a `max-w-[40rem]` column (not centred: centred hero +
  gradient is the template look to avoid). Buttons `size="lg"`: solid
  primary, then `outline` secondary.
- S1 sits directly below, full container width, in `ScreenshotFrame`. At
  1440×900 at least the top 40% of S1 is visible without scrolling; keep
  the hero text block ≤ 22rem tall to guarantee it.
- Mobile: S1m replaces S1 (`<picture>` art direction; the desktop inbox is
  unreadable at 390px). Its top edge is visible within the first viewport
  or after one short scroll.
- S1 is the LCP element: eager, `fetchPriority="high"`, light variant only
  (see "Dark mode").

### 2. Two Products, one inbox (the primary demonstration)

Per positioning: two visually distinct Products send messages into one
inbox.

```
 H2 [copy: home.demo.title]  "Two products, one inbox"
 ┌─────────┐ ┌─────────┐   ┌────────────────────────────┐
 │ S2 (A)  │ │ S3 (B)  │   │ S1 crop: list pane with    │
 │ widget  │ │ widget  │   │ A and B rows adjacent      │
 └─────────┘ └─────────┘   └────────────────────────────┘
 ProductChip A  ProductChip B   [copy: home.demo.caption]
```

- `lg`: the two widget crops side by side on the left (5 columns), the
  list-pane crop of S1 on the right (7 columns). No connecting arrows or
  lines; the Product colours carry the link.
- `< lg`: widgets side by side at half width, list crop below.
- One line of copy `[copy: home.demo.body]` under the H2.

### 3. How it works (three feature rows)

Alternating 5/7 rows, each with kicker, h3, 2–3 sentences, an optional
"Learn more" link to the matching `/features` anchor, and one screenshot.

| Row | Kicker (placeholder) | Slot | Image |
| --- | --- | --- | --- |
| a | "Chat and email" | `[copy: home.row.channels]` | S6 |
| b | "Developer context" | `[copy: home.row.context]` | S5 beside a `CodeBlock` with the real `identify()`/`context()` call as documented in `chat-widget.md` |
| c | "Switch Products" | `[copy: home.row.switch]` | S4 |

The code sample must match the shipped widget API exactly; the copy pass
does not edit code.

### 4. Install

```
 H2 [copy: home.install.title]  "Add it to a product"
 ① [copy: home.install.step1]   ② [copy: home.install.step2]   ③ [copy: home.install.step3]
 ┌─ CodeBlock: <script async src="{cfg: siteConfig.url}/widget.js" data-key="pk_…"> ─┐
 S8 (onboarding install step)
```

- Three steps in a row on `lg` (stacked on mobile), each with a rounded-
  square number tile (`bg-primary-label text-primary`).
- The snippet renders the embed tag with the host from `siteConfig.url` and
  a visibly fake key (`pk_…`), with `CopyButton`.
- No duration claims ("five minutes") unless the flow has been timed
  (Initial.md §57).

### 5. Hosting choice (choice)

Two `Card`s side by side: Hosted and Self-hosted. Each: h3, one-line slot,
4–5 facts as a checklist (icon + text), one CTA (Start free /
Self-host guide). Below both: one line `[copy: home.hosting.same]` stating
that core support features are the same in both (FR-HOST-01). Facts come
from the shared `HostingComparison` data (also used on `/pricing` and
`/open-source`) so they cannot drift.

### 6. Pricing summary (economics)

Four principle tiles in a row (2×2 on `sm`, stacked on mobile), each with
icon tile + short label + one line:

1. Per Conversation, counted once ever `[copy: pricing.principle.conversation]`
2. Unlimited Products `[copy: pricing.principle.products]`
3. No per-seat pricing `[copy: pricing.principle.seats]`
4. Free to self-host `[copy: pricing.principle.selfhost]`

Then a text link to `/pricing`. No plan prices on the home page, which
keeps one place to update and avoids stale numbers.

### 7. Open source band (ink band)

H2 `[copy: home.oss.title]`, one line on AGPLv3 and self-hosting, buttons
"View on GitHub" (mint on ink) and "Self-hosting guide" (outline, white).
No star or download counts.

### 8. FAQ

`FaqList` with 5–8 items `[copy: home.faq.*]`, native `<details>`. The copy
pass picks questions; suggested topics: what counts as a Conversation,
self-host vs hosted differences, what the widget collects, email setup,
data export/deletion, licence.

### 9. Closing CTA

Plain band (`bg-surface`): H2 `[copy: home.cta.title]`, primary and
secondary buttons as in the hero. If the ink band is used for open source
(section 7), this band is not ink.

## Features (`/features`)

The detailed layer: one section per capability, deeper than the home page,
still screenshot-led.

### Layout

```
┌───────────────┬──────────────────────────────────────────────┐
│ On this page  │ H1 [copy: features.title]  "Features"        │
│ (sticky, lg)  │ Lead [copy: features.lead]                   │
│  Inbox        │──────────────────────────────────────────────│
│  Products     │ Section: h2, lead, screenshot, fact list     │
│  Widget       │ Section …                                    │
│  Away & email │                                              │
│  Email        │                                              │
│  Context      │                                              │
│  Team         │                                              │
│  Attachments  │                                              │
│  Self-hosting │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

- `lg`: a 14rem sticky "On this page" nav (`<nav aria-label="On this
  page">`), current section highlighted with a primary left border and
  `aria-current="true"`. `< lg`: a horizontal scrollable chip row under the
  H1 (not sticky, to keep the viewport free).
- Each section: `id` anchor, h2 placeholder, one-line lead slot, one
  screenshot (full content width), then a fact list of 3–6 bullets. Each
  bullet has a copy slot and is tagged with its FR ID in a code comment for
  the implementer (not visible), so reviewers can check claims.

| Anchor | h2 placeholder | Screenshot | FRs |
| --- | --- | --- | --- |
| `#inbox` | "Unified inbox" | S1, S11 | FR-INBOX-01/02 |
| `#products` | "Products" | S4 | FR-PROD-01/02 |
| `#widget` | "Chat widget" | S2 + S2m side by side | FR-CHAT-01/02/03/05 |
| `#away` | "Away mode" | S7 | FR-CHAT-04 |
| `#email` | "Support email" | S6 | FR-EMAIL-01/02/03 |
| `#context` | "Developer context" | S5 + `CodeBlock` | FR-CTX-01/02 |
| `#team` | "Team and roles" | S9 | FR-ACC-01 |
| `#attachments` | "Attachments" | crop of a Conversation with a file | FR-FILE-01 |
| `#self-hosting` | "Self-hosting" | none; `CodeBlock` with `docker compose up -d` and a link to `/open-source` | FR-HOST-01 |

- **Not yet** section (recommended, final): a short plain list of things
  it deliberately does not do yet `[copy: features.notyet]`, taken from the
  PRD "Later and outside scope" (AI agents, knowledge base, SSO, social and
  phone channels). Honest scope fits the brand and pre-empts support
  questions. Pete can drop it (M8).
- Closing CTA band as on home.

## Pricing (`/pricing`)

No prices are decided (issue
[#6](https://github.com/pietervw/supportseal/issues/6)). The page shows the
**model**; every number renders from config and is visibly marked until set.

### Pricing configuration

- One pricing module (proposed `src/config/pricing.ts`) is the only source
  of plan names, prices, allowances, grace days, agent limits and currency.
  It takes allowance and grace values from `PLANS` in `src/lib/usage.ts`
  (or `usage.ts` moves its values there), so **the marketing page and the
  usage meter read the same numbers**. No dollar amounts in page
  components (Initial.md §24).
- Currency: USD (Initial.md §23), formatted with `Intl.NumberFormat`.
- **Unset values** need their own explicit marker in config, distinct from
  `null` (which `usage.ts` already uses for "unlimited"). They render as a
  `Badge` (`secondary`, `light`) reading "TBD", with `data-config-key` set
  to the config path so a reviewer can find it. A hosted production build must fail if any value shown on
  the pricing page is unset, so "TBD" can never reach customers.
- In this doc: `{cfg: pricing.plans.free.priceUsd}` etc.

### Layout

```
 H1 [copy: pricing.title]  "Pricing"
 Lead [copy: pricing.lead]

 ── Principles (4 tiles, as on home) ──────────────────────────

 ┌── Free (hosted) ──┐ ┌── Pro (hosted) ───┐ ┌── Self-hosted ────┐
 │ {cfg: price}      │ │ {cfg: price}/mo   │ │ Free              │
 │ {cfg: convs}/mo   │ │ {cfg: convs}/mo   │ │ No usage metering │
 │ {cfg: agents}     │ │ {cfg: agents}     │ │ Unlimited agents  │
 │ Unlimited Products│ │ Unlimited Products│ │ Unlimited Products│
 │ [copy: cta]       │ │ [copy: cta]       │ │ [Self-host guide] │
 └───────────────────┘ └───────────────────┘ └───────────────────┘

 ── What counts as a Conversation (Timeline explainer) ─────────
 ── If you go over (grace period) ──────────────────────────────
 ── Comparison table ───────────────────────────────────────────
 ── Pricing FAQ ────────────────────────────────────────────────
 ── Closing CTA ────────────────────────────────────────────────
```

**Plan cards** (`PlanCard`, built on `Card`): three columns on `lg`, stacked
on mobile with the self-hosted card last.

- Card anatomy: plan name (h3), price line (`{cfg: pricing.plans.<id>.priceUsd}`
  with "/month" slot, or "Free"), allowance line
  (`{cfg: pricing.plans.<id>.monthlyConversations}` Conversations / month),
  3–5 facts, CTA.
- No "Most popular" ribbon, no strike-through prices, no annual toggle
  unless annual pricing exists in config.
- "Unlimited" appears only for values that are truly unlimited in config and
  enforcement (Initial.md §57). A `null` limit in config renders
  "Unlimited"; an unset value renders "TBD". Hosted agent and Conversation
  limits are unresolved (M2). The self-hosted column states what
  `docs/self-hosting.md` documents: unlimited Products and agents, one
  Workspace.
- The self-hosted card states what self-hosting costs you (your own
  server, Postgres, email provider) in one line `[copy: pricing.selfhost.costs]`.

**What counts as a Conversation** (the key explainer). Uses the existing
`Timeline` component to show one Conversation over time, as HTML, not an
image:

1. Visitor starts a chat on Product A → **counted** (this period)
2. Agent replies; visitor leaves; reply continues by email → not counted
3. Closed
4. Customer replies next month → reopens the same Conversation, not counted

Beside it, three short rules `[copy: pricing.counting.*]`: messages are
never counted; one Conversation counts once ever, in the period it opened;
reopening never re-counts (FR-USE-01). The counted step uses a `success`
`Badge` with the text "Counted"; the others use `secondary` "Not counted",
so meaning never depends on colour.

**If you go over.** Two to three facts with S10 beside them: new customer
messages keep arriving during a `{cfg: pricing.graceDays}`-day grace
period, admins see usage and upgrade options, no automatic upgrades and no
lost messages (FR-USE-02). No invented overage fees.

**Comparison table** (`ComparisonTable`, real `<table>`): columns Hosted
Free / Hosted Pro / Self-hosted; rows: Conversations per month, Products,
Agents, Live chat, Support email, Developer context, Attachments, Billing,
Updates, Where data lives, Support. Values come from config and the shared
`HostingComparison` data. Included/not included cells use an icon plus
visually hidden text ("Included", "Not included"). On mobile the table
scrolls horizontally inside a focusable, labelled region with the first
column sticky.

**Pricing FAQ** `[copy: pricing.faq.*]`: e.g. what if I exceed, can I
switch plans, is self-hosting really free, which currency, test
Conversations (they count normally, per D8 in open-questions).

## Self-host / open source (`/open-source`)

Audience: developers deciding whether to run it themselves. Tone is
practical; the page reads like a good README.

```
 H1 [copy: oss.title]  "Run it yourself"
 Lead [copy: oss.lead]
 [View on GitHub]  [Self-hosting guide]

 ── Quick start ─────────────────────────────────────────────────
 CodeBlock:  git clone …  ·  cp .env.example .env  ·  docker compose up -d
 Requirements list (from docs/self-hosting.md)

 ── Same product, your server ──────────────────────────────────
 HostingComparison (shared data), focused on differences

 ── What you run ───────────────────────────────────────────────
 Components row: App · Postgres · Migrate job · Your SMTP provider · Inbound email forwarding

 ── Licence ────────────────────────────────────────────────────
 AGPLv3, plain-language summary slot, link to LICENSE

 ── Contribute ─────────────────────────────────────────────────
 Links: issues, repository, docs

 ── Closing ink band: "Prefer we host it?" → /pricing ──────────
```

- **Quick start:** the four commands from `docs/self-hosting.md` "Quick
  start", copied verbatim by the implementer (the copy pass never
  paraphrases commands). Each block has `CopyButton`. The repository URL
  comes from config (`{cfg: siteConfig.repositoryUrl}`, a new field; today
  `https://github.com/pietervw/supportseal`), and so do the GitHub links in
  the header and footer.
- **Facts to state** (all from FR-HOST-01 and docs): same core support
  features; one Workspace per installation (additional Workspaces blocked);
  no Stripe, hosted API or external telemetry required; backup and upgrade
  steps documented.
- **"What you run"**: a row of plain labelled boxes (HTML, `border
  border-border rounded-lg`), not an architecture diagram with arrows. It's
  a list, drawn as a list.
- **Licence:** `[copy: oss.licence]` summary with a clear "read the full
  licence" link. The copy pass must avoid legal advice phrasing.
- No stars, forks, contributor counts or "trusted by" rows.

## Docs and changelog

- **Docs:** no docs site in this pass. Header "Docs" links to
  `docs/self-hosting.md` on GitHub. When a docs site exists it replaces the
  link; the header layout already reserves the slot.
- **Changelog:** no changelog page. Link to GitHub Releases in the footer
  once the first release is tagged (no tags exist today); hide it until
  then (M4).

## Components

### Reused from the app

| Need | Component | Notes |
| --- | --- | --- |
| Buttons, CTAs | `components/ui/button.tsx` | `solid`/`outline`/`text`, `size="lg"` for hero CTAs; contrast tokens already handle dark mode |
| Logo | `components/layout/logo.tsx` (`Logo`, `SealMark`) | Name from `siteConfig` |
| Plan and hosting cards | `components/ui/card.tsx` | Only for plans and the hosting pair; no card grids elsewhere ("endless cards", Initial.md §37) |
| Labels | `components/ui/badge.tsx` | "Counted", "TBD", "Included" |
| Product captions | `components/product-identity.tsx` (`ProductChip`, `ProductMark`) | Captions under screenshots |
| Mobile nav | `components/ui/sheet.tsx` | Focus trap, Esc, scroll lock |
| Copy snippets | `components/copy-button.tsx` | Code blocks |
| Counting explainer | `components/ui/timeline.tsx` | Pricing |
| Dividers | `components/ui/separator.tsx` | Footer, plan cards |
| Keyboard hints | `components/ui/kbd.tsx` | If a shortcut is mentioned |
| Theme toggle | from `components/layout/header.tsx` | Extract into a shared `ThemeToggle` so both headers use one control |
| Theme | `components/providers/theme-provider.tsx` | Unchanged |
| Tabs (optional) | `components/ui/tabs.tsx` | Only if Features needs to switch between two captures of one area; not used on home |

### New (marketing-only, same conventions: `cva`, `cn`, tokens)

`MarketingHeader`, `MarketingFooter`, `Section` (container, rhythm, `band`
variants: default / surface / ink), `SectionHeading` (h2 + lead),
`FeatureRow` (kicker, h3, body, link, media, `reverse`), `ScreenshotFrame`,
`CodeBlock`, `PrincipleTiles`, `PlanCard`, `ComparisonTable`,
`HostingComparison` (shared data + rendering), `ConfigValue`, `FaqList`,
`CtaBand`.

**`ScreenshotFrame`** contract:

- Renders `<figure>` with light and dark `next/image` sources, required
  `alt` (a copy slot, `[copy: shot.<S-id>.alt]`), optional `<figcaption>`.
- Frame: `rounded-lg border border-border shadow-card bg-surface`,
  `overflow-hidden`. No faux window bar.
- Optional markers: up to 3 numbered markers (24px rounded-square tiles,
  `bg-brand-ink text-brand-mint`, 1px white ring) positioned by percentage,
  each matching an item in an ordered list beneath the figure. Markers are
  `aria-hidden`; the list carries the meaning.
- Below `md`, a "View full size" link opens the master image, for zoom
  users (WCAG 1.4.10).
- Reserved aspect ratio from the image's intrinsic size (no CLS).

**`CodeBlock`**: `<pre><code>` on `bg-surface-2`, `border border-border`,
`rounded-lg`, 14px monospace (`ui-monospace` stack; no web font),
horizontal scroll inside a focusable region, `CopyButton` top-right.
Monochrome text in `text-heading`, with only strings and comments tinted
(`text-primary`, `text-muted`). No client-side syntax highlighter.

## Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| `< sm` (< 640px) | Single column. Hero uses S1m. Buttons full width, stacked. Principle tiles stacked. Tables scroll horizontally, first column sticky. Section padding `py-12` |
| `sm`–`md` | Two-column principle tiles and footer. Widget crops side by side |
| `md`–`lg` | Feature rows still stacked (text above image) so screenshots stay large enough to read |
| `≥ lg` (1024px) | Desktop header nav, 5/7 feature rows alternating, 3-column plans, sticky Features sub-nav |
| `≥ xl` (1280px) | Container caps at 1200px; no further scaling |

- Screenshots never scale below 60% of capture width on desktop layouts; if
  they would, the layout stacks instead.
- Mobile uses dedicated mobile captures (S1m, S2m) rather than shrinking
  desktop ones to illegibility.
- Test widths: 320, 390, 768, 1024, 1440. At 320px, nothing scrolls
  horizontally except tables and code blocks, which are self-contained.

## Dark mode

- Same `ThemeProvider` as the app (`defaultTheme="light"`, `enableSystem`,
  class-based). The site follows the user's choice everywhere.
- All colours through tokens; the brand.md contrast table applies unchanged.
  The ink band uses fixed brand values (`--vx-brand-ink`, `--vx-brand-mint`)
  in both themes, with the dark-mode border described above.
- **Screenshots swap with the theme.** Each `ScreenshotFrame` renders both
  variants: the light image and the dark image with `dark:hidden` /
  `hidden dark:block`. Non-hero images are `loading="lazy"`, so browsers
  only download the visible variant. The hero eager-loads the light variant
  only (the default theme); the dark hero image is lazy and loads when
  `.dark` reveals it.
- Frame shadow switches automatically (`--vx-shadow-card` is darker in dark
  mode); the border keeps screenshots separated from the page in both.
- Verify every page in both themes at 390 and 1440 before merge.

## Accessibility (WCAG 2.2 AA)

The app's V1 target is "no knowingly inaccessible primitives"; the
marketing site targets **full WCAG 2.2 AA** from its first release.

- **Structure:** one `<h1>` per page, no skipped levels; `<header>`,
  `<nav aria-label="Main">`, `<main id="main">`, `<footer>`; "Skip to
  content" as the first focusable element; `lang="en"`.
- **Contrast (1.4.3, 1.4.11):** only brand.md-verified pairs. Mint-400–600
  never as text or thin icons on light surfaces. Body text is `text-body`,
  captions `text-muted` (≥ 4.5:1). Control and focus outlines ≥ 3:1.
- **Not colour alone (1.4.1):** links in text are underlined; plan and
  table states use text or icon + text; Product identity in captions is
  also a name.
- **Images (1.1.1):** every screenshot has alt text describing what it
  shows (copy slots). Key claims live in HTML text, never only inside a
  screenshot. Decorative icons are `aria-hidden`.
- **Keyboard (2.1.1, 2.4.3, 2.4.7):** everything reachable in visual order;
  the global `*:focus-visible` outline stays. Mobile nav `Sheet` traps
  focus and returns it to the menu button.
- **Focus not obscured (2.4.11):** `scroll-padding-top` equals the sticky
  header height, so anchors and focused elements are never hidden under
  the header.
- **Target size (2.5.8):** interactive targets ≥ 24×24 CSS px; nav links,
  FAQ summaries and icon buttons ≥ 44px tall on touch layouts.
- **Consistent navigation and help (3.2.3, 3.2.6):** header and footer are
  identical on every page; the contact link is always in the same footer
  place.
- **Reflow and zoom (1.4.4, 1.4.10, 1.4.12):** works at 320px and 200%
  zoom with no loss of content; respects user text spacing (no fixed-height
  text containers). Screenshots offer "View full size".
- **Motion (2.2.2, 2.3.3):** nothing moves on its own. If a screen
  recording is ever added it has visible pause/play controls, no autoplay
  with `prefers-reduced-motion: reduce`, and a text alternative.
- **Components:** FAQ uses native `<details>/<summary>`; tables use
  `<th scope>` and a `<caption>`; the scrollable table and code regions are
  focusable with an accessible name; external links announce their
  destination.
- **Verification:** axe (or Lighthouse accessibility = 100) on every page in
  both themes, a keyboard-only pass, and a screen-reader spot check (VoiceOver
  or NVDA) of home and pricing before launch.

## Performance budgets

Measured on the production build, Lighthouse mobile preset (throttled 4G,
mid-range CPU), per page, both themes.

| Metric | Budget |
| --- | --- |
| LCP (lab, mobile) | ≤ 2.0 s (field p75 ≤ 2.5 s) |
| CLS | ≤ 0.05 |
| INP (field p75) / TBT (lab) | ≤ 200 ms / ≤ 150 ms |
| Lighthouse performance | ≥ 95 |
| Page-specific JS (beyond the shared framework chunk) | ≤ 25 KB gzip |
| Total first-load JS | ≤ 130 KB gzip |
| Hero image (delivered, mobile) | ≤ 120 KB; desktop ≤ 180 KB |
| Above-the-fold image bytes | ≤ 200 KB |
| Total page weight, home (initial load, lazy images excluded) | ≤ 500 KB |
| Web fonts | Public Sans via `next/font` only (self-hosted, `latin` subset); no other font files |
| Third-party requests | None at launch |

Rules that keep these budgets:

- Pages are Server Components and statically rendered. Client islands only:
  theme toggle, mobile nav `Sheet`, `CopyButton`, Features sub-nav
  highlighting. No animation libraries, no chart library, no syntax
  highlighter, no icon font.
- The marketing layout must not import the authenticated shell, Prisma,
  auth or the dashboard's client providers beyond `ThemeProvider`.
- Images: AVIF/WebP via `next/image`, correct `sizes`, intrinsic
  dimensions, lazy below the fold.
- Future Umami analytics (separate work, hosted only, `defer`) and an
  optional dogfood widget (M5, loaded on idle, loader ≤ 5 KB gzip per D10)
  must fit inside these budgets when added.
- The PR that builds the site reports the measured numbers for each page.
- Note (report only, not part of this work): the root layout loads five
  Public Sans weights (300–700); the site needs 400/500/600/700.

## SEO and metadata

- Titles use the existing template (`%s | {name}`); descriptions are copy
  slots `[copy: meta.<page>.description]`. Open Graph image per page: a
  static crop of S1 with the logo, generated from the screenshot master,
  name from config.
- `sitemap.xml` and `robots.txt` list marketing pages in hosted mode only.
- Canonical URLs from `siteConfig.url`.

## Not in this pass

Blog · docs site · changelog page · customer stories, logos or
testimonials · comparison or "alternative to" pages (Initial.md §25) ·
interactive product demo or sandbox · video · i18n · Umami integration ·
legal page content · newsletter signup · cookie banner (not needed without
third-party scripts).

## Decisions and defaults

- **Marketing is served in hosted mode only**; self-hosted `/` behaviour is
  unchanged. *Default* (M1).
- **Signed-in visitors see the home page** at `/`; no redirect. *Default*.
- **No prices on home**; pricing numbers exist in one config and one page.
- **"TBD" can render in development and preview only**; hosted production
  builds fail on unset pricing values.
- **Docs and changelog are external links** until those surfaces exist.
- **Full WCAG 2.2 AA** for the marketing site from its first release.

## Open questions

Tracked in [open-questions.md](../open-questions.md), "Marketing site".

- **M1** Serve the marketing site only in hosted mode (default), or behind
  its own `MARKETING_SITE` flag so it can run on any deployment?
- **M2** Pricing shape vs current config: `src/lib/usage.ts` gives Pro
  unlimited Conversations (`monthlyConversations: null`) and neither plan an
  agent limit. That doesn't match "priced by Conversation volume" for paid
  tiers, and Initial.md §21 suggests one agent on Free. Needs Pete's tier
  shape and numbers (issue #6) before the pricing page can ship.
- **M3** Privacy and Terms pages must exist before hosted sign-up is
  promoted publicly; they're deferred with the legal drafts. Launch order?
- **M4** Changelog via GitHub Releases (default), or a page on the site?
- **M5** Put the real {name} widget on the marketing site for our own
  support (dogfooding, and a live demo of the product)? Needs a hosted
  Workspace for {name} itself.
- **M6** The demo seed (Initial.md §53) is out of V1 but required for every
  screenshot. Schedule it before the marketing build.
- **M7** Commit the Playwright screenshot-capture script to the repo (it is
  reproducible product tooling), or keep it out per the "no tooling
  artifacts" rule?
- **M8** Keep the honest "Not yet" section on `/features`?
