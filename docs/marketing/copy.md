# Public-site copy

Editorial notes, not page copy: use `{siteConfig.name}` wherever the platform
name appears. Claim references apply to every heading, sentence and CTA in
their block and link to the [shipped-feature ledger](shipped-features.md).
Metadata has its own references. This is copy only; proposed public routes
are not implemented by this document.

Use the implemented Free/Pro model. Prices, allowances, agent limits and the
grace period come from the single configuration source
(`src/config/pricing.ts`, issue #15): Free $0 — 100 new Conversations per
month, 1 agent; Pro $39/month — 1,000 new Conversations per month, unlimited
agents and Products. Resolve `{proMonthlyPriceUSD}`, `{proMonthlyConversations}`,
`{freeMonthlyConversations}` and `{graceDays}` from that module before
publication, and never hard-code copies of its numbers. Pro must never be
advertised as unlimited Conversations. Hosted signup links require a running,
configured hosted service. Self-hosting copy describes the included
configuration; the SF-14 deployment caveat must be resolved before adding a
stronger installation promise.

## Home — `/`

### Hero

Claims: [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace),
[SF-02](shipped-features.md#sf-02--combined-searchable-inbox),
[SF-03](shipped-features.md#sf-03--domain-controlled-live-chat),
[SF-05](shipped-features.md#sf-05--product-support-email),
[SF-06](shipped-features.md#sf-06--user-and-application-context),
[SF-10](shipped-features.md#sf-10--guided-first-message),
[SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source).

- **Eyebrow:** For founders supporting several products
- **Headline:** One inbox for everything you build.
- **Subhead:** Give each product its own chat widget and support email. Answer
  from one inbox, with the customer and app details you choose to send beside
  the Conversation.
- **Primary CTA:** Set up your inbox
- **Secondary CTA:** Explore self-hosting
- **Supporting line:** Start with a message from one product. Add the next to
  the same inbox.

### Section: Keep each product in view

Claims: [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace),
[SF-02](shipped-features.md#sf-02--combined-searchable-inbox).

Work through support for all your products together. Each Conversation shows
which product it belongs to. Filter to one product when you need to focus,
then return to the full inbox.

**Product-view caption:** Each product has its own name and colour. Your team
shares the inbox.

### Section: Chat now. Continue by email.

Claims: [SF-03](shipped-features.md#sf-03--domain-controlled-live-chat),
[SF-04](shipped-features.md#sf-04--away-messages-and-email-continuation),
[SF-05](shipped-features.md#sf-05--product-support-email).

Customers can start a live chat without creating an account. When you set
support to Away, the widget asks for an email address with their message.
If a chat visitor leaves an address and goes offline, your reply can reach
them by email in the same Conversation.

Already have support addresses? Forward each one to its Product's inbox
address and answer incoming email alongside chat.

### Section: Bring the app details into the Conversation

Claims: [SF-06](shipped-features.md#sf-06--user-and-application-context).

Send the customer's account, plan, app version or admin link through
`identify()` and `context()`. See those details beside their message while
you answer. The widget also records the page origin and path, without the
query string or fragment.

Editorial note: the code sample beside this section mirrors IndieDevTest's
real integration (pietervw/indiedevtest, `src/components/support-chat.tsx`):
Clerk-signed members are identified, and the app context carries the site
source and membership year.

**Context-panel caption:** The app context you send, next to the customer's
question.

### Section: Leave a useful thread for the next reply

Claims: [SF-07](shipped-features.md#sf-07--status-internal-notes-tags-and-saved-replies),
[SF-08](shipped-features.md#sf-08--attachments-in-chat-and-email).

Mark Conversations Open, Pending or Closed. Add an internal note, tag the
topic and share files with the customer. For questions you answer often,
insert a saved reply and edit it before sending.

**CTA:** Explore the features

### Section: Customer zero — IndieDevTest

Editorial note: this is a live-deployment fact, not a feature claim. The
evidence is the hosted workspace at supportseal.app (Seal Labs · IndieDevTest:
real chat, email and context conversations) and the widget integration in
IndieDevTest's public repository (pietervw/indiedevtest). Keep the wording
true of the live state — tighten it only when the widget is embedded on
indiedevtest.com itself.

**Heading:** Customer zero: IndieDevTest

IndieDevTest — a community where indie mobile developers test each other's
apps — is the first product running on {siteConfig.name}. Its support chat,
developer context and support email land in one workspace, and the
conversations in the screenshots above are the real ones.

**CTA:** Visit IndieDevTest (external, https://indiedevtest.com)

### Section: Choose how to run your support desk

Claims: [SF-11](shipped-features.md#sf-11--conversations-counted-once-ever),
[SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing),
[SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source),
[SF-14](shipped-features.md#sf-14--docker-compose-packaging-and-operations-guide).

**Hosted:** Choose a plan around Conversation volume. Add unlimited Products
and invite your team without per-seat pricing. Each Conversation counts once
ever, when it first opens.

**Self-hosted:** Run the same core support tools on your infrastructure. The
AGPLv3 source is free to self-host and includes a Docker Compose configuration.
You provide the hosting and email setup.

**CTAs:** See hosted plans · Read the self-hosting guide

### Closing section: Receive a message. Answer it. Add your next product.

Claims: [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace),
[SF-10](shipped-features.md#sf-10--guided-first-message).

Create your Workspace, add a Product and install its widget. Send a test
message and reply from your inbox. When you add another Product, its
Conversations appear there too.

**Primary CTA:** Set up your inbox

## Features — `/features`

### Hero: Follow the Conversation from the first message to the next reply

Claims: [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace),
[SF-02](shipped-features.md#sf-02--combined-searchable-inbox),
[SF-04](shipped-features.md#sf-04--away-messages-and-email-continuation),
[SF-06](shipped-features.md#sf-06--user-and-application-context).

{siteConfig.name} brings your products' chat, support email and supplied app
context into one inbox.

**Primary CTA:** Set up your inbox · **Secondary CTA:** See pricing

| Section heading | Body copy | Claims |
| --- | --- | --- |
| Give every product a place to reach you | Set each Product's name, colour and allowed domains, then embed its chat widget. Customers can start a live chat without an account or email address. | [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace), [SF-03](shipped-features.md#sf-03--domain-controlled-live-chat) |
| Answer email where you answer chat | Forward your support addresses to their Product inbox addresses. Read and reply in the shared inbox, with the Product identified in the email sender name. | [SF-02](shipped-features.md#sf-02--combined-searchable-inbox), [SF-05](shipped-features.md#sf-05--product-support-email) |
| Keep support open when you step away | Set the Workspace to Away so new chat visitors leave a message and reply address. Continue by email when a visitor has left an address and is no longer connected. | [SF-04](shipped-features.md#sf-04--away-messages-and-email-continuation) |
| Find the thread you need | Filter by Product or status. Search message text, subjects, customer names and email addresses across your Workspace. | [SF-02](shipped-features.md#sf-02--combined-searchable-inbox) |
| See the details your app can provide | Use `identify()` and `context()` to send customer and app details into the Conversation panel. Include an account, plan, version or admin link where it helps you answer. | [SF-06](shipped-features.md#sf-06--user-and-application-context) |
| Keep track of the work | Use Open, Pending and Closed states. Add internal notes for your team and tags for the topics you handle. | [SF-07](shipped-features.md#sf-07--status-internal-notes-tags-and-saved-replies) |
| Reuse an answer, then make it specific | Admins maintain shared saved replies. Insert one into your reply, edit the wording and send it when you're ready. | [SF-07](shipped-features.md#sf-07--status-internal-notes-tags-and-saved-replies) |
| Keep files with the question | Share supported attachments through chat and email. See them alongside the messages they belong to. | [SF-08](shipped-features.md#sf-08--attachments-in-chat-and-email) |
| Bring your team into the same Workspace | Invite teammates as Admins or Agents. Admins manage Products and invitations; Agents work in the inbox. | [SF-09](shipped-features.md#sf-09--accounts-and-team-access) |
| Start with a real exchange | Follow onboarding to add a Product, allow its domain and install the widget. Send a test message, answer it and add your next Product. | [SF-10](shipped-features.md#sf-10--guided-first-message) |

### Not yet — and not pretended

Editorial note: the honest "Not yet" section stays (open-questions M8,
default: keep). Items come from the PRD's "Later and outside scope" list;
never advertise anything on it.

{siteConfig.name} deliberately does not yet ship knowledge bases, AI support
agents, enterprise CRM or workflow tooling, social and phone channels,
enterprise SSO, or a built-in mail server. If you need those, {siteConfig.name}
is not the right desk today.

## Pricing — `/pricing`

### Hero: Pricing around the Conversations you handle

Claims: [SF-11](shipped-features.md#sf-11--conversations-counted-once-ever),
[SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing),
[SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source).

Each Conversation counts once ever. Products are unlimited on every plan,
with no per-seat pricing. Choose a hosted plan or self-host for free.

**Primary CTA:** Start on Free · **Secondary CTA:** Explore self-hosting

### Plan cards

Claims: [SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing),
[SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source).

| | Hosted Free | Hosted Pro | Self-hosted |
| --- | --- | --- | --- |
| Price | Free | {proMonthlyPriceUSD} USD / month | Free software |
| Description | Start receiving and answering support messages. | For Workspaces with sustained support volume. | Run the core support tools on your infrastructure. |
| Conversations | {freeMonthlyConversations} new Conversations per month | {proMonthlyConversations} new Conversations per month | No hosted Conversation allowance |
| Products | Unlimited | Unlimited | Unlimited |
| Team | 1 agent | Unlimited agents | Unlimited agents |
| CTA | Start on Free | Choose Pro | Read the self-hosting guide |

Self-hosting has no software licence fee. You cover your infrastructure and
any email-provider costs, and manage your installation.

### How a Conversation is counted

Claims: [SF-11](shipped-features.md#sf-11--conversations-counted-once-ever).

A Conversation counts once, in the UTC calendar month it first opens. The
number of messages doesn't change that count. Replies, reopening a Closed
Conversation and continuing the same chat by email do not count again—even
when the reply comes in a later month.

A separate new Conversation counts separately, including one from a customer
who has contacted you before.

### Pricing questions

| Question | Answer | Claims |
| --- | --- | --- |
| Is there a charge for every message? | No. Usage counts Conversations. Sending more messages in the same Conversation does not increase the count. | [SF-11](shipped-features.md#sf-11--conversations-counted-once-ever) |
| Is this a separate charge for each Conversation? | No. Hosted plans include a monthly Conversation allowance: Free includes {freeMonthlyConversations} and Pro {proMonthlyConversations} new Conversations per month. | [SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing) |
| What happens if I go over my allowance? | Incoming messages keep being accepted. Billing shows your usage, a {graceDays}-day grace window and plan options. Going over the allowance never blocks messages, never automatically upgrades your plan and never causes a surprise bill. For sustained overage, arrange a higher-volume plan. | [SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing) |
| Does adding a product or teammate change the price? | No per-product and no per-seat charges. Products are unlimited on every plan; Free includes one agent and Pro has unlimited agents. | [SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing) |
| Can I self-host for free? | Yes. The AGPLv3 software has no self-hosting licence fee. You provide and maintain the infrastructure and email setup. | [SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source) |

## Self-host / open source — `/self-host`

### Hero: Run your support desk on your infrastructure

Claims: [SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source),
[SF-14](shipped-features.md#sf-14--docker-compose-packaging-and-operations-guide).

{siteConfig.name} is open source under AGPLv3 and free to self-host. Use the
same core support tools for your products in a single Workspace, with no
hosted subscription required.

**Primary CTA:** Read the self-hosting guide · **Secondary CTA:** View the source

### Section: Your products and team, in one installation

Claims: [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace),
[SF-02](shipped-features.md#sf-02--combined-searchable-inbox),
[SF-05](shipped-features.md#sf-05--product-support-email),
[SF-06](shipped-features.md#sf-06--user-and-application-context),
[SF-07](shipped-features.md#sf-07--status-internal-notes-tags-and-saved-replies),
[SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source).

A self-hosted installation serves one Workspace with unlimited Products and
agents. Work from the shared inbox, connect chat and support email, supply
app context and use notes, tags and saved replies. The core workflow uses
the same source as hosted mode.

### Section: Docker Compose configuration included

Claims: [SF-14](shipped-features.md#sf-14--docker-compose-packaging-and-operations-guide).

The repository includes a Docker Compose configuration for the app,
PostgreSQL and database migrations. Follow the guide to configure the
environment and use the documented start command:

```sh
docker compose up -d
```

The guide also covers email configuration, HTTPS, backups and upgrades.

### Section: Bring your email setup

Claims: [SF-05](shipped-features.md#sf-05--product-support-email),
[SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source).

Configure inbound forwarding and a provider webhook or forwarder to receive
support mail. Connect SMTP to deliver replies. Self-hosting does not require
the managed service or hosted billing; you operate the installation and its
email connections.

### Section: Read the source. Run it yourself.

Claims: [SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source).

The source is published under AGPLv3. Explore the code and read the licence
in the repository. There is no software licence fee for self-hosting.

**CTAs:** View the source · Read the licence

## Page titles, descriptions and Open Graph text

Editorial note: the OG image text is an optional short text overlay, not a
request to generate imagery or imply an existing product screenshot. Evidence
in the last column covers every field in that row.

| Page | Page title | Meta description | OG title | OG description | OG image text | Claims |
| --- | --- | --- | --- | --- | --- | --- |
| Home | {siteConfig.name} — One inbox for all your products | Handle chat and support email for your products in one inbox, with the app context you send beside each Conversation. Explore hosted plans or self-host. | One inbox for everything you build | Give each product its own chat and support email. Answer from one inbox with {siteConfig.name}. | Every product. One support inbox. | [SF-01](shipped-features.md#sf-01--multiple-products-in-one-workspace), [SF-02](shipped-features.md#sf-02--combined-searchable-inbox), [SF-03](shipped-features.md#sf-03--domain-controlled-live-chat), [SF-05](shipped-features.md#sf-05--product-support-email), [SF-06](shipped-features.md#sf-06--user-and-application-context), [SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing), [SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source) |
| Features | Features — {siteConfig.name} | Explore a shared inbox, live chat, support email, app context, notes, tags, saved replies and attachments for the products you build. | Follow the Conversation | Chat, email and the app context you supply, together in your team's inbox. | From first message to next reply | [SF-02](shipped-features.md#sf-02--combined-searchable-inbox), [SF-03](shipped-features.md#sf-03--domain-controlled-live-chat), [SF-04](shipped-features.md#sf-04--away-messages-and-email-continuation), [SF-05](shipped-features.md#sf-05--product-support-email), [SF-06](shipped-features.md#sf-06--user-and-application-context), [SF-07](shipped-features.md#sf-07--status-internal-notes-tags-and-saved-replies), [SF-08](shipped-features.md#sf-08--attachments-in-chat-and-email) |
| Pricing | Pricing — {siteConfig.name} | Hosted plans based on Conversation volume. Each Conversation counts once ever. Unlimited Products, no per-seat pricing and free self-hosting. | Each Conversation counts once ever | Choose hosted Free or Pro, or self-host for free. Unlimited Products and no per-seat pricing. | Unlimited Products. No seat charges. | [SF-11](shipped-features.md#sf-11--conversations-counted-once-ever), [SF-12](shipped-features.md#sf-12--hosted-plans-unlimited-products-and-no-seat-pricing), [SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source) |
| Self-host / open source | Self-host & open source — {siteConfig.name} | Self-host {siteConfig.name} under AGPLv3. Explore the Docker Compose configuration and guides for email setup, backups and upgrades. | Your support desk, on your infrastructure | AGPLv3 source, free self-hosting and a Docker Compose configuration for your support desk. | Open source. Free to self-host. | [SF-13](shipped-features.md#sf-13--free-self-hosting-and-open-source), [SF-14](shipped-features.md#sf-14--docker-compose-packaging-and-operations-guide) |

## CTA destinations — editorial wiring notes

| Label | Destination intent | Evidence |
| --- | --- | --- |
| Set up your inbox / Start on Free | Hosted app registration (`/register` on the configured app origin), then onboarding | SF-09, SF-10, SF-12 |
| Choose Pro | Registration for new users; Billing for an existing Workspace Admin | SF-09, SF-12 |
| Explore the features | Proposed `/features` page above | SF-01–SF-10 |
| See hosted plans / See pricing | Proposed `/pricing` page above | SF-11–SF-13 |
| Explore self-hosting | Proposed `/self-host` page above | SF-13, SF-14 |
| Read the self-hosting guide | [Existing guide](../self-hosting.md), exposed through the public docs or repository | SF-14 |
| View the source | [Project repository](https://github.com/pietervw/supportseal) | SF-13 |
| Read the licence | [AGPLv3 licence](../../LICENSE), exposed through the public repository | SF-13 |
