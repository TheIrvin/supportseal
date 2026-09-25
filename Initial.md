# Mission

Build a production-quality, open-source customer support platform aimed primarily at indie developers, bootstrapped SaaS founders, and small software teams that operate multiple unrelated products.

You are responsible for taking this project from discovery through implementation, review, verification, documentation, marketing site, onboarding, hosted-SaaS readiness, and self-hosting readiness.

Do not treat this as a prototype or throwaway MVP.

The product must be genuinely useful enough that I can use it for my own existing products.

Work autonomously. Make sensible engineering decisions without repeatedly asking me questions.

---

# 1. Product thesis

The core problem is:

Developers who operate several SaaS products, websites, apps, tools, or side projects often have support scattered across:

* separate email inboxes
* separate chat widgets
* separate support accounts
* expensive help-desk subscriptions
* support tools designed around a single company/product
* generic shared inboxes that lack application context

The product should provide:

> **One support desk for everything you build.**

A customer should be able to add all their unrelated products and receive support conversations for all of them in one unified inbox.

Each Product retains its own:

* identity
* domain(s)
* support email
* widget
* branding
* customers
* developer context
* support configuration

But the support team works from one dashboard.

The three central product ideas are:

> **One inbox. Every product. Full developer context.**

A fourth important part of the proposition is:

> **Self-host it for free or let us host it for you.**

---

# 2. Competitive context

Before making product-positioning decisions, perform a concise current-market review of at least:

* Orka
* Chatwoot
* LibreDesk
* Crisp
* Intercom

Do not spend days on competitor analysis.

The purpose is to avoid accidentally building a generic clone.

Important current observations to validate:

* Orka is already strongly positioned around multiple products in one inbox.
* Chatwoot already provides a mature general-purpose hosted/self-hosted support platform.
* LibreDesk covers much of the generic open-source support-desk feature set.
* Crisp and Intercom are much broader commercial support platforms.

Therefore:

## Do not position this merely as:

* another Intercom alternative
* another open-source help desk
* another live-chat widget
* another Chatwoot clone

Our differentiation should centre on the combination of:

1. Portfolio-first support for people who build multiple products.
2. First-class inbound support email for every Product.
3. Developer/application context attached to support conversations.
4. Excellent developer experience.
5. Extremely easy onboarding.
6. Free self-hosting.
7. Managed SaaS for people who do not want to operate it themselves.
8. Premium-quality UX despite being open source.

Document the resulting positioning briefly in:

`docs/product-positioning.md`

Do not copy competitor wording.

Do not make comparative marketing claims unless they have been verified.

---

# 3. Target market

Primary ICP for launch:

* indie developers
* indie hackers
* bootstrapped SaaS founders
* small development teams
* studios operating multiple SaaS products
* small software companies with several products/sites

Do not optimise launch positioning around large corporate support centres.

Architect the system so larger teams could eventually use it, but keep the initial product focused.

A typical customer should think:

> “I have six products. They are not six companies with six separate support departments. It's basically me and a few other people supporting everything we build.”

---

# 4. Terminology and domain hierarchy

Use:

**Workspace → Product → Conversation**

### Workspace

Represents the overarching account/team.

For V1:

* one user account primarily belongs to one Workspace
* one Workspace can contain unlimited Products
* design the schema so multi-Workspace membership could be added later without destructive changes

### Product

A Product represents one independent:

* SaaS
* website
* mobile app
* tool
* service

Products may be completely unrelated.

A Product can have multiple domains, for example:

* `example.com`
* `app.example.com`
* `docs.example.com`

Each Product owns its own:

* support configuration
* chat widget configuration
* public widget key
* domain allowlist
* support email configuration
* customer-facing name
* primary colour
* developer context
* email identity
* future integrations

Do not model Products merely as arbitrary “inboxes”.

Product identity is a first-class domain concept.

### Conversation

A Conversation represents a customer support interaction.

Channels initially include:

* live chat
* email

Do not call everything a Ticket in the UI.

The primary UX should be conversational rather than traditional Zendesk-style ticketing.

---

# 5. V1 product scope

Keep V1 deliberately focused.

V1 must be excellent at a narrow set of workflows rather than mediocre at dozens of help-desk features.

## Workspace

Implement:

* Workspace creation
* Workspace settings
* Admin role
* Agent role

Do not build complex RBAC in V1.

### Admin

Can manage:

* Workspace
* Products
* users/agents
* email setup
* widget settings
* billing where applicable

### Agent

Can operate the support inbox.

---

# 6. Products

V1 Product functionality:

* create Product
* edit Product
* archive Product
* Product name
* primary colour
* one or more domains
* allowed-domain configuration
* public widget key
* support-email configuration
* Product-specific conversation filtering

V1 branding:

* Product name
* primary colour

V2:

* logo/avatar
* launcher position
* greeting

V3:

* launcher icon
* custom online/offline wording
* required visitor contact fields

Do not build arbitrary custom CSS in V1.

---

# 7. Unified support inbox

The central application experience is one excellent unified inbox.

Users must be able to:

* see conversations from every Product
* immediately recognise which Product a Conversation belongs to
* filter by Product
* switch quickly into one Product
* return easily to the combined inbox

Conversation states should include at minimum:

* Open
* Pending
* Closed

V1 includes:

* internal notes
* tags
* saved replies/macros
* attachments
* search
* basic customer details
* channel indicator
* Product identity
* read/delivered state where technically meaningful

V2 or later:

* assignment
* priority
* sophisticated agent presence
* SLAs
* automation rules
* audit logs
* collision detection if not required by architecture earlier

Do not turn V1 into enterprise ticket management.

---

# 8. Customer/contact identity

A Contact can exist at Workspace level internally so the same email identity can eventually be associated across Products.

However:

Do not automatically expose unrelated cross-Product history everywhere.

If a customer contacts Product A and Product B, make deliberate privacy-conscious decisions about when that relationship appears.

Design the schema for future customer identity linking without making it a prominent V1 feature.

---

# 9. Chat widget

The support widget is a core product, not an afterthought.

It must have extremely good UX on:

* desktop
* tablet
* mobile

It must:

* load quickly
* avoid layout shift
* avoid interfering with the host application's CSS
* isolate its styles
* be responsive
* support keyboard use where practical
* have polished animation without being distracting
* survive SPA route changes
* work on traditional websites
* fail gracefully if the support service is unavailable

The embed experience should be approximately this simple:

```html
<script
  async
  src="https://cdn.example.com/chat.js"
  data-key="pk_example">
</script>
```

The exact syntax can differ if there is a good technical reason.

The embed must not contain a secret.

The public key identifies the Product.

Production usage should enforce Product domain allowlists.

Development should support localhost easily.

---

# 10. Chat behaviour

Allow anonymous conversations.

Create a secure anonymous visitor/session identity.

The visitor may provide email during the conversation.

Email becomes especially important when:

* the support team is offline
* the visitor leaves
* a response occurs later

Support two customer-facing modes.

## Live mode

When support is available:

> Chat with us

Messages should appear in the support dashboard in near real time.

## Away mode

When support is unavailable:

> Send us a message

Collect enough information to respond by email.

The system should then continue the Conversation through email.

Do not make indie developers pretend to be online 24/7.

This asynchronous workflow is central to the target customer.

V1 real-time features:

* online/offline state
* delivered/read state where practical

V2:

* typing indicators
* richer agent presence

---

# 11. Developer context — V1 differentiator

Developer/application context belongs in V1.

This must be treated as a major differentiator rather than an obscure metadata feature.

Provide a small browser SDK API along the lines of:

```ts
support.identify({
  id: user.id,
  email: user.email,
  name: user.name,
  plan: user.plan
})
```

and:

```ts
support.context({
  appVersion: APP_VERSION,
  accountId: account.id,
  usageTier: account.usageTier,
  adminUrl: `/admin/users/${user.id}`
})
```

The exact API is an implementation decision.

The support agent should be able to see useful context next to the Conversation.

Examples:

* Product
* page URL
* user ID
* customer email
* customer name
* account ID
* subscription plan
* app version
* build version
* feature flags
* usage tier
* arbitrary safe custom metadata
* optional customer admin/deep link

Custom context must be:

* structured
* size limited
* depth limited
* treated as untrusted data
* safely rendered
* optional

Do not automatically inspect application secrets or browser storage.

---

# 12. Diagnostics — V2, not V1

Do not delay V1 for automatic diagnostics.

Design the architecture so V2 can safely add:

* JavaScript errors
* warnings
* rejected promises
* network failures
* page URL
* browser
* OS
* viewport
* application version

Diagnostics must be explicitly enabled per Product.

They must be clearly disclosed where legally appropriate.

Never automatically capture:

* cookies
* authentication headers
* bearer tokens
* passwords
* payment details
* request bodies
* response bodies
* form values
* localStorage values
* sessionStorage values
* access tokens
* API secrets

Implement strong redaction when diagnostics eventually arrive.

Do not monkeypatch arbitrary `console.log` output in V1.

---

# 13. Email is first-class

Inbound support email is a V1 feature.

It is not merely an email fallback for chat.

A Product owner should eventually be able to use:

`support@myproduct.com`

Easy onboarding is more important than providing every imaginable mail configuration.

For managed SaaS, a reasonable V1 workflow might be:

`support@myproduct.com`

forwards to a unique generated inbound address such as:

`product_xxxxx@inbound.platform.example`

Incoming mail should:

* identify the correct Product
* create or continue a Conversation
* preserve threading
* support attachments
* be sanitised safely
* appear alongside chat Conversations

Do not rely solely on subject-line matching.

Use appropriate email threading information such as:

* `Message-ID`
* `In-Reply-To`
* `References`
* secure conversation/reply identifiers where necessary

Protect against:

* mail loops
* duplicate webhook delivery
* malformed mail
* auto responders
* spoofed provider webhooks
* oversized attachments
* malicious HTML
* tracking/security issues

---

# 14. Outbound email

V1:

Provide an easy platform-managed outbound sender.

The customer should still clearly understand which Product is responding.

V2:

Add properly verified custom sending domains and Product-specific senders.

Eventually customers should be able to send as:

`Support <support@myproduct.com>`

with correct:

* SPF guidance
* DKIM
* domain verification
* bounce handling

Do not block V1 on custom outbound-domain infrastructure.

---

# 15. Email provider architecture

I currently use SendGrid in other projects.

Keep that in mind because familiarity and onboarding simplicity matter.

However:

Do not hardwire the entire application directly to SendGrid.

Create an email abstraction with normalised inbound/outbound behaviour.

Evaluate sensible options before choosing the V1 managed provider.

Criteria should include:

* easy developer setup
* inbound parsing support
* webhooks
* domain verification
* delivery reliability
* cost
* self-host friendliness
* attachment handling
* webhook quality
* local development experience

If SendGrid remains the sensible choice, use it.

For self-hosting, support provider adapters.

Do not build our own mail server.

---

# 16. Hosted SaaS + self-hosted

The same primary codebase should power:

1. our hosted SaaS
2. self-hosted installations

Do not maintain separate applications.

The hosted version is multi-tenant.

Every tenant-aware operation must be scoped to its Workspace.

For V1 self-hosting:

**one deployment effectively represents one Workspace.**

That Workspace may contain:

* unlimited Products
* multiple users/agents

The database/schema should still use Workspace boundaries so the hosted product and self-host product share architecture.

---

# 17. Self-hosting experience

The project must genuinely be pleasant to self-host.

Target:

```bash
docker compose up
```

or an equivalently straightforward documented flow.

Avoid unnecessary infrastructure.

Likely components may include:

* web/application server
* PostgreSQL
* optional Redis only if justified
* configurable object storage
* outbound SMTP/provider
* inbound email provider adapter

Do not introduce Kafka, Kubernetes, Elasticsearch, or distributed microservices because they look impressive.

Prefer a modular monolith.

Every additional service must justify the burden it places on self-hosters.

Self-hosting documentation must explain:

* installation
* environment variables
* database setup
* migrations
* persistent volumes
* backups
* upgrades
* email setup
* HTTPS/reverse proxy expectations
* object storage
* security
* update process

Self-hosted mode must not require:

* Stripe
* our hosted API
* our telemetry
* a proprietary cloud service controlled by us

External analytics/telemetry must be off by default for self-hosters.

---

# 18. Open-source licensing

Use **AGPLv3** unless a concrete legal/technical blocker is discovered.

Add appropriate:

* LICENSE
* contributing documentation
* code of conduct if appropriate
* security policy
* issue templates if useful

The intention is:

* users can genuinely self-host
* users can inspect and modify the source
* external contributors can contribute
* we can commercially offer managed hosting

Do not add proprietary restrictions that conflict with the selected licence without explicitly documenting the issue.

---

# 19. Critical Vuexy licensing guardrail

I own/use Vuexy and have a mapped repository containing my theme implementation.

Discover that repository.

Reuse design knowledge and established conventions where legally allowed.

However:

**Do not blindly copy Vuexy source code, proprietary assets, icons, templates, or components into an AGPL public repository.**

Before copying anything from Vuexy:

1. Inspect the relevant licence.
2. Determine whether redistribution in a public AGPL repository is permitted.
3. Document the conclusion.

If redistribution is not clearly allowed:

* use the theme as visual/reference inspiration
* reproduce the required UX using original components
* use appropriately licensed dependencies/assets
* do not publish proprietary Vuexy source

Do not put the project at legal risk merely to save frontend development time.

---

# 20. Authentication

Authentication must remain self-hostable and independent.

Do not require Clerk, Auth0, Firebase Auth, or another proprietary hosted auth provider for the product to function.

Inspect my existing repositories and conventions first.

Choose an authentication solution that provides a good SaaS experience while remaining fully operable in a self-hosted environment.

Document the decision in an ADR.

---

# 21. Billing model

Hosted SaaS should charge primarily based on support Conversation volume.

Principles:

* Products should not be the primary billing constraint.
* Paid tiers should support unlimited Products.
* Paid tiers should avoid per-seat pricing.
* Paid tiers should support unlimited agents unless a strong operational reason prevents it.

Potential positioning:

> Add every product and your whole team. Pay for the support volume you actually handle.

Free tier may reasonably limit:

* monthly Conversation volume
* agents

A possible default is one agent on Free.

Do not count individual messages as separate usage.

A long Conversation containing twenty messages is still one Conversation for the relevant usage period.

Define the billable Conversation lifecycle clearly and document it.

Usage metering must be testable and auditable.

---

# 22. Usage-limit behaviour

Never suddenly stop accepting customer support messages because the account crossed its quota.

When usage exceeds the plan:

* continue accepting support Conversations during a reasonable grace period
* clearly notify Workspace admins
* show usage
* provide upgrade prompts
* avoid surprising bills

Do not silently auto-upgrade customers.

Do not destroy or discard support messages.

---

# 23. Stripe

Hosted billing should use Stripe unless repository discovery reveals a compelling existing alternative.

Prices should be presented and charged in USD.

My Stripe account is Australian.

Do not add Stripe requirements to self-hosted deployments.

Keep billing capability separable from core support functionality.

---

# 24. Pricing research

Do a focused pricing comparison during the marketing/pricing phase.

Use competitors only to inform positioning.

Do not blindly undercut everyone.

This should be positioned as a premium-quality product rather than the cheapest help desk on the internet.

If final exact pricing remains uncertain:

* choose sensible launch values
* centralise all pricing configuration
* document the rationale
* make pricing easy to change before launch

Do not scatter dollar amounts throughout the codebase.

---

# 25. Marketing position

Lead with the use case rather than a giant feature matrix.

A provisional positioning direction is:

> **One support desk for everything you build.**

Supporting idea:

> Add live chat and support email to every product. Handle every conversation from one inbox, with the user and application context developers actually need.

And:

> Self-host for free, or let us host it for you.

Treat wording as a starting point, not final copy.

The marketing-copy specialist model defined later must produce the final copy.

Do not lead with:

* AI
* omnichannel
* CRM
* enterprise workflows
* “Intercom alternative”
* huge feature counts

---

# 26. Marketing website

The public website must feel premium.

It should not resemble a generic developer-template landing page.

It should communicate the product visually within seconds.

Build appropriate sections such as:

* hero
* unified multi-product inbox demonstration
* Product switching
* widget example
* developer context demonstration
* email support
* self-host vs hosted
* developer-friendly installation
* pricing
* open-source/GitHub section
* FAQ
* clear calls to action

Use strong visual product demonstrations rather than excessive prose.

Do not invent fake customer logos or testimonials.

Do not claim customer counts that do not exist.

Do not fabricate benchmarks.

---

# 27. Onboarding

Onboarding must be extremely easy.

Use products such as simple founder-built SaaS onboarding flows as inspiration for reducing friction.

Ideal path:

1. Create account
2. Create Workspace
3. Create first Product
4. Choose Product name and colour
5. Add domain
6. Copy one script
7. Open a test page
8. Send first test chat
9. See it appear in the inbox
10. Configure support email
11. Done

Use:

* a visible onboarding checklist
* live previews
* sensible defaults
* copy buttons
* success states
* test actions
* clear next step

Do not force customers through ten settings pages before they can test the product.

The first “aha” experience is receiving a real support message.

The second “aha” experience is adding another Product and seeing both appear in the same inbox.

---

# 28. Product analytics

Use Umami for:

* marketing-site analytics
* basic product analytics where appropriate

Do not use Umami as the source for support-business metrics.

Operational support metrics belong in our own database.

Potential future metrics:

* Conversation volume
* first-response time
* resolution time
* volume by Product
* channel mix

Self-hosted installations must have external telemetry disabled by default.

---

# 29. Privacy, legal and policy work

V1 launch focus is primarily the US market.

V2 expands explicit market work toward:

* Australia
* GDPR / UK GDPR

However, build privacy-conscious architecture from the beginning.

Produce draft:

* Terms of Service
* Privacy Policy
* acceptable use policy
* subprocessors page
* self-hosting responsibility language
* data-processing language where appropriate

These are **draft legal materials**, not legal advice.

Mark them clearly for qualified legal review before commercial launch.

Do not claim:

* HIPAA compliance
* SOC 2 compliance
* PCI compliance
* GDPR compliance
* CCPA compliance

unless the actual requirements have been independently verified and satisfied.

Self-hosting documentation should explain that the operator becomes responsible for their own hosting, data processing, privacy obligations, email configuration and applicable laws.

---

# 30. Security is non-negotiable

Multi-tenancy is a security boundary.

Treat Workspace isolation as a first-class invariant.

Every tenant-aware operation must prove Workspace ownership/authorisation.

Test against IDOR/cross-tenant access.

Security requirements include:

* strict Workspace isolation
* secure authentication
* role checks
* CSRF protections where applicable
* XSS-safe rendering
* HTML sanitisation
* input validation
* output encoding
* signed webhook verification
* email webhook replay protection
* rate limiting
* attachment validation
* sensible upload limits
* secret management
* no secrets in logs
* no secrets in client bundles
* domain validation for widgets
* safe session/token handling
* secure headers
* safe redirect handling
* SSRF protections where relevant
* SQL injection protection
* dependency scanning where practical

The widget public key is not a secret.

Never expose server credentials through widget configuration.

---

# 31. Data deletion and retention

Design for:

* deleting a Conversation
* deleting a Contact
* deleting a Product
* deleting a Workspace
* account deletion
* attachment cleanup

V1 does not require sophisticated configurable retention policies.

However, do not build a data model that makes proper deletion impossible.

V2 can add configurable retention.

---

# 32. Attachments

Attachments are V1.

Support reasonable file uploads through:

* chat
* email

Use configurable object storage.

Support local/self-hosted storage where appropriate and S3-compatible storage for production.

Implement:

* size limits
* MIME validation
* safe filenames
* non-executable delivery
* access control
* lifecycle cleanup

Do not trust file extensions alone.

---

# 33. Architecture discovery before coding

Before choosing the stack:

Inspect my mapped repositories.

Find:

* my current Next.js projects
* preferred TypeScript patterns
* package manager
* database tooling
* ORM conventions
* auth conventions
* testing conventions
* component libraries
* form handling
* validation patterns
* deployment patterns
* linting/formatting
* CI
* Docker conventions
* Vuexy/theme repository
* shared UI components
* analytics patterns
* Stripe patterns
* SendGrid patterns

Produce a short discovery document:

`docs/repository-discovery.md`

Then produce:

`docs/architecture.md`

and focused ADRs where necessary.

Expected likely direction is something resembling:

* Next.js
* TypeScript
* PostgreSQL

but do **not** choose these merely because they are written here.

Match my established stack where it makes sense.

Depart from it where this product has different requirements.

Explain meaningful departures.

---

# 34. Architecture philosophy

Prefer:

**modular monolith first**

over:

**premature distributed system**

Keep domain boundaries clean enough to extract services later if real load requires it.

Possible modules may include:

* authentication
* Workspaces
* Products
* contacts
* Conversations
* messages
* chat
* email
* widget
* developer context
* attachments
* billing
* usage
* analytics

Do not automatically create separate deployable services for every module.

---

# 35. Real-time architecture

Choose the simplest robust option that:

* works for hosted SaaS
* works in Docker
* works behind common reverse proxies
* supports reconnect/resume
* scales reasonably
* does not make self-hosting painful

WebSockets, SSE, or another approach may be used.

Make the choice based on actual requirements and document it.

Do not add Redis solely because “real-time apps use Redis”.

Introduce Redis only when it solves an actual problem.

---

# 36. Database design

Use proper foreign keys and constraints where practical.

Every tenant-owned entity should have an explicit safe relationship back to Workspace.

Do not rely exclusively on application developers remembering to add a Workspace filter.

Consider defence-in-depth approaches if supported by the chosen stack.

Important entities will likely include concepts resembling:

* Workspace
* User
* Membership
* Product
* ProductDomain
* Contact
* Conversation
* Message
* InternalNote
* Tag
* ConversationTag
* SavedReply
* Attachment
* ChatVisitor
* ChatSession
* developer context
* EmailChannel
* external email metadata
* usage event
* subscription

Exact schema is your decision.

Avoid giant JSON blobs for everything.

Use JSON where custom metadata genuinely benefits from flexible structure.

---

# 37. Design quality

The application should look like something people would happily pay for.

Avoid:

* crude admin-template defaults
* excessive gradients
* endless cards
* pointless glassmorphism
* over-animated interfaces
* giant empty dashboards
* AI-generated visual clutter
* inconsistent spacing
* arbitrary icon usage

Prioritise:

* typography
* spacing
* hierarchy
* density appropriate for a support inbox
* fast navigation
* excellent empty states
* clear Product identity
* responsive layout
* polished widget interaction
* professional tables/lists
* useful command/search behaviour where appropriate

The inbox should feel efficient for someone spending hours in it.

The marketing site can be more expressive than the application UI.

---

# 38. Accessibility

Full accessibility hardening is V2.

However:

Do not knowingly build inaccessible primitives in V1.

Use semantic HTML and accessible libraries where possible so later WCAG work does not require rewriting the application.

V2 should perform a dedicated accessibility pass targeting WCAG AA where reasonable.

---

# 39. V2 explicitly includes

Do not pull these into V1 unless required by architecture:

* automatic browser diagnostics
* JS error capture
* warning capture
* network failure capture
* richer Product branding
* logo/avatar
* widget launcher position
* custom Product greeting
* custom sender domains
* assignment
* priority
* agent presence
* typing indicators
* audit logs
* retention policies
* Australia-specific legal review
* GDPR/UK GDPR review
* accessibility hardening
* additional support analytics

---

# 40. V3 and later

Potential later features:

* launcher icon customisation
* custom online/offline wording
* required custom contact fields
* knowledge base
* AI support assistant
* AI suggested replies
* SLA tooling
* sophisticated workflows
* automation rules
* advanced permissions
* integrations
* mobile apps
* omnichannel messaging
* WhatsApp/social channels
* API ecosystem
* webhooks
* plugin ecosystem

These are not V1 blockers.

---

# 41. Explicitly out of scope for initial release

Do not build:

* knowledge base
* AI agent
* AI chatbot
* AI answer generation
* enterprise CRM
* WhatsApp
* Facebook Messenger
* Instagram
* phone support
* call centre
* SLA engine
* custom workflow builder
* advanced automation
* enterprise SSO
* dozens of roles
* white-label reseller platform
* full Sentry replacement
* session replay
* arbitrary console capture
* our own mail server

Control scope aggressively.

---

# 42. Model-routing and cost policy

This is important.

I have access to several coding/model environments with very different costs.

Use the strongest model where it materially affects quality, but do not waste expensive models on routine implementation.

## Default implementation model

The majority of development should be done using:

**OpenCode + GLM-5.3**

This is my normal OpenCode default through the Z.ai coding plan and is effectively inexpensive for me.

Use GLM-5.3 for:

* backend implementation
* database work
* API routes
* routine frontend implementation
* tests
* refactoring
* migrations
* Docker
* CI
* documentation
* bug fixes
* normal feature work
* applying reviewed designs
* implementing approved marketing copy

Do not route ordinary implementation through expensive models merely because they are available.

---

# 43. Frontend design model policy

For significant frontend design decisions use:

**Cursor Agent + Opus 5.5**

This is specifically for high-value design/UX reasoning.

Use it for surfaces such as:

* overall application shell
* support inbox
* Conversation view
* Product switcher
* onboarding
* chat widget
* Product settings
* major responsive layouts
* marketing visual direction

Do not use Opus 5.5 merely to:

* rename variables
* write API endpoints
* fix lint errors
* write tests
* perform routine component wiring
* make tiny CSS adjustments

The preferred workflow is:

1. Give Opus 5.5 the relevant product requirements and existing UI context.
2. Ask it to establish the UX/design direction.
3. Capture the design decisions clearly.
4. Let OpenCode GLM-5.3 perform most of the implementation.
5. Bring Opus back only for meaningful visual review or unresolved UX issues.

## Frontend fallback

If Opus 5.5 quota/tokens are unavailable:

Use:

**Cursor Agent + Astra 6 Medium**

Do not block progress waiting for Opus availability.

## Last-resort Cursor model

I also have:

**Cursor Agent + Grok 4.7**

This is not cheap.

Use it only if:

* the preferred frontend models are unavailable, or
* another task is genuinely blocked and there is no sensible lower-cost option.

Do not use Grok 4.7 as a default implementation model.

---

# 44. Marketing-copy model policy

For important customer-facing marketing copy use:

**Codex harness + Astra 6 High**

This includes the canonical copy for:

* homepage
* pricing
* positioning
* feature explanations
* self-hosting proposition
* key calls to action
* major onboarding wording
* high-value conversion copy

Use Astra 6 High to create/refine the canonical copy.

Then let GLM-5.3 implement that copy in the application.

Do not repeatedly regenerate the same marketing page through Astra 6 High for trivial edits.

Prefer one or a small number of focused high-quality copy sessions.

Marketing-copy instructions should include:

* product positioning
* ICP
* competitor context
* screenshots/product reality
* actual feature scope
* tone
* legal constraint against fabricated claims

Do not let the copy model invent features that have not been built.

---

# 45. Local code review model policy

Before creating a substantive PR, run the repository's:

`/cursor-prep`

workflow where available.

This is a soft requirement rather than a blocker if the skill genuinely cannot be used.

Primary local review:

**coderabbit-cli**

Fallback:

**OpenCode + GLM-5.3**

The local review should look for:

* correctness
* regressions
* security issues
* tenant isolation
* missing tests
* bad abstractions
* dead code
* unnecessary complexity
* performance traps
* UI mistakes where visible
* poor error handling

Do not blindly apply reviewer suggestions.

Evaluate each suggestion.

---

# 46. PR review model policy

After the PR is opened, use the repository's:

`/babysit-reviews`

or equivalent installed babysit-review workflow.

PR review should use:

1. CodeRabbit
2. OpenCode + GLM-5.3
3. Codex

Use these as complementary reviewers.

Do not assume three reviewers agreeing makes something correct.

Review comments remain suggestions that must be validated against:

* requirements
* tests
* architecture
* actual runtime behaviour

Resolve actionable review findings.

Then rerun verification.

Update the PR after fixes.

---

# 47. Cost-awareness rule

When choosing models ask:

> Will the expensive model materially improve this particular task?

If not, use GLM-5.3.

Typical desired distribution should be approximately:

**Most work:** GLM-5.3
**Important frontend decisions:** Opus 5.5
**Opus fallback:** Astra 6 Medium
**Important marketing copy:** Astra 6 High through Codex
**Routine local review:** CodeRabbit CLI / GLM-5.3
**PR review:** CodeRabbit + GLM-5.3 + Codex
**Grok 4.7:** last resort

Do not run the entire repository through Opus or Astra after every PR.

Do not consume premium model tokens for mechanical work.

---

# 48. Stacked PR strategy

Build this through small reviewable PRs.

Use stacked PRs when later work depends on earlier unmerged work.

Target:

* roughly <600 meaningful changed lines where practical
* avoid >1,000 meaningful changed lines unless there is a justified reason
* generated files, lockfiles and unavoidable migrations are not the main concern

Each PR should represent one coherent idea.

Do not produce a 5,000-line “build support platform” PR.

When a PR becomes too large:

split it.

When splitting creates fake/artificial boundaries that make review harder:

keep the coherent change together and explain why.

---

# 49. Suggested PR sequence

Adjust this after repository discovery.

A likely sequence is:

### PR 1 — Foundation

* repository/bootstrap
* architectural docs
* local development
* database
* basic CI
* Docker groundwork

### PR 2 — Authentication + Workspace

* independent auth
* Workspace
* Admin/Agent membership
* tenant isolation foundations

### PR 3 — Product domain

* Products
* Product domains
* Product settings
* public keys
* domain validation

### PR 4 — Application shell

* polished dashboard shell
* navigation
* Product switcher
* foundational design system

Use the frontend-design specialist here.

### PR 5 — Conversation domain

* Contacts
* Conversations
* Messages
* states
* tags
* internal notes

### PR 6 — Unified inbox UI

* inbox
* Product filtering
* Conversation view
* responsive behaviour
* realistic seeded content

Use the frontend-design specialist here.

### PR 7 — Widget foundation

* embed script
* launcher
* chat shell
* public Product configuration
* allowed domains
* localhost flow

Use the frontend-design specialist here.

### PR 8 — Real-time chat

* anonymous visitor session
* send/receive messages
* online/away behaviour
* delivery/read semantics
* reconnect behaviour

### PR 9 — Developer context SDK

* identify API
* context API
* validation
* context presentation in inbox

### PR 10 — Attachments

* chat attachments
* secure object storage
* inbox rendering

### PR 11 — Inbound email

* provider abstraction
* first provider
* parser
* threading
* webhook validation
* attachments
* Conversation creation

### PR 12 — Outbound email + fallback

* agent replies
* platform-managed sender
* chat-to-email continuation
* customer email capture

### PR 13 — Saved replies/macros

* creation
* editing
* insertion
* management UI

### PR 14 — Onboarding

* Product wizard
* script copy
* live preview
* test Conversation
* checklist
* email setup

Use the frontend specialist here.

### PR 15 — Usage + billing

* usage metering
* plans
* Stripe
* grace behaviour
* SaaS gating without affecting self-hosting

### PR 16 — Marketing site

First use Astra 6 High through Codex for canonical copy.

Use the frontend-design specialist for major visual decisions.

Implement with GLM-5.3.

### PR 17 — Self-hosting

* Docker Compose
* production config
* migration flow
* storage
* email docs
* backup/upgrade docs

### PR 18 — Security/launch hardening

* cross-tenant tests
* abuse/rate-limit testing
* security review
* E2E tests
* failure states
* performance checks
* legal draft pages
* launch checklist

This sequence is guidance, not bureaucracy.

Change it if implementation discoveries justify a better stack.

---

# 50. PR requirements

Every substantive PR should include:

## Before implementation

Where useful:

* `/cursor-prep`
* clear scope
* acceptance criteria

## Before PR creation

Run:

* formatting
* lint
* typechecking
* relevant unit tests
* integration tests
* build

For user-facing functionality:

actually run the application.

Do not assume compilation proves the feature works.

## Screenshots

For visual PRs, include screenshots in the PR description.

Capture appropriate views such as:

* desktop
* mobile
* important state changes
* empty state
* populated state

Screenshots must show realistic seed data where appropriate.

Do not include broken/dev-looking data unless the PR specifically demonstrates an error state.

## After PR creation

Run `/babysit-reviews`.

Use:

* CodeRabbit
* OpenCode GLM-5.3
* Codex

Address actionable findings.

Rerun verification.

Update screenshots if the UI changed.

Merge only once the PR is genuinely complete and review checks are clean.

---

# 51. Stacked PR rules

When PR B depends on PR A:

* base B correctly on A
* make the dependency obvious
* do not duplicate A's changes
* keep commits clean enough to retarget
* update the stack when parent PRs merge
* ensure later PRs continue to pass after rebasing

Do not leave a tangled branch structure behind.

---

# 52. Browser verification is mandatory

For every important user-facing flow, use actual browser-based verification.

Do not trust only unit tests.

Verify the product like a customer would.

Important V1 end-to-end acceptance flow:

1. Sign up.
2. Create Workspace.
3. Create Product A.
4. Configure Product A colour/domain.
5. Copy widget embed.
6. Open a test Product A page.
7. Start anonymous chat.
8. Send message.
9. Verify Conversation appears in unified inbox.
10. Reply as agent.
11. Verify customer receives reply.
12. Verify delivered/read behaviour.
13. Identify the customer through the developer SDK.
14. Attach custom context.
15. Verify context appears correctly to the agent.
16. Upload an attachment.
17. Verify it is accessible only to authorised participants.
18. Create Product B.
19. Send Product B Conversation.
20. Verify both Products appear in unified inbox.
21. Filter to Product A.
22. Return to all Products.
23. Add an internal note.
24. Tag a Conversation.
25. Insert a saved reply.
26. Test offline/away mode.
27. Submit email for asynchronous reply.
28. Verify email continuation.
29. Send email to Product support address.
30. Verify it creates the correct Product Conversation.
31. Reply from inbox.
32. Verify outbound email.
33. Create a second Workspace in automated security tests.
34. Verify cross-Workspace access fails.

This flow is more important than dozens of isolated unit tests.

---

# 53. Seed/demo environment

Provide high-quality seed data.

Create multiple realistic Products with distinct branding.

Example categories could include:

* developer SaaS
* analytics tool
* invoicing app

Create realistic:

* contacts
* Conversations
* messages
* tags
* internal notes
* developer context
* attachments
* Product colours
* statuses

The seeded environment should make:

* screenshots
* demos
* QA
* onboarding development

easy and visually credible.

Do not use lorem ipsum everywhere.

---

# 54. Testing strategy

Have a balanced test pyramid.

Use unit tests for:

* business rules
* parsing
* usage calculations
* validators
* threading logic

Use integration tests for:

* database boundaries
* Workspace isolation
* email handling
* webhooks
* auth
* message persistence

Use E2E/browser tests for:

* onboarding
* widget chat
* inbox
* Product switching
* email flows where practical
* billing boundaries
* critical settings

Security regression tests should specifically attempt cross-Workspace access.

---

# 55. Performance

Do not prematurely optimise.

But pay attention to obviously critical performance areas:

* widget bundle size
* widget initial load
* chat reconnect
* inbox queries
* Conversation pagination
* message pagination
* database indexes
* attachment delivery
* expensive polling
* N+1 queries

Do not make the widget download the main application JavaScript bundle.

---

# 56. Error handling and observability

Implement useful structured logging.

Never log:

* passwords
* auth tokens
* cookies
* sensitive email contents unnecessarily
* API secrets

Include useful IDs such as:

* request ID
* Workspace ID where safe
* Product ID
* Conversation ID

Provide self-hosters enough logs to diagnose problems.

Do not require a proprietary observability vendor.

---

# 57. Marketing-copy integrity

The marketing copy must correspond to what the software actually does.

Never say:

* “unlimited” when it isn't
* “open source” if core features are withheld from the published source
* “privacy-first” without meaningful privacy controls
* “five-minute setup” if the flow has not been tested
* “enterprise grade”
* “secure by default”
* “GDPR compliant”
* “best”
* “fastest”

without evidence sufficient to support the claim.

Use real screenshots.

Do not create fake testimonials.

---

# 58. Naming

The final product name is not decided.

Do not block engineering on naming.

Use a central configurable application/brand name.

Avoid scattering a temporary name throughout:

* database tables
* email templates
* code identifiers
* domains
* filenames

A naming/branding exercise can happen later.

---

# 59. Decision autonomy

Do not ask me about ordinary implementation choices.

Research the existing repositories.

Choose the conservative maintainable option.

Document important decisions.

Proceed.

Only stop for input when a decision materially affects:

* irreversible architecture
* fundamental product scope
* legal exposure
* pricing/business model
* destructive data changes
* external credentials/access that I must provide

If you discover something unexpected that invalidates the current plan:

1. document it
2. update the architecture/ADR
3. adjust the plan
4. continue

Do not blindly follow an outdated plan.

---

# 60. Avoid over-engineering

Before adding a technology ask:

> What concrete V1 problem does this solve?

Avoid dependencies and infrastructure whose primary justification is hypothetical future scale.

Do not build for one million simultaneous chats before we have one hundred customers.

But do not create obvious architectural dead ends merely to save a few hours.

---

# 61. Documentation that should exist by launch

At minimum:

* README
* local development guide
* architecture overview
* repository discovery notes
* relevant ADRs
* self-hosting guide
* Docker guide
* configuration/environment reference
* email setup guide
* backup/restore guide
* upgrade guide
* security policy
* contribution guide
* licence
* API/widget integration guide
* developer-context SDK guide
* hosted-vs-self-hosted explanation
* draft legal documents
* launch checklist

Documentation should be concise and useful.

Do not create hundreds of pages of speculative documentation.

---

# 62. Definition of V1 done

V1 is not complete because the code compiles.

It is complete when:

* new user can register
* Workspace works
* Admin/Agent roles work
* multiple Products work
* Product domain allowlists work
* unified inbox works
* Product filtering works
* live chat works
* away/offline messaging works
* email fallback works
* inbound support email works
* outbound support email works
* internal notes work
* tags work
* saved replies work
* attachments work
* developer identify/context works
* hosted multi-tenancy is correctly isolated
* free/self-host mode does not depend on hosted services
* Docker Compose installation works from documented instructions
* Stripe hosted billing works
* usage metering works
* grace behaviour works
* Umami integration works as intended
* marketing site represents the real product
* onboarding has been browser-tested
* widget has been tested on mobile and desktop
* visual PRs contain screenshots
* security checks pass
* tenant-isolation tests pass
* builds/tests/lint/types pass
* docs are sufficient for another developer to run the project
* another person could self-host the product without reverse-engineering the repository

---

# 63. Final release sanity test

Before considering the project launch-ready, simulate two completely separate customers:

### Workspace Alpha

Products:

* Alpha SaaS
* Alpha Analytics

### Workspace Beta

Products:

* Beta Tool

Create:

* users
* Products
* contacts
* chat sessions
* emails
* attachments
* developer context

Then intentionally attempt cross-tenant access through:

* URL manipulation
* API requests
* guessed IDs
* attachment URLs
* widget APIs
* Conversation IDs
* Product IDs
* email endpoints

All cross-Workspace attempts must fail.

Then run the complete onboarding/support workflow from a clean browser.

---

# 64. Final product principle

When forced to choose between:

**more features**

and

**making the core experience exceptional**

choose the second.

The product should make a developer with five different products feel:

> “Finally. I can put this on everything I build and deal with support in one place.”

That is the V1 goal.

Build toward that.
