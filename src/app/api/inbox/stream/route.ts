import type { NextRequest } from "next/server";

import { subscribeToConversationEvents } from "@/lib/events";
import { getPrimaryMembership } from "@/lib/workspace";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

/**
 * Workspace conversation stream for the agent inbox (FR-CHAT-03, ADR-0003):
 * emits `{conversationId, kind}` whenever a conversation in the caller's
 * Workspace changes (message/status). The client refetches on event — the
 * list stays correct even across processes thanks to the refetch.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const membership = await getPrimaryMembership(user.id);
  if (!membership) return new Response("forbidden", { status: 403 });
  const workspaceId = membership.workspaceId;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
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

      send("ready", { workspaceId });

      const unsubscribe = subscribeToConversationEvents((event) => {
        if (event.workspaceId === workspaceId) {
          send("conversation", { conversationId: event.conversationId, kind: event.kind });
        }
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
        }
      }, HEARTBEAT_MS);

      const cleanup = () => {
        closed = true;
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
