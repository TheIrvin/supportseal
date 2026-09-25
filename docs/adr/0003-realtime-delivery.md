# ADR 0003 — Durable messages and event-stream delivery

Status: Proposed; validate with two processes and a reverse proxy

## Decision

Persist messages before notifying clients. Deliver server-to-client changes over SSE with resumable cursors; submit messages by normal HTTP request. Use database-backed event coordination initially, with a bounded polling fallback on disconnect. Do not add Redis by default.

## Why

Chat needs timely delivery and reconnection, but does not initially need bidirectional socket state or an extra service for self-hosting.

## Consequences

Prove ordered resume, duplicates, reverse-proxy buffering behaviour and two-process fan-out. If the spike fails, amend this ADR before choosing an alternative.
