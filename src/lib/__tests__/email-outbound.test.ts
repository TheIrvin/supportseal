import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

import { createTestUser, startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { setTransportForTest } from "@/lib/email/outbound";
import { decideReplyRouting, deliverAgentReplyIfRouted } from "@/lib/email/routing";
import { addAgentMessage, upsertContact } from "@/lib/conversations";
import { type WorkspaceContext } from "@/lib/workspace";
import { createProduct } from "@/lib/products";
import { replySubject } from "@/lib/email/outbound";

let db: TestDb;
let ctx: WorkspaceContext;
let productId: string;

type SentMail = Array<{ from: string; to: string; subject: string; text: string; headers: Record<string, string> }>;
let sent: SentMail = [];

// Capture transport: no network, records every sendMail invocation.
const captureTransport = {
  sendMail(options: { from: string; to: string; subject: string; text: string; headers?: Record<string, string> }) {
    sent.push({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      headers: options.headers ?? {},
    });
    return Promise.resolve({ messageId: "<out-1@managed>", response: "ok" });
  },
} as never;

beforeAll(async () => {
  db = await startTestDb();
  setTransportForTest(captureTransport);
});

afterAll(async () => {
  setTransportForTest(null);
  await stopTestDb(db);
});

beforeEach(async () => {
  sent = [];
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
  const product = await createProduct({ ctx, name: "Alpha SaaS" });
  if (!product.ok) throw new Error(product.error);
  productId = product.product.id;
});

describe("routing rule (D5)", () => {
  it("email-started always routes to email", async () => {
    expect(await decideReplyRouting({ channel: "EMAIL", visitorEmail: null, visitorLastSeenAt: null })).toBe("email");
  });

  it("chat routes to email only with a known address and a stale visitor", async () => {
    const now = new Date();
    expect(
      await decideReplyRouting({ channel: "CHAT", visitorEmail: "a@b.c", visitorLastSeenAt: now }),
    ).toBe("chat-only");
    expect(
      await decideReplyRouting({
        channel: "CHAT",
        visitorEmail: "a@b.c",
        visitorLastSeenAt: new Date(Date.now() - 120_000),
      }),
    ).toBe("email");
    expect(await decideReplyRouting({ channel: "CHAT", visitorEmail: null, visitorLastSeenAt: null })).toBe(
      "chat-only",
    );
  });
});

describe("deliverAgentReplyIfRouted", () => {
  async function seedConversation(channel: "CHAT" | "EMAIL", visitorEmail: string | null, stale: boolean) {
    const contact = await upsertContact({ workspaceId: ctx.workspace.id, email: visitorEmail });
    const conversation = await db.prisma.conversation.create({
      data: {
        workspaceId: ctx.workspace.id,
        productId,
        contactId: contact.id,
        channel,
        subject: "Invoice question",
        emailReplyToken: "reptoken123",
        emailMessageId: "<root@sender>",
      },
    });
    await db.prisma.chatVisitor.create({
      data: {
        productId,
        tokenHash: `hash-${Math.random()}`,
        email: visitorEmail,
        conversationId: conversation.id,
        lastSeenAt: new Date(Date.now() - (stale ? 300_000 : 5_000)),
      },
    });
    const sent = await addAgentMessage({
      ctx,
      conversationId: conversation.id,
      body: "We regenerated your invoice.",
    });
    if (!sent.ok) throw new Error(sent.error);
    return { conversation, messageId: sent.messageId };
  }

  it("sends email for email conversations with threading headers", async () => {
    const { conversation, messageId } = await seedConversation("EMAIL", "kim@northstar.io", true);
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.routed).toBe("email");
    expect(result.sent).toBe(true);
    expect(sent.length).toBe(1);
    const mail = sent[0];
    // Managed sender, never the agent's name (design D4).
    expect(mail.from).toContain("Alpha SaaS Support");
    expect(mail.from).toContain("<no-reply@");
    expect(mail.from).not.toContain("founder");
    // Threading + reply-token routing.
    expect(mail.headers["Reply-To"]).toContain("reply+reptoken123@");
    expect(mail.headers["In-Reply-To"]).toBe("<root@sender>");
    expect(mail.text).toContain("regenerated");

    const delivery = await db.prisma.emailDelivery.findFirstOrThrow({
      where: { direction: "OUTBOUND" },
    });
    expect(delivery.status).toBe("SENT");
    expect(delivery.conversationId).toBe(conversation.id);

    // Idempotent: a second delivery attempt for the same message is a no-op.
    await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(sent.length).toBe(1);
  });

  it("escapes hostile product names in the From header", async () => {
    await db.prisma.product.update({ where: { id: productId }, data: { name: 'Acme" <evil@attacker.com>, "Bob' } });
    const { conversation, messageId } = await seedConversation("EMAIL", "kim@northstar.io", true);
    await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(sent.length).toBe(1);
    // The display name must stay one quoted phrase; evil@ must not appear.
    expect(sent[0].from).not.toContain("evil@attacker.com");
    expect(sent[0].from).not.toContain("@attacker.com");
  });

  it("skips email for connected chat visitors", async () => {
    const { conversation, messageId } = await seedConversation("CHAT", "sam@x.dev", false);
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.routed).toBe("chat-only");
    expect(await db.prisma.emailDelivery.count()).toBe(0);
  });

  it("routes stale chat visitors with a known email to email", async () => {
    const { conversation, messageId } = await seedConversation("CHAT", "sam@x.dev", true);
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.routed).toBe("email");
    expect(result.sent).toBe(true);
    // First chat-to-email continuation mints the reply token (lowercase).
    expect(sent[0].headers["Reply-To"]).toMatch(/reply\+[a-z0-9_]+@/);
  });

  it("records failures without throwing", async () => {
    // Force a failure by pointing SMTP at an unroutable local port.
    const { setTransportForTest: swap } = await import("@/lib/email/outbound");
    const broken = nodemailer.createTransport({ port: 1, host: "127.0.0.1", connectionTimeout: 250 });
    swap(broken as never);
    void captureTransport;
    const { conversation, messageId } = await seedConversation("EMAIL", "kim@northstar.io", true);
    const result = await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: conversation.id,
      messageId,
    });
    expect(result.routed).toBe("email");
    expect(result.sent).toBe(false);
    expect(result.error).toBeTruthy();
    const delivery = await db.prisma.emailDelivery.findFirstOrThrow({ where: { direction: "OUTBOUND" } });
    expect(delivery.status).toBe("FAILED");
    swap(null);
  });
});

describe("replySubject", () => {
  it("prefixes once, preserving existing Re:", () => {
    expect(replySubject("Invoice question", "Alpha")).toBe("Re: Invoice question");
    expect(replySubject("Re: Invoice question", "Alpha")).toBe("Re: Invoice question");
    expect(replySubject(null, "Alpha")).toBe("Re: Alpha support");
  });
});

