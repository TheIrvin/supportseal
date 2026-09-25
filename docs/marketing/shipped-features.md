# Shipped features and claim evidence

Source snapshot: `copy/marketing` at `30f4cb5`, inspected 2026-09-25. This is
the claim ledger for [{siteConfig.name} public-site copy](copy.md). “Shipped”
here means implemented in this branch, not independently verified in a live
hosted service. Test references describe assertions present in the repository;
the checks actually run for this copy change are recorded below.

Scope follows the [PRD V1 boundary](../PRD.md#v1-boundary), with behaviour from
the [FRD](../FRD.md), messaging from [product positioning](../product-positioning.md)
and [Initial.md §§21–26](../../Initial.md). Implementation takes precedence over
an unimplemented requirement when deciding what this copy may claim. The public
site, analytics, legal drafts and demo environment are separate launch work.

## SF-01 — Multiple Products in one Workspace

- **Claim:** Add multiple Products to one Workspace. Each has its own name,
  primary colour, widget key and allowed domains. Product identity appears in
  the inbox. Products can be edited and archived while retaining history.
- **Implementation:** [products.ts](../../src/lib/products.ts),
  [Product settings](../../src/app/(app)/(page)/settings/products/[id]/page.tsx),
  [inbox list](../../src/app/(app)/(fill)/inbox/list-pane.tsx).
- **Tests:** [products.test.ts](../../src/lib/__tests__/products.test.ts): creation,
  validation, domain management, Admin restrictions and archival;
  [conversations.test.ts](../../src/lib/__tests__/conversations.test.ts): Products
  combined in one Workspace. Requirements: FR-PROD-01/02.
- **Boundary:** Name and colour are implemented; custom widget CSS, custom
  logos and full white labelling are not claims for this release.

## SF-02 — Combined, searchable inbox

- **Claim:** Read and reply to chat and email Conversations in one inbox;
  filter by Product or status and return to all Products. Search by message
  text, subject, customer name or email.
- **Implementation:** [conversations.ts](../../src/lib/conversations.ts),
  [inbox list](../../src/app/(app)/(fill)/inbox/list-pane.tsx),
  [Conversation view](../../src/app/(app)/(fill)/inbox/[id]/conversation-view.tsx).
- **Tests:** [conversations.test.ts](../../src/lib/__tests__/conversations.test.ts):
  listing, Product filtering, search and cross-Workspace rejection.
  Requirements: FR-INBOX-01/02.
- **Boundary:** No assignment, priority, SLA or workload-routing claims.

## SF-03 — Domain-controlled live chat

- **Claim:** Embed a Product's chat widget using its snippet. Customers can
  start live chat without an account or email, receive replies and resume the
  thread in the same browser. Configure the domains allowed to use the widget.
- **Implementation:** [widget.ts](../../src/lib/widget.ts),
  [loader](../../src/app/api/widget/js/route.ts),
  [panel](../../src/app/api/widget/panel/route.ts),
  [stream](../../src/app/api/widget/stream/route.ts).
- **Tests:** [widget.test.ts](../../src/lib/__tests__/widget.test.ts): origins,
  public keys, sessions, messages and resumption;
  [widget-stream.test.ts](../../src/lib/__tests__/widget-stream.test.ts): scoped
  streaming of persisted messages. Requirements: FR-CHAT-01/02/03.
- **Boundary:** Resumption relies on the visitor session. No delivery-time,
  uptime, cross-device continuity or comprehensive accessibility guarantees.

## SF-04 — Away messages and email continuation

- **Claim:** An Admin can set the Workspace to Away. The new-message form asks
  for a reply email. Live-chat visitors can also leave an email; when they are
  no longer connected, agent replies can go by email in the same Conversation.
- **Implementation:** [availability action](../../src/app/(app)/actions.ts),
  [widget panel](../../src/app/api/widget/panel/route.ts),
  [reply routing](../../src/lib/email/routing.ts).
- **Tests:** [widget.test.ts](../../src/lib/__tests__/widget.test.ts): email capture
  and Workspace-wide availability;
  [email-outbound.test.ts](../../src/lib/__tests__/email-outbound.test.ts):
  connected chat versus disconnected visitors with known addresses.
  Requirements: FR-CHAT-04, FR-EMAIL-02.
- **Boundary:** Availability is Workspace-wide, not per Product or scheduled.
  Email requires a known address and configured delivery (SF-05).

## SF-05 — Product support email

- **Claim:** Forward a Product's support address to its generated inbound
  address. Incoming email creates or continues a Conversation; agents answer
  from the inbox. The sender display name identifies the Product. Recorded
  outbound failures are shown in the Conversation.
- **Implementation:** [inbound processing](../../src/lib/email/inbound.ts),
  [inbound endpoint](../../src/app/api/email/inbound/route.ts),
  [outbound delivery](../../src/lib/email/outbound.ts),
  [reply routing](../../src/lib/email/routing.ts),
  [Conversation view](../../src/app/(app)/(fill)/inbox/[id]/conversation-view.tsx).
- **Tests:** [email-inbound.test.ts](../../src/lib/__tests__/email-inbound.test.ts):
  new mail, deduplication, header/token threading rather than subject alone,
  attachments and archived-Product rejection;
  [email-outbound.test.ts](../../src/lib/__tests__/email-outbound.test.ts):
  sending, threading headers, routing and recorded failures.
  Requirements: FR-EMAIL-01/02/03.
- **Boundary:** Requires an inbound provider/forwarder integration and SMTP.
  Without SMTP the implementation records replies but does not deliver them.
  A Product-labelled managed sender is not a verified custom sending domain.

## SF-06 — User and application context

- **Claim:** Use `identify()` and `context()` to send identity and structured
  app details such as account, plan, app version or an admin link. Supplied
  context appears beside the Conversation. The widget also records the page
  origin and path, excluding the query string and fragment.
- **Implementation:** [browser API](../../src/app/api/widget/js/route.ts),
  [context endpoint](../../src/app/api/widget/context/route.ts),
  [validation](../../src/lib/dev-context.ts),
  [context display](../../src/app/(app)/(fill)/inbox/[id]/context-section.tsx).
- **Tests:** [dev-context.test.ts](../../src/lib/__tests__/dev-context.test.ts):
  identity validation, bounded context, display ordering and link validation;
  [widget.test.ts](../../src/lib/__tests__/widget.test.ts): page context storage.
  Requirements: FR-CTX-01/02; resolved page-capture decision D9/D9a.
- **Boundary:** App details require developer integration. No automatic logs,
  network capture, session replay or diagnostics. Do not claim that all context
  is manually supplied: page origin/path capture is automatic.

## SF-07 — Status, internal notes, tags and saved replies

- **Claim:** Use Open, Pending and Closed states; add internal notes hidden
  from visitors, apply tags and insert saved replies. Admins manage the shared
  saved replies; agents can insert and edit the text before sending.
- **Implementation:** [conversations.ts](../../src/lib/conversations.ts),
  [saved-replies.ts](../../src/lib/saved-replies.ts),
  [saved-reply management](../../src/app/(app)/(page)/saved-replies/page.tsx),
  [composer](../../src/app/(app)/(fill)/inbox/[id]/conversation-view.tsx).
- **Tests:** [conversations.test.ts](../../src/lib/__tests__/conversations.test.ts):
  lifecycle and tags; [widget.test.ts](../../src/lib/__tests__/widget.test.ts):
  agent replies visible and internal notes excluded. Saved-reply management
  and insertion are source-inspected; no dedicated saved-reply test found.
  Requirement: FR-INBOX-02.

## SF-08 — Attachments in chat and email

- **Claim:** Customers and agents can share supported files with messages.
  Files appear with the Conversation and retrieval checks the Workspace user
  or visitor session. Uploads have type and size limits.
- **Implementation:** [attachments.ts](../../src/lib/attachments.ts),
  [download endpoint](../../src/app/api/attachments/[id]/route.ts),
  [widget uploads](../../src/app/api/widget/attachments/route.ts),
  [reply routing](../../src/lib/email/routing.ts).
- **Tests:** [attachments.test.ts](../../src/lib/__tests__/attachments.test.ts):
  content validation, storage, linking and access;
  [email-inbound.test.ts](../../src/lib/__tests__/email-inbound.test.ts): incoming
  attachments. Requirement: FR-FILE-01.
- **Boundary:** No unlimited storage, arbitrary file types, malware scanning
  or complete deletion/retention guarantee.

## SF-09 — Accounts and team access

- **Claim:** Register, sign in and invite teammates to a Workspace. Admins
  manage Products and invitations; Agents work in the inbox.
- **Implementation:** [auth.ts](../../src/lib/auth.ts),
  [workspace.ts](../../src/lib/workspace.ts),
  [team settings](../../src/app/(app)/(page)/settings/team/page.tsx).
- **Tests:** [auth.test.ts](../../src/lib/__tests__/auth.test.ts): registration,
  login and sessions; [workspace.test.ts](../../src/lib/__tests__/workspace.test.ts):
  Admin creation, invitations and role restrictions;
  [cross-tenant.test.ts](../../src/lib/__tests__/cross-tenant.test.ts): scoped
  service, attachment and visitor access. Requirement: FR-ACC-01.
- **Boundary:** No enterprise SSO, granular custom roles or security certification.

## SF-10 — Guided first message

- **Claim:** Onboarding walks through Workspace, Product, allowed domain and
  widget installation. A test page and checklist help you send a first message,
  answer it, configure email, add another Product and invite a teammate.
- **Implementation:** [onboarding.ts](../../src/lib/onboarding.ts),
  [onboarding pages](../../src/app/onboarding/),
  [widget test page](../../src/app/widget-preview/page.tsx).
- **Tests:** [onboarding.test.ts](../../src/lib/__tests__/onboarding.test.ts):
  wizard state, checklist derivation and signed test tokens.
- **Boundary:** Test-page tokens require a configured signing secret. Test
  Conversations count toward usage. No promised setup time or public demo.

## SF-11 — Conversations counted once ever

- **Claim:** Hosted usage counts each Conversation once, in the UTC calendar
  month it first opens. Messages, replies, reopening and chat-to-email
  continuation of that same Conversation do not add another count, even in a
  later month. A separate new Conversation counts separately.
- **Implementation:** [usage.ts](../../src/lib/usage.ts) counts Conversation
  creation dates; [widget.ts](../../src/lib/widget.ts),
  [conversations.ts](../../src/lib/conversations.ts) and
  [email processing](../../src/lib/email/inbound.ts) continue existing threads.
- **Tests:** [usage.test.ts](../../src/lib/__tests__/usage.test.ts): opening-month
  accounting, messages and previous-month exclusion;
  [widget.test.ts](../../src/lib/__tests__/widget.test.ts): reopening the same
  Conversation; email threading tests under SF-05. Requirement: FR-USE-01.
- **Boundary:** This is per Conversation, not per unique customer. Usage is
  derived from stored Conversation rows, not a separate immutable ledger.

## SF-12 — Hosted plans, unlimited Products and no seat pricing

- **Claim:** Hosted plans use Conversation volume. The implemented Free plan
  has a configurable monthly allowance; Pro has unlimited Conversations.
  Products and agents have no configured count limits or per-unit charges.
  Billing shows usage, allowance/grace information and an upgrade option.
  Crossing the allowance does not block incoming messages or auto-upgrade.
- **Implementation:** [plans and usage](../../src/lib/usage.ts),
  [billing page](../../src/app/(app)/(page)/settings/billing/page.tsx),
  [checkout](../../src/app/api/billing/checkout/route.ts),
  [subscription handling](../../src/app/api/billing/webhook/route.ts),
  [Stripe request](../../src/lib/stripe.ts) (one subscription item, no metered
  message/seat/Product quantities), plus SF-01 and SF-09 creation paths.
- **Tests:** [usage.test.ts](../../src/lib/__tests__/usage.test.ts): Free allowance,
  grace, unlimited Pro, nonblocking intake and signature checking. No full
  live checkout test or exhaustive unlimited-Product/agent test is asserted.
  Requirement: FR-USE-02; [Initial.md §§21–23](../../Initial.md).
- **Boundary:** This is a plan model, not a shipped per-Conversation overage
  charge. No invented tier, annual discount, trial, card requirement or paid
  add-on. Prices, Free allowance and grace duration stay placeholders. Managed
  service availability and production Stripe configuration are not established
  by this branch; public hosted CTAs require an operating service.

## SF-13 — Free self-hosting and open source

- **Claim:** The source is under AGPLv3. Self-hosting has no software licence
  fee and uses the same core inbox, Product, widget, context and email code.
  A self-hosted installation serves one Workspace with unlimited Products and
  agents and does not require hosted billing or the managed service.
- **Implementation:** [LICENSE](../../LICENSE),
  [hosting mode](../../src/lib/hosting.ts),
  [Workspace enforcement](../../src/lib/workspace.ts),
  [auth](../../src/lib/auth.ts), hosted-only billing endpoints under SF-12.
- **Tests:** [workspace.test.ts](../../src/lib/__tests__/workspace.test.ts): a
  second self-hosted Workspace is rejected while hosted mode permits separate
  Workspaces. Core tests cover the shared services, not complete deployment
  parity. Requirement: FR-HOST-01; [self-hosting guide](../self-hosting.md).
- **Boundary:** Operators provide infrastructure, email configuration, backups
  and upgrades. Free software does not mean free infrastructure or email.
  Refer to the licence itself rather than inventing licensing advice.

## SF-14 — Docker Compose packaging and operations guide

- **Claim:** The repository includes a Docker Compose configuration for
  PostgreSQL, migrations and the app, with a guide covering environment setup,
  email, HTTPS, backups and upgrades. The documented start command is
  `docker compose up -d` after configuration.
- **Evidence:** [docker-compose.yml](../../docker-compose.yml),
  [Dockerfile](../../Dockerfile), [self-hosting guide](../self-hosting.md).
  No automated Compose deployment test was found or run for this copy task.
- **Publication boundary:** Packaging exists, but a successful fresh deployment
  is not verified. The Dockerfile copies `/app/public` from the builder, while
  this snapshot has no tracked `public/` directory. Resolve that build input
  and smoke-test the documented path before promising a working one-command
  install. This copy describes the included configuration and guide only.

## Exclusions and verification limits

Do not promote AI, knowledge bases, CRM, social/phone channels, automatic
diagnostics, assignments, priorities, custom sending domains, scheduled
availability, analytics or demo hosting as shipped. Some belong to later scope;
others have no implementation evidence here. Do not extrapolate FR-SEC-02 into
a complete deletion UI or cleanup guarantee from schema cascades alone.

No customer counts, testimonials, logos, benchmarks, performance guarantees,
compliance claims or comparative rankings are supported by this inventory.
The [configured name](../../src/config/site.ts) supplies `{siteConfig.name}`;
the copy must not introduce another literal brand name.

Verification for this documentation change: `npm run lint` passed;
`npm run build` passed, including its TypeScript check, with existing dynamic
filesystem-tracing warnings in attachment storage; `npm run test:run` passed
all 87 tests across 15 files. Dependencies were installed with `npm ci` before
these successful runs. All 165 local documentation links/anchors resolved.
No browser, live email, hosted checkout or Docker deployment was exercised;
these results do not remove the publication boundaries above.
