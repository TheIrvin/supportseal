# Hosted deployment (SaaS tier)

Runbook for the managed multi-tenant deployment. Host decision ([issue #3],
2026-09-27): the existing **Coolify/Hetzner fleet** until paying customers
arrive, then a dedicated small Hetzner VPS via the documented
backup/restore migration. Self-hosting is documented separately in
[self-hosting.md](self-hosting.md); the same image runs both modes.

[issue #3]: https://github.com/pietervw/supportseal/issues/3

## Domain and host layout

Pete decided (2026-09-29, [open-questions.md §6]): the domain is
**supportseal.app** and everything runs on a **single origin** —
marketing, dashboard, widget, API and webhooks all on
`https://supportseal.app`. Rationale: one `NEXT_PUBLIC_APP_URL` already
drives metadata, embed snippets, auth and email links; a split
(`app.supportseal.app`) adds cookies/CORS/trusted-origins complexity for
no benefit now. `app.supportseal.app` stays reserved; a later split is an
environment-variable change, not a refactor. `supportseal.com` is
investor-held and not pursued.

## DNS (Cloudflare)

1. `A` record (and `AAAA` if the box has IPv6): `supportseal.app` → the
   fleet box's public IP (see the Coolify server entry).
2. Start **DNS-only** (grey cloud) so Coolify's Let's Encrypt/Traefik can
   issue the certificate via HTTP-01.
3. Cloudflare proxy (orange cloud) is optional afterwards. If enabled:
   SSL/TLS mode **Full (strict)**, and re-verify the SSE event stream
   (below) passes unbuffered through Cloudflare.

## Coolify app

The hosted tier deploys as a **Docker Compose resource** built from
`docker-compose.hosted.yml` (one-shot `migrate` + `app`; no bundled
Postgres — the Coolify `supportseal-db` resource provides it). The Cloud
API cannot create applications from private Git repositories, so the
resource is created once in the panel:

1. Project **SupportSeal** → New Resource → **Docker Compose** → GitHub →
   `pietervw/supportseal`, branch `main`, compose file
   `docker-compose.hosted.yml`.
2. Set the environment variables from the table below on the resource
   (resource env; `${VAR}` in the compose is substituted from them, which
   also covers the `NEXT_PUBLIC_*` build args).
3. On the `app` service, set the domain `https://supportseal.app`
   (Coolify's Traefik handles the Let's Encrypt certificate) and deploy.

Post-deploy, lifecycle (env updates, restarts, status) is manageable via
the Cloud API (`/api/v1/services/...`). Attachments persist in the
`supportseal-uploads` volume. **Backups from day one**: enable the
scheduled backup on `supportseal-db` (Coolify S3 backup or off-box cron
`pg_dump`).

## Environment (hosted mode)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://supportseal.app` |
| `HOSTED_MODE` | `1` |
| `DATABASE_URL` | internal Postgres URL (UTC) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (never reuse the dev value) |
| `INBOUND_WEBHOOK_SECRET` | `openssl rand -hex 32` (embedded in the Postmark webhook URL) |
| `INBOUND_EMAIL_DOMAIN` | the inbound mail domain chosen with Postmark ([issue #4]) |
| `POSTMARK_SERVER_TOKEN` | when email lands |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` | when billing lands |

[issue #4]: https://github.com/pietervw/supportseal/issues/4

better-auth `trustedOrigins` needs no domain-specific config: it trusts
`NEXT_PUBLIC_APP_URL` plus the request's own host (src/lib/auth.ts), so
`https://supportseal.app` is covered by the env var alone — the follow-up
tracked in [issue #23] is resolved by this deployment value.

[issue #23]: https://github.com/pietervw/supportseal/issues/23

## One-time checks (from the issue #3 decision)

- ~1–1.5 GB RAM headroom for the app on the shared box.
- SSE through Traefik: the `/api/events` stream must arrive unbuffered
  and uncompressed (heartbeats every 15 s; check `text/event-stream`
  responses are not gzipped).
- `/api/health` green after deploy; first signup flow works end to end.
- Boot log shows no `[db-alignment]` error (Postgres must be UTC —
  postgres:17-alpine default; verify on first boot).
- Postmark and Stripe webhook URLs (when configured) point at
  `https://supportseal.app/api/...` and are reachable (DNS-only or
  proxied — both pass webhooks).
