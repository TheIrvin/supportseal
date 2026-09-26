# ADR 0003 — Durable messages and event-stream delivery

Status: Accepted 2026-09-26 — validated by the two-process reverse-proxy spike; measurements, findings and the accepted follow-ups are recorded in [pietervw/supportseal#2](https://github.com/pietervw/supportseal/issues/2#issuecomment-5847092915)
Date: 2026-09-25

## Decision

Persist messages before notifying clients. Deliver server-to-client changes over SSE with resumable cursors; submit messages by normal HTTP request. Use database-backed event coordination initially, with a bounded polling fallback on disconnect. Do not add Redis by default.

## Why

Chat needs timely delivery and reconnection, but does not initially need bidirectional socket state or an extra service for self-hosting.

## Consequences

The spike proved ordered resume, at-least-once delivery (clients dedupe by message id), unbuffered SSE through stock reverse proxies via the existing `x-accel-buffering: no` header (proxies must not gzip `text/event-stream`), and two-process fan-out bounded by the database polls (2 s widget, 10 s inbox). Accepted follow-ups from the spike: seed the inbox poll baseline at connect, warn at boot when the database clock or session timezone is not UTC-aligned (external databases must run `timezone=UTC`), and document the proxy gzip constraint. PostgreSQL `LISTEN`/`NOTIFY` (~4 ms measured) remains the measured upgrade path if the poll bounds ever feel slow; polling stays the fallback either way.
