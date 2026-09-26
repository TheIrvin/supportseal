import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { getAuth } from "@/lib/auth";
import { GET as inboxStream } from "@/app/api/inbox/stream/route";

let db: TestDb;

// The inbox route resolves the session via next/headers, which has no
// request scope in direct route-invocation tests; feed it the test cookie.
const headerState = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(headerState.cookie ? { cookie: headerState.cookie } : {}),
}));

/**
 * Fake only the interval APIs: setImmediate and Date stay real so PGlite's
 * asynchronous I/O can settle between virtual clock advances.
 */
function useFakeIntervals() {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
  });
}

/** Yield real event-loop turns until the predicate holds (or deadline). */
async function flushUntil(pred: () => boolean, deadlineMs = 3000) {
  const start = Date.now();
  while (!pred() && Date.now() - start < deadlineMs) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function agentSessionCookie(db: TestDb, email: string): Promise<string> {
  const auth = await getAuth();
  await auth.api.signUpEmail({
    body: { name: "Inbox Agent", email, password: "correct-horse-inbox" },
    headers: new Headers({ origin: "http://localhost:3000" }),
  });
  // The session cookie carries a better-auth signature on top of the raw
  // token, so take it from the sign-in response instead of `signIn.token`.
  const signIn = (await auth.api.signInEmail({
    body: { email, password: "correct-horse-inbox" },
    headers: new Headers({ origin: "http://localhost:3000" }),
    asResponse: true,
  })) as unknown as Response;
  const setCookie = signIn.headers
    .getSetCookie()
    .find((c) => c.startsWith("better-auth.session_token"));
  expect(setCookie).toBeTruthy();
  return setCookie!.split(";")[0];
}

async function createWorkspace(db: TestDb, email: string) {
  const user = await db.prisma.user.findUniqueOrThrow({ where: { email } });
  const workspace = await db.prisma.workspace.create({
    data: { name: "Inbox Stream WS", memberships: { create: { userId: user.id, role: "ADMIN" } } },
  });
  const product = await db.prisma.product.create({
    data: { workspaceId: workspace.id, name: "Inbox Prod", widgetPublicKey: `pk_${email}` },
  });
  const contact = await db.prisma.contact.create({
    data: { workspaceId: workspace.id, email: null },
  });
  const conversation = await db.prisma.conversation.create({
    data: { workspaceId: workspace.id, productId: product.id, contactId: contact.id, channel: "CHAT" },
  });
  return { workspaceId: workspace.id, conversationId: conversation.id };
}

/**
 * Durable write the way the OTHER app process would make it: rows land in
 * the database without ever touching this process's event bus.
 */
async function foreignProcessWrite(db: TestDb, conversationId: string, body: string) {
  await db.prisma.message.create({ data: { conversationId, kind: "CUSTOMER", body } });
  await db.prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });
}

function openInboxStream() {
  const frames: string[] = [];
  const promise = inboxStream(
    (() => {
      const request = new NextRequest("http://localhost:3000/api/inbox/stream");
      return request;
    })(),
  ).then(async (response) => {
    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    (async () => {
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.value) frames.push(decoder.decode(chunk.value, { stream: true }));
          if (chunk.done) break;
        }
      } catch {
        // cancelled reader: collected frames stand
      }
    })();
    return { response, frames, reader };
  });
  return promise;
}

beforeAll(async () => {
  db = await startTestDb();
});

afterAll(async () => {
  await stopTestDb(db);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("agent inbox SSE stream (ADR-0003 cross-process wake)", () => {
  it("detects a write that lands between connect and the first db tick (baseline fix)", async () => {
    useFakeIntervals();
    const cookie = await agentSessionCookie(db, "inbox-baseline@example.com");
    headerState.cookie = cookie;
    const { conversationId } = await createWorkspace(db, "inbox-baseline@example.com");

    const stream = await openInboxStream();
    try {
      await flushUntil(() => stream.frames.some((f) => f.includes("event: ready")));

      // The other process writes 3s after this agent connected — before the
      // first 10s tick. With a null-baseline tick this write was swallowed.
      await foreignProcessWrite(db, conversationId, "cross-process message");

      await vi.advanceTimersByTimeAsync(10_000);
      await flushUntil(() => stream.frames.some((f) => f.includes("event: conversation")));

      const text = stream.frames.join("");
      expect(text).toContain("event: conversation");
      expect(text).toContain('"kind":"refresh"');
    } finally {
      await stream.reader.cancel();
    }
  });

  it("does not fire for writes that predate the connection", async () => {
    useFakeIntervals();
    const cookie = await agentSessionCookie(db, "inbox-preconnect@example.com");
    headerState.cookie = cookie;
    const { conversationId } = await createWorkspace(db, "inbox-preconnect@example.com");

    await foreignProcessWrite(db, conversationId, "before the agent connected");

    const stream = await openInboxStream();
    try {
      await flushUntil(() => stream.frames.some((f) => f.includes("event: ready")));
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(10_000);
      await new Promise((resolve) => setImmediate(resolve));

      const text = stream.frames.join("");
      expect(text).toContain("event: ready");
      expect(text).not.toContain("event: conversation");
    } finally {
      await stream.reader.cancel();
    }
  });
});
