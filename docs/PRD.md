# Product requirements

## Purpose

Give people who build several independent products one place to handle customer support, with enough application context to answer well. A Workspace contains Products; each Product has its own customer-facing identity and support channels; the team works from one inbox.

## Audience and problem

The primary users are indie developers, bootstrapped SaaS founders and small software teams with multiple products. Their support is scattered across product inboxes, chat tools and accounts. Generic support tools often lack the account and application details a developer needs to resolve an issue.

## Product promise

One support desk for everything you build: live chat and support email for each Product, a unified inbox, useful developer context, and a choice between managed hosting and genuine self-hosting from the same source.

## Principles

- Make the first real customer message easy to receive; make the second Product easy to add.
- Keep Product identity obvious without fragmenting the support team's workflow.
- Support asynchronous replies as well as live chat; founders are not online around the clock.
- Let developers provide intentional context without automatic collection of sensitive application data.
- Charge hosted customers primarily for support volume, without a per-Product tax or paid per-agent pricing.
- Keep self-hosting viable without a dependency on the managed service, hosted billing or proprietary authentication.
- Publish the core under AGPLv3, subject to clearing any concrete third-party licensing blocker; keep proprietary theme code and assets out of the published repository.
- Prefer a polished core workflow over a broad feature catalogue.

## V1 boundary

V1 comprises Workspace and Admin/Agent access; multiple Products and domain-controlled widgets; a unified searchable inbox; anonymous live chat and email-based away replies; inbound and outbound Product support email; developer identify/context APIs; conversation status, notes, tags and saved replies; attachments; onboarding; hosted usage/billing; and a deployable self-hosted edition. The same core support features are available in either hosting mode. See [FRD.md](FRD.md) for behaviour and [architecture.md](architecture.md) for implementation direction.

## Journeys and proof

1. Create a Workspace and Product, configure a domain, embed the widget, send an anonymous message, then see and answer it in the inbox.
2. Add a second Product, receive messages for both, filter to either Product and return to all.
3. Send support email to a Product address, continue the correct Conversation, reply from the inbox and deliver the reply by email.
4. Set support to away, collect a reply address and continue the chat through email.
5. Attach application context and a file, then verify only authorised participants can see them.
6. Install the self-hosted edition from documented instructions and complete the same support flows.

V1 succeeds when these journeys work in a browser and cross-Workspace access attempts fail. Do not substitute a passing build for these outcomes.

## Later and outside scope

Later work may add diagnostics, richer branding and presence, assignment and priority, verified custom sending domains, accessibility hardening and more analytics. Knowledge bases, AI support agents, enterprise CRM/workflows, social/phone channels, enterprise SSO and a mail server are outside the initial release.

## Maintenance rule

This document owns the durable **why and scope**. Behavioural rules live in the FRD; technology choices in architecture and ADRs; current prices, vendors, dates, competitor details and task order elsewhere. Change a product decision here in the same PR that changes its behaviour.
