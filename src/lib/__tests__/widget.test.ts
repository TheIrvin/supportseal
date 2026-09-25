import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { type WorkspaceContext } from "@/lib/workspace";
import { createProduct } from "@/lib/products";
import { addAgentMessage } from "@/lib/conversations";
import { getAvailabilityForProduct, setAvailabilityForTest } from "@/test/widget-helpers";
import {
  createVisitorSession,
  widgetRequestOriginOk,
  isOriginAllowed,
  loadWidgetProduct,
  resolveVisitorSession,
  setVisitorEmail,
  visitorListMessages,
  visitorSendMessage,
} from "@/lib/widget";

let db: TestDb;
let ctx: WorkspaceContext;
let productKey: string;
let productId: string;

beforeAll(async () => {
  db = await startTestDb();
});

afterAll(async () => {
  await stopTestDb(db);
});

beforeEach(async () => {
  await db.prisma.chatVisitor.deleteMany();
  await db.prisma.conversationTag.deleteMany();
  await db.prisma.message.deleteMany();
  await db.prisma.conversation.deleteMany();
  await db.prisma.contact.deleteMany();
  await db.prisma.productDomain.deleteMany();
  await db.prisma.product.deleteMany();
  await db.prisma.invite.deleteMany();
  await db.prisma.membership.deleteMany();
  await db.prisma.workspace.deleteMany();
  await db.prisma.user.deleteMany();

  const user = { id: `u_${Date.now()}`, name: "Founder", email: "founder@example.com" };
  await db.prisma.user.create({ data: { ...user, emailVerified: false } });
  const workspace = await db.prisma.workspace.create({ data: { name: "Acme" } });
  await db.prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "ADMIN" },
  });
  ctx = {
    user,
    workspace: { id: workspace.id, name: "Acme" },
    role: "ADMIN",
  };
  const product = await createProduct({
    ctx,
    name: "PM Toolkit",
    domains: ["app.pmtoolkit.dev", "*.pmtoolkit.dev"],
  });
  if (!product.ok) throw new Error(product.error);
  productKey = product.product.widgetPublicKey;
  productId = product.product.id;
});

describe("widgetRequestOriginOk (CSRF)", () => {
  it("allows absent Origin, the service origin, and rejects foreign/malformed", () => {
    expect(widgetRequestOriginOk(null, "https://support.example.com")).toBe(true);
    expect(widgetRequestOriginOk("https://support.example.com", "https://support.example.com")).toBe(true);
    expect(widgetRequestOriginOk("https://evil.example", "https://support.example.com")).toBe(false);
    expect(widgetRequestOriginOk("https://support.example.com.evil.io", "https://support.example.com")).toBe(false);
    expect(widgetRequestOriginOk("not a url", "https://support.example.com")).toBe(false);
  });
});

describe("isOriginAllowed", () => {
  const domains = ["app.example.com", "*.forms.dev"];

  it("matches exact hostnames and wildcard subdomains (not apex)", () => {
    expect(isOriginAllowed("app.example.com", domains, true)).toBe(true);
    expect(isOriginAllowed("evil-example.com", domains, true)).toBe(false);
    expect(isOriginAllowed("x.forms.dev", domains, true)).toBe(true);
    expect(isOriginAllowed("x.y.forms.dev", domains, true)).toBe(true);
    expect(isOriginAllowed("forms.dev", domains, true)).toBe(false);
    expect(isOriginAllowed("", domains, true)).toBe(false);
  });

  it("allows localhost while the service runs in development only", () => {
    expect(isOriginAllowed("localhost", [], false)).toBe(true);
    expect(isOriginAllowed("127.0.0.1", [], false)).toBe(true);
    expect(isOriginAllowed("localhost", [], true)).toBe(false);
  });
});

describe("widget sessions and messages", () => {
  it("resolves the product by public key only when active", async () => {
    const loaded = await loadWidgetProduct(productKey);
    expect(loaded?.name).toBe("PM Toolkit");
    expect(await loadWidgetProduct("pk_unknown")).toBeNull();
    expect(await loadWidgetProduct(productKey.replace("pk_", ""))).toBeNull();
  });

  it("creates a session, sends messages and resumes in the same browser", async () => {
    const product = (await loadWidgetProduct(productKey))!;
    const { token, session } = await createVisitorSession(product, "app.pmtoolkit.dev");

    const first = await visitorSendMessage({
      product,
      visitor: session,
      body: "Hi, how do I export a register?",
      pageUrl: "https://app.pmtoolkit.dev/reports",
    });
    expect(first.ok).toBe(true);

    const thread = await visitorListMessages({ product, visitor: session });
    expect(thread.messages.length).toBe(1);
    expect(thread.messages[0].kind).toBe("CUSTOMER");

    const conversation = await db.prisma.conversation.findFirstOrThrow();
    expect(conversation.channel).toBe("CHAT");
    expect(conversation.productId).toBe(productId);

    const visitorContext = await db.prisma.chatVisitor.findFirstOrThrow();
    expect((visitorContext.devContext as { pageUrl?: string })?.pageUrl).toBe(
      "https://app.pmtoolkit.dev/reports",
    );

    // resume with the token
    const resumed = await resolveVisitorSession(product, token);
    expect(resumed?.conversationId).toBe(conversation.id);
    const second = await visitorSendMessage({
      product,
      visitor: resumed!,
      body: "Also — does it include comments?",
    });
    expect(second.ok).toBe(true);
    const threadAfter = await visitorListMessages({ product, visitor: resumed! });
    expect(threadAfter.messages.length).toBe(2);

    // forged token: no session
    expect(await resolveVisitorSession(product, "not-the-token")).toBeNull();
    // token from another product: rejected
    const otherProduct = await createProduct({ ctx, name: "Other" });
    if (!otherProduct.ok) throw new Error(otherProduct.error);
    const otherLoaded = {
      ...otherProduct.product,
      workspaceId: ctx.workspace.id,
      domains: [],
    };
    expect(await resolveVisitorSession(otherLoaded, token)).toBeNull();
  });

  it("shows agent replies to the visitor and hides internal notes", async () => {
    const product = (await loadWidgetProduct(productKey))!;
    const { session } = await createVisitorSession(product, "app.pmtoolkit.dev");
    const sent = await visitorSendMessage({ product, visitor: session, body: "Hello?" });
    if (!sent.ok) throw new Error(sent.error);

    await addAgentMessage({ ctx, conversationId: sent.conversationId, body: "Hi! On it." });
    await addAgentMessage({
      ctx,
      conversationId: sent.conversationId,
      body: "internal: check plan",
      kind: "NOTE",
    });

    const thread = await visitorListMessages({ product, visitor: session });
    expect(thread.messages.map((m) => m.kind)).toEqual(["CUSTOMER", "AGENT"]);
  });

  it("reopens a closed conversation on the next visitor message (Pete, 2026-09-25)", async () => {
    const product = (await loadWidgetProduct(productKey))!;
    const { session } = await createVisitorSession(product, "app.pmtoolkit.dev");
    const sent = await visitorSendMessage({ product, visitor: session, body: "First" });
    if (!sent.ok) throw new Error(sent.error);
    await db.prisma.conversation.update({
      where: { id: sent.conversationId },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    const reopened = await visitorSendMessage({ product, visitor: session, body: "Still there?" });
    if (!reopened.ok) throw new Error(reopened.error);
    expect(reopened.conversationId).toBe(sent.conversationId);
    const count = await db.prisma.conversation.count();
    expect(count).toBe(1);
    const status = await db.prisma.conversation.findFirstOrThrow();
    expect(status.status).toBe("OPEN");
  });

  it("captures an email and links it to the conversation contact", async () => {
    const product = (await loadWidgetProduct(productKey))!;
    const { session } = await createVisitorSession(product, "app.pmtoolkit.dev");
    const sent = await visitorSendMessage({ product, visitor: session, body: "Need a reply" });
    if (!sent.ok) throw new Error(sent.error);

    const invalid = await setVisitorEmail({ visitor: session, email: "nope" });
    expect(invalid.ok).toBe(false);

    const saved = await setVisitorEmail({ visitor: session, email: "Jane@Example.com" });
    expect(saved.ok).toBe(true);
    const contact = await db.prisma.contact.findFirstOrThrow();
    expect(contact.email).toBe("jane@example.com");
  });

  it("availability is workspace-wide", async () => {
    expect(await getAvailabilityForProduct(ctx.workspace.id)).toBe("LIVE");
    await setAvailabilityForTest(db, ctx.workspace.id, "AWAY");
    expect(await getAvailabilityForProduct(ctx.workspace.id)).toBe("AWAY");
  });
});
