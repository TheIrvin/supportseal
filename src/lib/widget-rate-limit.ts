import type { NextRequest } from "next/server";

/**
 * Small in-process per-IP limiter for the public widget endpoints (abuse
 * control; the origin gate is a UX check, not a boundary — CodeRabbit
 * finding, widget.ts). Bounded map with periodic pruning; multi-process
 * deployments get per-process limits, which is acceptable for V1.
 */
const WINDOW_MS = 60_000;
const MAX_HITS = 60;
const hits = new Map<string, number[]>();

export function rateLimitWidgetIp(request: NextRequest): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}
