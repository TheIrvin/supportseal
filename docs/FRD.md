# Functional requirements — V1

This file specifies observable behaviour, not framework, provider or database choices. Requirement IDs are stable references for acceptance tests. [PRD.md](PRD.md) owns scope and intent.

## Account and Products

- **FR-ACC-01** A person can register, create a Workspace, invite users and sign in. An Admin manages Workspace, Products, users, channel settings and hosted billing. An Agent can operate the inbox. A user without Workspace access cannot read or change its data.
- **FR-PROD-01** An Admin can create, edit and archive multiple Products, each with a name, primary colour, one or more domains, domain allowlist, public widget key and support-email configuration. Archiving prevents new Product interactions while preserving historical support records until deleted.
- **FR-PROD-02** A Product's branding and identity are visible in its widget and in every related inbox view. A Workspace can have unrelated Products without requiring separate agent accounts.

## Inbox and conversations

- **FR-INBOX-01** Authorised agents see Conversations from all Products in their Workspace, recognise Product and channel at a glance, filter by Product and return to the combined view. Search finds relevant Conversations without crossing Workspace boundaries.
- **FR-INBOX-02** Conversations support Open, Pending and Closed states. Agents can reply, add internal notes invisible to customers, apply tags, insert managed saved replies and see basic customer details and attachments.
- **FR-INBOX-03** A chat, later email handoff and subsequent replies can remain one Conversation. A Contact may be linked internally across Products, but unrelated Product history is not automatically shown in a Conversation.

## Widget and live chat

- **FR-CHAT-01** A Product's public embed key loads its widget with no secret in the page. In production the service enforces that the embedding origin is permitted for that Product. Development supports an explicit localhost path. An invalid key or origin cannot create or read Conversations.
- **FR-CHAT-02** A visitor can start live chat without an account or email. The service gives the visitor an unguessable, scoped session so they can resume their Conversation in the same browser; another visitor cannot read it by guessing IDs.
- **FR-CHAT-03** When support is available, visitor and agent messages appear in near real time. The UI reflects delivery/read only when the service can establish those states; disconnection and reconnection must not duplicate or lose messages.
- **FR-CHAT-04** When support is away, the widget presents a message form and requires a usable reply email before submission. The agent can answer the resulting Conversation by email. A visitor may also volunteer email during live chat for a later reply.
- **FR-CHAT-05** The widget works on desktop and mobile, supports keyboard use, isolates its styles, avoids host-page layout shift, survives SPA navigation and shows a recoverable error if the support service fails.

## Developer context

- **FR-CTX-01** A small browser API lets an application explicitly identify the current user and attach structured application context to a visitor or Conversation, including useful account, plan, version, page and optional admin-link information. Context is optional and displayed beside the Conversation.
- **FR-CTX-02** Supplied identity and context are validated, bounded in size and depth, and rendered as untrusted data. The widget does not automatically inspect browser storage, form values, credentials or application secrets.

## Email and attachments

- **FR-EMAIL-01** Every Product can configure inbound support email, including a practical forwarding path. Valid inbound mail creates a Conversation for the addressed Product or continues the correct existing one using trustworthy threading/reply evidence, never the subject alone. Attachments appear in the inbox.
- **FR-EMAIL-02** Agents reply from the inbox using a managed sender that makes the Product clear to the customer. If a chat visitor has supplied an email and leaves, a later response can continue the Conversation through email.
- **FR-EMAIL-03** Repeated or forged delivery, malformed content, autoresponders, loops and oversized or unsafe attachments cannot create duplicate or unsafe support messages. Email HTML is safely presented. A failed delivery is visible for follow-up rather than silently treated as sent.
- **FR-FILE-01** Chat and email support file attachments subject to type and size checks. Only authorised Workspace users or the appropriate visitor can retrieve a file; deletion of its owning data also removes the file according to the documented cleanup process.

## Hosting, usage and safety

- **FR-HOST-01** The same core workflows run in hosted and self-hosted modes. A self-hosted installation represents one Workspace with multiple Products and agents and operates without hosted billing, hosted APIs or external telemetry (multi-Workspace self-hosting: [open-questions.md](open-questions.md)). Installation, backup and upgrade steps are documented.
- **FR-USE-01** Hosted billing counts a Conversation once, when it is first opened, in the billing period in which it opened; message count does not matter. Replies, reopening and chat-to-email continuation of the same Conversation do not add another counted Conversation. Whether activity in a later billing period counts again is undecided ([open-questions.md](open-questions.md)). Usage is auditable by Workspace and period.
- **FR-USE-02** Exceeding the hosted allowance does not abruptly reject new support messages during a documented grace period. Admins see usage and upgrade options; the system neither silently upgrades nor loses customer messages.
- **FR-SEC-01** Every read, write, search, widget action and attachment request enforces Workspace/Product ownership and the caller's role or visitor session. Cross-Workspace access fails even with a valid ID from another Workspace.
- **FR-SEC-02** The system supports deletion of Conversations, Contacts, Products, Workspaces, accounts and their attachments without orphaning personal data. Inputs, uploads, email and webhooks are treated as untrusted; secrets never appear in widget configuration or routine logs.

## Acceptance path

In a clean browser: register → create Workspace → add Product A → embed and send live chat → answer from inbox → supply identity/context and an attachment → switch between all Products and Product A after adding Product B → apply note, tag and saved reply → test away email continuation → receive inbound Product B email and reply. Run the same core flows in self-hosted mode. Separately attempt cross-Workspace access through URLs, APIs, widget keys, Conversation IDs and file URLs; all must fail. This condenses the full V1 acceptance flow (Initial.md §52) and the two-Workspace cross-tenant sanity test (Initial.md §63); those remain the complete reference procedures.
