import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { subscribeToConversationEvents } from "@/lib/events";
import {
  isWidgetOriginAllowed,
  loadWidgetProduct,
  resolveVisitorSession,
  visitorCookieName,
} from "@/lib/widget";

export const dynamic = "force-dynamic";

const TICK_MS = 2000;
const HEARTBEAT_MS = 15_000;

/**
 * Visitor message stream (FR-CHAT-03, ADR-0003): durable writes first, then
 * SSE delivery with a resumable timestamp cursor (`?after=<ISO>`; the client
 * resends its newest message timestamp on reconnect, so reconnects neither
 * duplicate nor lose messages). Same-process events wake the stream
 * immediately; the interval tick re-checks the database, which also covers a
 * second app process (bounded polling fallback).
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const hostParam = request.nextUrl.searchParams.get("host");
  const product = await loadWidgetProduct(key);
  if (!product) return new Response("not found", { status: 404 });

  const allowed = isWidgetOriginAllowed({
    productDomains: product.domains,
    hostParam,
    referer: request.headers.get("referer"),
    serviceOrigin: request.nextUrl.origin,
    serviceIsProduction: process.env.NODE_ENV === "production",
  });
  if (!allowed) return new Response("forbidden", { status: 403 });

  const token = request.cookies.get(visitorCookieName(product.id))?.value;
  const visitor = await resolveVisitorSession(product, token);
  if (!visitor || !visitor.conversationId) {
    return new Response("no session", { status: 401 });
  }
  const conversationId = visitor.conversationId;

  const afterParam = request.nextUrl.searchParams.get("after");
  let lastSentAt = afterParam ? new Date(afterParam) : new Date();
  if (Number.isNaN(lastSentAt.getTime())) lastSentAt = new Date();
  const seenIds: string[] = [];

  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let checking = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      send("ready", { conversationId });
      const unsubscribe = subscribeToConversationEvents((event) => {
        if (event.conversationId === conversationId) {
          // Low-latency wake for same-process writes; the tick covers the rest.
          void check();
        }
      });

      async function check() {
        if (closed || checking) return;
        checking = true;
        try {
          // >= plus a sent-id filter so messages sharing a millisecond with
          // the cursor are delivered, never duplicated.
          const candidates = await prisma.message.findMany({
            where: {
              conversationId,
              kind: { in: ["CUSTOMER", "AGENT"] },
              createdAt: { gte: lastSentAt },
            },
            orderBy: { createdAt: "asc" },
            take: 100,
          });
          const fresh = candidates.filter((m) => !seenIds.includes(m.id));
          if (fresh.length > 0) {
            for (const m of fresh) {
              seenIds.push(m.id);
              if (seenIds.length > 500) seenIds.shift();
            }
            const newest = fresh[fresh.length - 1].createdAt;
            if (newest > lastSentAt) lastSentAt = newest;
            send(
              "messages",
              fresh.map((m) => ({
                id: m.id,
                kind: m.kind,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
              })),
            );
          }
        } catch {
          // transient DB error: the next tick retries
        } finally {
          checking = false;
        }
      }

      const tick = setInterval(() => void check(), TICK_MS);
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
        }
      }, HEARTBEAT_MS);

      cleanup = () => {
        closed = true;
        clearInterval(tick);
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      // Client went away without an abort signal.
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
