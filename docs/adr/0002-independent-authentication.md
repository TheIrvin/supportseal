# ADR 0002 — Independent authentication

Status: Accepted constraint; implementation library pending validation — tracked as [pietervw/supportseal#5](https://github.com/pietervw/supportseal/issues/5)
Date: 2026-09-25

## Decision

Use authentication and session storage that run entirely with the application and its database. Support email/password sign-in, reset and invitations for Admin/Agent access. Hosted mode uses the same core identity flow; optional external identity providers may be added without becoming a requirement. Authorisation always resolves Workspace membership and role server-side.

## Why

Several existing projects use Clerk, but this product promises a fully independent self-hosted installation. Requiring a proprietary hosted auth service would break that promise.

## Consequences

Choose a maintained self-hostable library after validating its current session and credential flows; implement password protection, reset-token expiry, invite acceptance, secure cookies and rate limiting. No auth-provider-specific IDs should define the Product or Conversation model.
