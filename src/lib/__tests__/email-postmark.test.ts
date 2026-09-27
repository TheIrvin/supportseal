import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { createTestUser, startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { setTransportForTest, sendSystemEmail, type OutboundPayload } from "@/lib/email/outbound";
import {
  parsePostmarkInbound,
  postmarkTransport,
  setPostmarkSendForTest,
} from "@/lib/email/providers/postmark";
import { deliverAgentReplyIfRouted } from "@/lib/email/routing";
import { addAgentMessage, upsertContact } from "@/lib/conversations";
import { type WorkspaceContext } from "@/lib/workspace";
import { POST as postmarkInboundPost } from "@/app/api/email/inbound/postmark/route";

let db: TestDb;
let ctx: WorkspaceContext;
let productId: string;
let productInbound: string;

let sent: OutboundPayload[] = [];

const ENV_KEYS = ["POSTMARK_SERVER_TOKEN", "POSTMARK_MESSAGE_STREAM", "SMTP_URL", "INBOUND_WEBHOOK_SECRET"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.INBOUND_WEBHOOK_SECRET = "test-secret";
  delete process.env.POSTMARK_SERVER_TOKEN;
  delete process.env.POSTMARK_MESSAGE_STREAM;
  delete process.env.SMTP_URL;
  setTransportForTest(null);
  db = await startTestDb();
});

afterAll(async () => {
  setPostmarkSendForTest(null);
  setTransportForTest(null);
  vi.restoreAllMocks();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  await stopTestDb(db);
});

beforeEach(async () => {
  sent = [];
  setPostmarkSendForTest(null);
  delete process.env.POSTMARK_SERVER_TOKEN;
  delete process.env.POSTMARK_MESSAGE_STREAM;
  delete process.env.SMTP_URL;
  await db.prisma.emailDelivery.deleteMany();
  await db.prisma.attachment.deleteMany();
  await db.prisma.chatVisitor.deleteMany();
  await db.prisma.message.deleteMany();
  await db.prisma.conversationTag.deleteMany();
  await db.prisma.tag.deleteMany();
  await db.prisma.conversation.deleteMany();
  await db.prisma.contact.deleteMany();
  await db.prisma.productDomain.deleteMany();
  await db.prisma.product.deleteMany();
  await db.prisma.invite.deleteMany();
  await db.prisma.membership.deleteMany();
  await db.prisma.workspace.deleteMany();
  await db.prisma.user.deleteMany();

  const user = await createTestUser(db.prisma, { email: "founder@example.com" });
  const ws = await db.prisma.workspace.create({
    data: { name: "Acme", memberships: { create: { userId: user.id, role: "ADMIN" } } },
  });
  ctx = { user, workspace: { id: ws.id, name: "Acme" }, role: "ADMIN" };
  productInbound = "product_abc123@inbound.localhost";
  const product = await db.prisma.product.create({
    data: {
      workspaceId: ws.id,
      name: "Alpha SaaS",
      widgetPublicKey: "pk_postmarktest",
      inboundEmail: productInbound,
    },
  });
  productId = product.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonOk(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, statusText: "OK", json: async () => body } as Response;
}

/** Capture Postmark send seam (no network). */
function capturePostmark(messageId = "<pm-1@postmark>") {
  setPostmarkSendForTest(async (payload) => {
    sent.push(payload);
    return { messageId };
  });
}

// ---------------------------------------------------------------------------
// Outbound: Postmark API client (fetch mocked — no network, no real token)
// ---------------------------------------------------------------------------

describe("postmark API sender", () => {
  it("sends via /email with the server token and maps the neutral payload", async () => {
    process.env.POSTMARK_SERVER_TOKEN = "test-server-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonOk({ To: "kim@northstar.io", MessageID: "883953f4-6105-42a2-a16a-77a8eac79483", ErrorCode: 0, Message: "OK" }),
    );
    const transport = postmarkTransport();
    if (!transport) throw new Error("transport missing");

    const result = await transport.send({
      from: '"Alpha SaaS Support" <no-reply@inbound.localhost>',
      to: "kim@northstar.io",
      subject: "Re: Invoice question",
      text: "We regenerated your invoice.",
      headers: {
        "Reply-To": "reply+tok123@inbound.localhost",
        "In-Reply-To": "<root@sender>",
      },
      attachments: [{ filename: "invoice.png", contentType: "image/png", content: Buffer.from("png-bytes") }],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.postmarkapp.com/email");
    expect(init.method).toBe("POST");
    const requestHeaders = init.headers as Record<string, string>;
    expect(requestHeaders["X-Postmark-Server-Token"]).toBe("test-server-token");
    expect(requestHeaders["content-type"]).toBe("application/json");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.From).toBe('"Alpha SaaS Support" <no-reply@inbound.localhost>');
    expect(body.To).toBe("kim@northstar.io");
    expect(body.Subject).toBe("Re: Invoice question");
    expect(body.TextBody).toBe("We regenerated your invoice.");
    expect(body.MessageStream).toBe("outbound");
    // Reply-To is a first-class field, not a custom header.
    expect(body.ReplyTo).toBe("reply+tok123@inbound.localhost");
    // We own the RFC Message-ID so replies quote an id we can thread on;
    // the API GUID is only bounce correlation and is not the stored id.
    const sentHeaders = body.Headers as Array<{ Name: string; Value: string }>;
    expect(sentHeaders).toContainEqual({ Name: "In-Reply-To", Value: "<root@sender>" });
    const messageIdHeader = sentHeaders.find((h) => h.Name === "Message-ID");
    expect(messageIdHeader?.Value).toMatch(/^<[0-9a-f-]+@inbound\.localhost>$/u);
    expect(result.messageId).toBe(messageIdHeader?.Value);
    expect(body.Attachments).toEqual([
      { Name: "invoice.png", ContentType: "image/png", Content: Buffer.from("png-bytes").toString("base64") },
    ]);
  });

  it("uses POSTMARK_MESSAGE_STREAM when set", async () => {
    process.env.POSTMARK_SERVER_TOKEN = "test-server-token";
    process.env.POSTMARK_MESSAGE_STREAM = "broadcasts";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonOk({ MessageID: "m2", ErrorCode: 0, Message: "OK" }),
    );
    const transport = postmarkTransport();
    if (!transport) throw new Error("transport missing");
    await transport.send({ from: "a@b.c", to: "d@e.f", subject: "s", text: "t", headers: {} });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.MessageStream).toBe("broadcasts");
  });

  it("throws a descriptive error for API rejections (ErrorCode != 0) and HTTP failures", async () => {
    process.env.POSTMARK_SERVER_TOKEN = "test-server-token";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonOk({ ErrorCode: 406, Message: "You tried to send to a recipient that has been marked as inactive." }, 422),
    );
    const transport = postmarkTransport();
    if (!transport) throw new Error("transport missing");
    await expect(
      transport.send({ from: "a@b.c", to: "inactive@example.com", subject: "s", text: "t", headers: {} }),
    ).rejects.toThrow(/postmark send failed \(406\).*inactive/u);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonOk(null, 500));
    await expect(
      transport.send({ from: "a@b.c", to: "d@e.f", subject: "s", text: "t", headers: {} }),
    ).rejects.toThrow(/postmark send failed \(500\)/u);
  });

  it("returns null transport when no token is configured", () => {
    expect(postmarkTransport()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Outbound wiring: reply routing + system email through the Postmark seam
// ---------------------------------------------------------------------------

describe("outbound wiring (ADR-0004 boundary)", () => {
  let seedCount = 0;
  async function seedEmailConversation() {
    seedCount += 1;
    const replyToken = `reptoken${seedCount}`;
    const contact = await upsertContact({ workspaceId: ctx.workspace.id, email: "kim@northstar.io" });
    const conversation = await db.prisma.conversation.create({
      data: {
        workspaceId: ctx.workspace.id,
        productId,
        contactId: contact.id,
        channel: "EMAIL",
        subject: "Invoice question",
        emailReplyToken: replyToken,
        emailMessageId: "<root@sender>",
      },
    });
    const message = await addAgentMessage({
      ctx,
      conversationId: conversation.id,
      body: "We regenerated your invoice.",
    });
    if (!message.ok) throw new Error(message.error);
    return { conversation, messageId: message.messageId };
  }

  it("delivers agent replies through Postmark and records the provider MessageID", async () => {
    capturePostmark("pm-guid-1");
    const { conversation, messageId } = await seedEmailConversation();
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.routed).toBe("email");
    expect(result.sent).toBe(true);
    expect(sent.length).toBe(1);
    expect(sent[0].from).toContain("Alpha SaaS Support");
    expect(sent[0].from).toContain("<no-reply@");
    expect(sent[0].headers["Reply-To"]).toContain(`reply+reptoken${seedCount}@`);
    expect(sent[0].headers["In-Reply-To"]).toBe("<root@sender>");

    const delivery = await db.prisma.emailDelivery.findFirstOrThrow({ where: { direction: "OUTBOUND" } });
    expect(delivery.status).toBe("SENT");
    expect(delivery.providerMessageId).toBe("pm-guid-1");

    // Idempotent: a second delivery attempt never re-sends.
    await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(sent.length).toBe(1);
  });

  it("maps attachments to base64 Postmark payloads and keeps failures visible", async () => {
    const { setAttachmentStorageForTest } = await import("@/lib/attachment-storage");
    setAttachmentStorageForTest({
      put: async () => "test/key",
      get: async () => new Uint8Array(Buffer.from("png-bytes")),
      delete: async () => {},
    });
    const { conversation, messageId } = await seedEmailConversation();
    await db.prisma.attachment.create({
      data: {
        workspaceId: ctx.workspace.id,
        productId,
        conversationId: conversation.id,
        messageId,
        filename: "invoice.png",
        contentType: "image/png",
        size: 9,
        storageKey: `test/${conversation.id}/invoice.png`,
      },
    });

    capturePostmark();
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.sent).toBe(true);
    expect(sent[0].attachments?.[0]).toEqual({
      filename: "invoice.png",
      contentType: "image/png",
      content: Buffer.from("png-bytes"),
    });
    setAttachmentStorageForTest(null);

    // A provider failure is recorded as FAILED, never silently "sent".
    setPostmarkSendForTest(async () => {
      throw new Error("postmark send failed (406): inactive recipient");
    });
    const { conversation: c2, messageId: m2 } = await seedEmailConversation();
    const failed = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: c2.id,
      messageId: m2,
    });
    expect(failed.sent).toBe(false);
    expect(failed.error).toContain("406");
    const deliveries = await db.prisma.emailDelivery.findMany({ where: { direction: "OUTBOUND" } });
    expect(deliveries.some((d) => d.status === "FAILED" && d.reason?.includes("406"))).toBe(true);
  });

  it("prefers the Postmark API over SMTP when both are configured", async () => {
    process.env.POSTMARK_SERVER_TOKEN = "test-server-token";
    process.env.SMTP_URL = "smtps://user:pass@smtp.example.com:465";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonOk({ MessageID: "pm-guid-2", ErrorCode: 0, Message: "OK" }),
    );
    const { conversation, messageId } = await seedEmailConversation();
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const delivery = await db.prisma.emailDelivery.findFirstOrThrow({ where: { direction: "OUTBOUND" } });
    expect(delivery.providerMessageId).toMatch(/^<[0-9a-f-]+@/u); // our RFC Message-ID, not the API GUID
    delete process.env.SMTP_URL;
  });

  it("threads a customer reply by the Message-ID we set on outbound mail", async () => {
    // Real API path with a mocked fetch: capture the Message-ID we send.
    process.env.POSTMARK_SERVER_TOKEN = "test-server-token";
    let outboundMessageId: string | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        Headers?: Array<{ Name: string; Value: string }>;
      };
      outboundMessageId = body.Headers?.find((h) => h.Name === "Message-ID")?.Value ?? null;
      return jsonOk({ MessageID: "api-guid", ErrorCode: 0, Message: "OK" });
    });

    const { conversation, messageId } = await seedEmailConversation();
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.sent).toBe(true);
    expect(outboundMessageId).toMatch(/^<[0-9a-f-]+@/u);
    const delivery = await db.prisma.emailDelivery.findFirstOrThrow({ where: { direction: "OUTBOUND" } });
    expect(delivery.providerMessageId).toBe(outboundMessageId);

    // The customer replies to the product address (no reply token) quoting
    // our Message-ID in In-Reply-To: header threading joins the thread.
    const reply = await postPostmark(
      postmarkFixture({
        Subject: "Re: Invoice question",
        TextBody: "Thanks, got it.",
        Headers: [
          { Name: "Message-ID", Value: "<cust-reply@sender>" },
          { Name: "In-Reply-To", Value: outboundMessageId ?? "" },
        ],
      }),
      { secret: "test-secret" },
    );
    expect(reply.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(2);
  });

  it("sendSystemEmail goes through Postmark when configured and stays record-only otherwise", async () => {
    capturePostmark();
    const delivered = await sendSystemEmail({ to: "founder@example.com", subject: "Allowance", text: "You are near the limit." });
    expect(delivered).toEqual({ ok: true, delivered: true });
    expect(sent.length).toBe(1);
    expect(sent[0].to).toBe("founder@example.com");
    expect(sent[0].from).toContain("SupportSeal");
    expect(sent[0].from).toContain("<no-reply@");
    expect(sent[0].headers["Auto-Submitted"]).toBe("auto-generated");

    setPostmarkSendForTest(null);
    const recordOnly = await sendSystemEmail({ to: "founder@example.com", subject: "Allowance", text: "t" });
    expect(recordOnly).toEqual({ ok: true, delivered: false });

    setPostmarkSendForTest(async () => {
      throw new Error("boom");
    });
    const failed = await sendSystemEmail({ to: "founder@example.com", subject: "s", text: "t" });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error).toContain("boom");
  });
});

// ---------------------------------------------------------------------------
// Inbound: Postmark webhook JSON → provider-neutral InboundEmail
// ---------------------------------------------------------------------------

/** Postmark inbound webhook fixture (shape from the Postmark docs). */
function postmarkFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    FromName: "Sam Rivera",
    MessageStream: "inbound",
    From: "sam@fastmail.dev",
    FromFull: { Email: "sam@fastmail.dev", Name: "Sam Rivera", MailboxHash: "" },
    To: `"Alpha SaaS" <${productInbound}>`,
    ToFull: [{ Email: productInbound, Name: "Alpha SaaS", MailboxHash: "" }],
    Cc: '"Kim" <kim@northstar.io>',
    CcFull: [{ Email: "kim@northstar.io", Name: "Kim", MailboxHash: "" }],
    OriginalRecipient: productInbound,
    Subject: "Invoice question",
    MessageID: "883953f4-6105-42a2-a16a-77a8eac79483",
    TextBody: "Hi, my invoice PDF is missing the tax line.",
    HtmlBody: "<html><body><p>Hi, my invoice PDF is missing the tax line.</p></body></html>",
    StrippedTextReply: "Hi, my invoice PDF is missing the tax line.",
    Headers: [
      { Name: "Message-ID", Value: "<m1@sender>" },
      { Name: "X-Spam-Status", Value: "No" },
    ],
    Attachments: [],
    ...overrides,
  };
}

describe("parsePostmarkInbound", () => {
  it("maps the Postmark payload onto the neutral InboundEmail", () => {
    const email = parsePostmarkInbound(postmarkFixture());
    expect(email.from).toEqual({ email: "sam@fastmail.dev", name: "Sam Rivera" });
    expect(email.to[0]).toBe(productInbound);
    expect(email.to).toContain("kim@northstar.io"); // Cc'd addresses are candidates too
    expect(email.subject).toBe("Invoice question");
    expect(email.text).toBe("Hi, my invoice PDF is missing the tax line.");
    expect(email.html).toContain("<p>");
    expect(email.headers.messageId).toBe("<m1@sender>"); // RFC header wins over the GUID
    expect(email.attachments).toEqual([]);
  });

  it("falls back to the retry-stable Postmark MessageID when no Message-ID header exists", () => {
    const email = parsePostmarkInbound(postmarkFixture({ Headers: [{ Name: "X-Spam-Status", Value: "No" }] }));
    expect(email.headers.messageId).toBe("883953f4-6105-42a2-a16a-77a8eac79483");
  });

  it("uses StrippedTextReply when TextBody is empty and decodes attachments", () => {
    const email = parsePostmarkInbound(
      postmarkFixture({
        TextBody: "",
        Attachments: [
          {
            Name: "notes.txt",
            Content: Buffer.from("attachment contents").toString("base64"),
            ContentType: "text/plain",
            ContentLength: 21,
          },
        ],
      }),
    );
    expect(email.text).toBe("Hi, my invoice PDF is missing the tax line.");
    expect(email.attachments).toEqual([
      { filename: "notes.txt", contentType: "text/plain", data: new Uint8Array(Buffer.from("attachment contents")) },
    ]);
  });

  it("skips oversized attachments before decoding them", () => {
    const huge = "A".repeat(14_000_000);
    const email = parsePostmarkInbound(
      postmarkFixture({
        Attachments: [
          { Name: "huge.bin", Content: Buffer.from("x").toString("base64"), ContentType: "application/octet-stream", ContentLength: 50 * 1024 * 1024 },
          { Name: "no-length.bin", Content: huge, ContentType: "application/octet-stream" },
          { Name: "spoof.bin", Content: huge, ContentType: "application/octet-stream", ContentLength: 2 },
          {
            Name: "notes.txt",
            Content: Buffer.from("ok").toString("base64"),
            ContentType: "text/plain",
            ContentLength: 2,
          },
        ],
      }),
    );
    expect(email.attachments).toEqual([
      { filename: "notes.txt", contentType: "text/plain", data: new Uint8Array(Buffer.from("ok")) },
    ]);
  });

  it("rejects payloads without a usable From address and non-object bodies", () => {
    expect(() => parsePostmarkInbound({ ...postmarkFixture(), FromFull: {}, From: "not an address" })).toThrow();
    expect(() => parsePostmarkInbound("nope")).toThrow();
    expect(() => parsePostmarkInbound(null)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Inbound webhook route: auth + retry-safe processing
// ---------------------------------------------------------------------------

async function postPostmark(body: unknown, options: { auth?: string; secret?: string } = {}) {
  const url = new URL("http://localhost:3000/api/email/inbound/postmark");
  if (options.secret) url.searchParams.set("secret", options.secret);
  const request = new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.auth ? { authorization: options.auth } : {}),
    },
    body: JSON.stringify(body),
  });
  return postmarkInboundPost(request);
}

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

describe("postmark inbound webhook route", () => {
  it("accepts the secret on either side of the webhook URL's Basic Auth", async () => {
    const asPassword = await postPostmark(postmarkFixture(), { auth: basic("supportseal", "test-secret") });
    expect(asPassword.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(1);

    const asUsername = await postPostmark(
      postmarkFixture({ MessageID: "second-guid", Headers: [{ Name: "Message-ID", Value: "<second@sender>" }] }),
      { auth: basic("test-secret", "anything") },
    );
    expect(asUsername.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(2);

    // The auth scheme is case-insensitive per RFC 7235.
    const lowercaseScheme = await postPostmark(
      postmarkFixture({ MessageID: "lc-guid", Headers: [{ Name: "Message-ID", Value: "<lc@sender>" }] }),
      { auth: `basic ${Buffer.from("supportseal:test-secret").toString("base64")}` },
    );
    expect(lowercaseScheme.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(3);
  });

  it("accepts the shared-secret header and ?secret=, and rejects missing or wrong credentials", async () => {
    const viaQuery = await postPostmark(postmarkFixture(), { secret: "test-secret" });
    expect(viaQuery.status).toBe(200);

    const request = new NextRequest("http://localhost:3000/api/email/inbound/postmark", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-supportseal-inbound-secret": "test-secret",
      },
      body: JSON.stringify(
        postmarkFixture({ MessageID: "hdr-guid", Headers: [{ Name: "Message-ID", Value: "<hdr@sender>" }] }),
      ),
    });
    const headerResponse = await postmarkInboundPost(request);
    expect(headerResponse.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(2);

    // no auth at all -> unauthorized (Postmark would retry; we never process)
    const noAuth = await postPostmark(
      postmarkFixture({ MessageID: "anon-guid", Headers: [{ Name: "Message-ID", Value: "<anon@sender>" }] }),
    );
    expect(noAuth.status).toBe(401);
    expect(await db.prisma.conversation.count()).toBe(2);

    const wrongPassword = await postPostmark(
      postmarkFixture({ MessageID: "evil-guid", Headers: [{ Name: "Message-ID", Value: "<evil@sender>" }] }),
      { auth: basic("supportseal", "wrong-secret") },
    );
    expect(wrongPassword.status).toBe(401);
    expect(await db.prisma.conversation.count()).toBe(2);
  });

  it("is idempotent across Postmark webhook retries (same payload re-posted)", async () => {
    const body = postmarkFixture();
    const first = await postPostmark(body, { secret: "test-secret" });
    expect(first.status).toBe(200);
    const retry = await postPostmark(body, { secret: "test-secret" }); // Postmark retry: byte-identical
    expect(retry.status).toBe(200);
    const payload = (await retry.json()) as { duplicate?: boolean };
    expect(payload.duplicate).toBe(true);
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(1);
  });

  it("threads replies using the Headers array (In-Reply-To), never the subject", async () => {
    await postPostmark(postmarkFixture(), { secret: "test-secret" });
    const conversation = await db.prisma.conversation.findFirstOrThrow();

    const reply = await postPostmark(
      postmarkFixture({
        Subject: "Re: Invoice question",
        TextBody: "Following up on that invoice.",
        Headers: [
          { Name: "Message-ID", Value: "<reply@sender>" },
          { Name: "In-Reply-To", Value: "<m1@sender>" },
        ],
      }),
      { secret: "test-secret" },
    );
    expect(reply.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(2);
    const stillSame = await db.prisma.conversation.findFirstOrThrow();
    expect(stillSame.id).toBe(conversation.id);
  });

  it("stores text attachments delivered by Postmark and ignores auto-responses", async () => {
    const withAttachment = await postPostmark(
      postmarkFixture({
        MessageID: "att-guid",
        Headers: [{ Name: "Message-ID", Value: "<att@sender>" }],
        Attachments: [
          {
            Name: "notes.txt",
            Content: Buffer.from("attachment contents").toString("base64"),
            ContentType: "text/plain",
            ContentLength: 21,
          },
        ],
      }),
      { secret: "test-secret" },
    );
    expect(withAttachment.status).toBe(200);
    expect(await db.prisma.attachment.count()).toBe(1);
    const stored = await db.prisma.attachment.findFirstOrThrow();
    expect(stored.filename).toBe("notes.txt");

    const auto = await postPostmark(
      postmarkFixture({
        MessageID: "auto-guid",
        Headers: [
          { Name: "Message-ID", Value: "<auto@sender>" },
          { Name: "Auto-Submitted", Value: "auto-replied" },
        ],
      }),
      { secret: "test-secret" },
    );
    expect(auto.status).toBe(200);
    const payload = (await auto.json()) as { ignored?: boolean };
    expect(payload.ignored).toBe(true);
    expect(await db.prisma.conversation.count()).toBe(1); // only the attachment one
  });

  it("continues a conversation via the reply+token recipient address", async () => {
    await postPostmark(postmarkFixture(), { secret: "test-secret" });
    const conversation = await db.prisma.conversation.findFirstOrThrow();
    const continued = await postPostmark(
      postmarkFixture({
        MessageID: "cont-guid",
        To: `reply+${conversation.emailReplyToken}@inbound.localhost`,
        ToFull: [{ Email: `reply+${conversation.emailReplyToken}@inbound.localhost`, Name: "", MailboxHash: "" }],
        OriginalRecipient: `reply+${conversation.emailReplyToken}@inbound.localhost`,
        Headers: [{ Name: "Message-ID", Value: "<cont@sender>" }],
      }),
      { secret: "test-secret" },
    );
    expect(continued.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(2);
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const request = new NextRequest("http://localhost:3000/api/email/inbound/postmark?secret=test-secret", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: basic("u", "test-secret") },
      body: "not json{",
    });
    const response = await postmarkInboundPost(request);
    expect(response.status).toBe(400);
    expect(await db.prisma.conversation.count()).toBe(0);
  });
});
