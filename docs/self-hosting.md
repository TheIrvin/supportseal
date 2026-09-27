# Self-hosting SupportSeal

SupportSeal is designed to be genuinely pleasant to self-host: one app
container, one PostgreSQL database, no external service requirements. A
self-hosted installation serves **exactly one Workspace** with unlimited
Products and agents (ADR-0001) and never requires Stripe, the hosted API or
external telemetry (Initial.md §17).

## Quick start

```bash
git clone https://github.com/pietervw/supportseal.git
cd supportseal
cp .env.example .env        # then edit (see the reference below)
docker compose up -d
```

`docker compose up` starts three services:

| Service  | What it does |
| -------- | ------------ |
| `db`     | PostgreSQL 17 with a persistent volume |
| `migrate`| One-shot `prisma migrate deploy` before the app boots |
| `app`    | The Next.js standalone build on port 3000 (health: `/api/health`) |

Open `http://<host>:3000`. On a fresh install the root page redirects to
`/register`; the first account becomes the Workspace Admin. Once the
Workspace exists, public registration closes automatically — further users
join by invitation from Settings → Team.

## Environment reference

Copy `.env.example` and fill in at least the required values:

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `DATABASE_URL` | yes | e.g. `postgresql://supportseal:pass@db:5432/supportseal`. If you point this at your own PostgreSQL instead of the compose `db` service, it must run with `timezone=UTC` (and a clock in sync with the app host) — the app logs a `[db-alignment]` error at boot otherwise, because message-stream cursors depend on it. |
| `BETTER_AUTH_SECRET` | yes | `openssl rand -base64 32`. Signs sessions **and** widget test tokens. |
| `NEXT_PUBLIC_APP_URL` | yes | Public origin, e.g. `https://support.example.com` (drives embed snippets, emails, auth). |
| `NEXT_PUBLIC_APP_NAME` | no | Brand name shown in the UI (defaults to SupportSeal). |
| `STORAGE_DIR` | no | Attachment storage directory (default `.dev-data/uploads`; mount a volume). |
| `INBOUND_WEBHOOK_SECRET` | for email | Shared secret for the inbound-mail webhook. Use a URL-safe value (`openssl rand -hex 32`) — the Postmark webhook URL embeds it. |
| `INBOUND_EMAIL_DOMAIN` | for email | Domain that receives forwarded support mail, e.g. `inbound.example.com`. |
| `POSTMARK_SERVER_TOKEN` | for email (either) | Server API token — outbound mail goes through the Postmark API. One outbound provider (`POSTMARK_SERVER_TOKEN` or `SMTP_URL`) is required to deliver replies; Postmark takes precedence when both are set. |
| `POSTMARK_MESSAGE_STREAM` | no | Postmark message stream ID (default `outbound`). |
| `SMTP_URL` | for email (either) | `smtps://user:pass@smtp.provider:465` — the SMTP alternative to `POSTMARK_SERVER_TOKEN`. Without an outbound provider, replies are recorded but not delivered. |
| `OUTBOUND_EMAIL_LOCAL` | no | Local part of the managed sender (default `no-reply`). |
| `HOSTED_MODE` | no | Leave unset for self-hosting. `1` enables multi-Workspace SaaS modules (billing). Never set this on a self-hosted install. |

Stripe variables are hosted-mode only and are never needed here.

## Email setup

1. In the app: Settings → Products → your Product → Email shows the
   generated inbound address (`product_xxx@your-inbound-domain`).
2. Forward `support@yourproduct.com` to that address with your mail provider.
3. Point your provider's webhook/forwarder at
   `https://<your-host>/api/email/inbound` with the header
   `x-supportseal-inbound-secret: <INBOUND_WEBHOOK_SECRET>` (or embed
   `?secret=` in the destination URL if headers are unavailable).
4. Configure an outbound provider — `SMTP_URL` (below) or a Postmark
   server token — so agent replies are delivered from
   `"{Product} Support" <no-reply@…>` with a reply-to that threads back into
   the same conversation.

### Postmark (first hosted provider, ADR-0004)

Postmark replaces steps 3 and 4 (webhook + outbound); mail to
`support@yourproduct.com` still needs step 2's forwarding to your Product's
inbound address (or point your product domain's MX at Postmark and use it
as `INBOUND_EMAIL_DOMAIN`):

- **Inbound**: add your inbound domain in Postmark — it must be the same
  domain as `INBOUND_EMAIL_DOMAIN` — and create the MX record Postmark
  shows you so mail for that domain routes to Postmark's inbound servers.
  Then set the inbound stream's webhook URL to
  `https://<any>:<INBOUND_WEBHOOK_SECRET>@<your-host>/api/email/inbound/postmark`.
  The secret is URL userinfo: use a URL-safe value (`openssl rand -hex 32`)
  or percent-encode it. Postmark cannot sign webhooks (its documented
  protection is HTTP Basic Auth embedded in the URL), and the route accepts
  the secret on either side of the credential — or as `?secret=` / the
  usual header. Postmark retries failed posts (10 attempts over hours);
  processing is idempotent by Message-ID, so retries never duplicate a
  conversation.
- **Outbound**: set `POSTMARK_SERVER_TOKEN` (and optionally
  `POSTMARK_MESSAGE_STREAM`). Sends go through the Postmark API from the
  same managed sender — register the `no-reply@…` (or `OUTBOUND_EMAIL_LOCAL`)
  address as a confirmed Postmark sender signature or verified domain.
  When both `POSTMARK_SERVER_TOKEN` and `SMTP_URL` are set, Postmark wins.

## HTTPS / reverse proxy

Terminate TLS in front of the app (Caddy, Traefik, nginx). Three requirements:

- **SSE must not be buffered** — the app already sends
  `X-Accel-Buffering: no`, which measured sufficient through a stock
  nginx config (no extra directives required); `proxy_buffering off;`
  and a raised `proxy_read_timeout` for `/api/` are harmless extra
  headroom.
- **Never gzip `text/event-stream`** — compressing the event stream at
  the proxy holds messages back even when buffering is disabled
  (measured in the ADR-0003 spike). Exclude `text/event-stream` from
  `gzip_types` (nginx) or the `encode` matcher (Caddy). The app's 15 s
  heartbeats keep idle streams alive past default 60 s proxy read
  timeouts on their own.
- Preserve the `Host` header and pass `X-Forwarded-For` (used by the
  widget's per-IP rate limiter).

## Backups

- **Database**: standard `pg_dump`/`pg_dumpall` on the `db` service (or a
  managed snapshot). This holds every Workspace, Product, conversation,
  message and the delivery ledger.
- **Attachments**: back up the volume mounted at `STORAGE_DIR` (or your
  S3-compatible bucket if you swap the storage adapter).

## Upgrades

```bash
git pull
docker compose build
docker compose run --rm migrate   # applies pending prisma migrations
docker compose up -d
```

The migrate step is idempotent. Check `GET /api/health` after upgrading.

## Security notes

- Keep `BETTER_AUTH_SECRET` and `INBOUND_WEBHOOK_SECRET` secret; rotate by
  setting a new value and restarting (sessions invalidate; widgets re-issue
  visitor cookies automatically).
- The widget key in the embed snippet is public by design — it only works on
  the domains you allowlisted for that Product.
- Registration closes itself once the Workspace exists; users join by
  invitation only.
- Attachments are validated (type-sniffed, size-capped) and served with
  `nosniff` + authorized access only.

## Uninstall

`docker compose down -v` removes containers, network and volumes (all data).
