import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestUser, startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { prisma } from "@/lib/prisma";
import {
  computeChecklist,
  issueWidgetTestToken,
  resolveWizardState,
  verifyWidgetTestToken,
} from "@/lib/onboarding";

let db: TestDb;

beforeAll(async () => {
  db = await startTestDb();
});

afterAll(async () => {
  await stopTestDb(db);
});

beforeEach(async () => {
  await db.prisma.emailDelivery.deleteMany();
  await db.prisma.attachment.deleteMany();
  await db.prisma.chatVisitor.deleteMany();
  await db.prisma.message.deleteMany();
  await db.prisma.conversationTag.deleteMany();
  await db.prisma.tag.deleteMany();
  await db.prisma.conversation.deleteMany();
  await db.prisma.contact.deleteMany();
  await db.prisma.savedReply.deleteMany();
  await db.prisma.productDomain.deleteMany();
  await db.prisma.product.deleteMany();
  await db.prisma.invite.deleteMany();
  await db.prisma.membership.deleteMany();
  await db.prisma.workspace.deleteMany();
  await db.prisma.user.deleteMany();
});

describe("wizard state", () => {
  it("steps from workspace → product → domain → install from real data", () => {
    const ctx = { user: { id: "u", name: "U", email: "u@x.io" }, workspace: { id: "w", name: "W" }, role: "ADMIN" as const };
    expect(resolveWizardState(null, null, false).step).toBe(1);
    expect(resolveWizardState(ctx, null, false).step).toBe(2);
    expect(
      resolveWizardState(ctx, { id: "p", name: "P", primaryColor: "#2563eb", widgetPublicKey: "pk" }, false).step,
    ).toBe(3);
    expect(
      resolveWizardState(ctx, { id: "p", name: "P", primaryColor: "#2563eb", widgetPublicKey: "pk" }, true).step,
    ).toBe(4);
  });
});

describe("checklist derivation", () => {
  it("derives every item from real workspace data", async () => {
    const user = await createTestUser(db.prisma, { email: "founder@example.com" });
    const workspace = await db.prisma.workspace.create({
      data: { name: "Acme", memberships: { create: { userId: user.id, role: "ADMIN" } } },
    });
    const product = await prisma.product.create({
      data: { workspaceId: workspace.id, name: "Alpha", widgetPublicKey: "pk_ob1", domains: { create: { domain: "app.alpha.dev" } } },
    });

    let state = await computeChecklist(workspace.id);
    expect(state.items.find((i) => i.id === "install")?.done).toBe(true);
    expect(state.items.find((i) => i.id === "test-message")?.done).toBe(false);
    expect(state.doneCount).toBe(1);

    const contact = await prisma.contact.create({ data: { workspaceId: workspace.id, email: null } });
    const conversation = await prisma.conversation.create({
      data: { workspaceId: workspace.id, productId: product.id, contactId: contact.id, channel: "CHAT" },
    });
    await prisma.message.create({ data: { conversationId: conversation.id, kind: "CUSTOMER", body: "hi" } });

    state = await computeChecklist(workspace.id);
    expect(state.items.find((i) => i.id === "test-message")?.done).toBe(true);
    expect(state.items.find((i) => i.id === "reply")?.done).toBe(false);

    await prisma.message.create({ data: { conversationId: conversation.id, kind: "AGENT", body: "hello", agentUserId: user.id } });
    await prisma.emailDelivery.create({
      data: { workspaceId: workspace.id, productId: product.id, direction: "INBOUND", status: "RECEIVED", providerMessageId: "<m1>" },
    });
    await prisma.product.create({ data: { workspaceId: workspace.id, name: "Beta", widgetPublicKey: "pk_ob2" } });
    await prisma.invite.create({
      data: { workspaceId: workspace.id, email: "agent@example.com", role: "AGENT", token: "t".repeat(32), invitedById: user.id, expiresAt: new Date(Date.now() + 60000) },
    });

    state = await computeChecklist(workspace.id);
    expect(state.doneCount).toBe(state.total);
  });
});

describe("widget test tokens (design D8)", () => {
  beforeAll(() => {
    process.env.BETTER_AUTH_SECRET = "token-test-secret";
  });
  afterAll(() => {
    delete process.env.BETTER_AUTH_SECRET;
  });
  it("refuses to issue without a configured secret", async () => {
    const saved = process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.INBOUND_WEBHOOK_SECRET;
    const { issueWidgetTestToken: issue } = await import("@/lib/onboarding");
    const disabled = issue("prod-x");
    expect(disabled.token).toBe("");
    process.env.BETTER_AUTH_SECRET = saved;
  });
  it("round-trips for the issued product and expires", () => {
    const { token } = issueWidgetTestToken("prod-1");
    expect(verifyWidgetTestToken(token, "prod-1")).toBe(true);
    expect(verifyWidgetTestToken(token, "prod-2")).toBe(false);
    expect(verifyWidgetTestToken(`${token}x`, "prod-1")).toBe(false);
    expect(verifyWidgetTestToken(null, "prod-1")).toBe(false);
  });

  it("rejects expired tokens", async () => {
    process.env.BETTER_AUTH_SECRET = "fixed-secret-for-test";
    const { verifyWidgetTestToken: verify } = await import("@/lib/onboarding");
    const { issueWidgetTestToken: issue } = await import("@/lib/onboarding");
    // issue with a tiny TTL by faking expiry: craft directly
    const { createHmac } = await import("node:crypto");
    const payload = `prod-1|${Date.now() - 1000}`;
    const mac = createHmac("sha256", "fixed-secret-for-test").update(payload).digest("base64url");
    const token = `${Buffer.from(payload).toString("base64url")}.${mac}`;
    expect(verify(token, "prod-1")).toBe(false);
    const fresh = issue("prod-1");
    expect(verify(fresh.token, "prod-1")).toBe(true);
    delete process.env.BETTER_AUTH_SECRET;
  });
});
