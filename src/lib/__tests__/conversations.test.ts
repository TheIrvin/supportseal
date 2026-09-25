import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestUser, startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { createWorkspace, type WorkspaceContext } from "@/lib/workspace";
import { createProduct } from "@/lib/products";
import {
  addAgentMessage,
  addCustomerMessage,
  createConversation,
  getConversationDetail,
  listConversations,
  setConversationStatus,
  tagConversation,
  untagConversation,
  upsertContact,
} from "@/lib/conversations";

let db: TestDb;
let alpha: WorkspaceContext;
let beta: WorkspaceContext;
let alphaProductId: string;
let betaProductId: string;

beforeAll(async () => {
  db = await startTestDb();
});

afterAll(async () => {
  await stopTestDb(db);
});

beforeEach(async () => {
  await db.prisma.conversationTag.deleteMany();
  await db.prisma.tag.deleteMany();
  await db.prisma.message.deleteMany();
  await db.prisma.conversation.deleteMany();
  await db.prisma.contact.deleteMany();
  await db.prisma.productDomain.deleteMany();
  await db.prisma.product.deleteMany();
  await db.prisma.invite.deleteMany();
  await db.prisma.membership.deleteMany();
  await db.prisma.workspace.deleteMany();
  await db.prisma.user.deleteMany();

  const alphaUser = await createTestUser(db.prisma, { email: "alpha@example.com" });
  const betaUser = await createTestUser(db.prisma, { email: "beta@example.com" });
  process.env.HOSTED_MODE = "1";
  const alphaWs = await createWorkspace({ userId: alphaUser.id, name: "Alpha" });
  const betaWs = await createWorkspace({ userId: betaUser.id, name: "Beta" });
  process.env.HOSTED_MODE = "";
  if (!alphaWs.ok || !betaWs.ok) throw new Error("seed failed");

  alpha = {
    user: { id: alphaUser.id, name: "Alpha", email: "alpha@example.com" },
    workspace: { id: alphaWs.workspaceId, name: "Alpha" },
    role: "ADMIN",
  };
  beta = {
    user: { id: betaUser.id, name: "Beta", email: "beta@example.com" },
    workspace: { id: betaWs.workspaceId, name: "Beta" },
    role: "ADMIN",
  };

  const alphaProduct = await createProduct({ ctx: alpha, name: "Alpha SaaS" });
  const betaProduct = await createProduct({ ctx: beta, name: "Beta Tool" });
  if (!alphaProduct.ok || !betaProduct.ok) throw new Error("product seed failed");
  alphaProductId = alphaProduct.product.id;
  betaProductId = betaProduct.product.id;
});

async function seedConversation(
  ctx: WorkspaceContext,
  productId: string,
  input: { email?: string; body: string; channel?: "CHAT" | "EMAIL" },
) {
  const contact = await upsertContact({
    workspaceId: ctx.workspace.id,
    email: input.email ?? null,
  });
  const created = await createConversation({
    workspaceId: ctx.workspace.id,
    productId,
    contactId: contact.id,
    channel: input.channel ?? "CHAT",
  });
  if (!created.ok) throw new Error(created.error);
  const message = await addCustomerMessage({
    workspaceId: ctx.workspace.id,
    conversationId: created.conversationId,
    body: input.body,
    source: { kind: "visitor", visitorId: contact.id },
  });
  if (!message.ok) throw new Error(message.error);
  return created.conversationId;
}

describe("conversation lifecycle", () => {
  it("creates a conversation, appends messages and flips statuses", async () => {
    const conversationId = await seedConversation(alpha, alphaProductId, {
      email: "sam@example.com",
      body: "The export button does nothing on Safari.",
    });

    const reply = await addAgentMessage({
      ctx: alpha,
      conversationId,
      body: "Thanks for the report — which Safari version are you on?",
    });
    expect(reply.ok).toBe(true);

    const detail = await getConversationDetail({
      workspaceId: alpha.workspace.id,
      conversationId,
    });
    expect(detail?.messages.length).toBe(2);
    expect(detail?.messages[1].kind).toBe("AGENT");
    expect(detail?.messages[1].author?.name).toBe("alpha");
    expect(detail?.status).toBe("PENDING");
    expect(detail?.firstAgentReplyAt).not.toBeNull();

    const closed = await setConversationStatus({ ctx: alpha, conversationId, status: "CLOSED" });
    expect(closed.ok).toBe(true);
    expect(
      (await getConversationDetail({ workspaceId: alpha.workspace.id, conversationId }))?.status,
    ).toBe("CLOSED");

    const reopened = await addCustomerMessage({
      workspaceId: alpha.workspace.id,
      conversationId,
      body: "Version 18.2, still broken.",
      source: { kind: "visitor", visitorId: "x" },
    });
    expect(reopened.ok).toBe(true);
    const afterReopen = await getConversationDetail({
      workspaceId: alpha.workspace.id,
      conversationId,
    });
    expect(afterReopen?.status).toBe("OPEN");
    expect(afterReopen?.messages.length).toBe(3);
  });

  it("keeps internal notes invisible to the customer timeline", async () => {
    const conversationId = await seedConversation(alpha, alphaProductId, {
      body: "Refund please",
    });
    const note = await addAgentMessage({
      ctx: alpha,
      conversationId,
      body: "Checked stripe — refund issued last month, escalate if they insist.",
      kind: "NOTE",
    });
    expect(note.ok).toBe(true);

    const detail = await getConversationDetail({
      workspaceId: alpha.workspace.id,
      conversationId,
    });
    expect(detail?.messages.filter((m) => m.kind === "NOTE").length).toBe(1);
    expect(detail?.status).toBe("OPEN");
  });

  it("rejects cross-workspace access everywhere (FR-SEC-01)", async () => {
    const conversationId = await seedConversation(alpha, alphaProductId, {
      email: "sam@example.com",
      body: "Alpha question",
    });

    expect(
      await getConversationDetail({ workspaceId: beta.workspace.id, conversationId }),
    ).toBeNull();
    expect(
      (
        await addAgentMessage({ ctx: beta, conversationId, body: "intrusion" })
      ).ok,
    ).toBe(false);
    expect(
      (
        await addCustomerMessage({
          workspaceId: beta.workspace.id,
          conversationId,
          body: "intrusion",
          source: { kind: "visitor", visitorId: "x" },
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await setConversationStatus({ ctx: beta, conversationId, status: "CLOSED" })
      ).ok,
    ).toBe(false);
    expect((await tagConversation({ ctx: beta, conversationId, name: "steal" })).ok).toBe(false);

    const betaList = await listConversations({ workspaceId: beta.workspace.id });
    expect(betaList.items.length).toBe(0);
    const betaCreate = await createConversation({
      workspaceId: beta.workspace.id,
      productId: alphaProductId,
      contactId: "any",
      channel: "CHAT",
    });
    expect(betaCreate.ok).toBe(false);
  });

  it("lists, filters by product and searches within workspace only", async () => {
    const second = await createProduct({ ctx: alpha, name: "Alpha Analytics" });
    if (!second.ok) throw new Error(second.error);

    await seedConversation(alpha, alphaProductId, {
      email: "sam@example.com",
      body: "Login broken on app.alpha.dev",
    });
    await seedConversation(alpha, second.product.id, {
      email: "kim@example.com",
      body: "Dashboard chart missing data",
    });
    await seedConversation(beta, betaProductId, {
      email: "sam@example.com",
      body: "Login broken on app.alpha.dev",
    });

    const all = await listConversations({ workspaceId: alpha.workspace.id });
    expect(all.items.length).toBe(2);

    const onlySecond = await listConversations({
      workspaceId: alpha.workspace.id,
      productId: second.product.id,
    });
    expect(onlySecond.items.length).toBe(1);
    expect(onlySecond.items[0].product.name).toBe("Alpha Analytics");

    const search = await listConversations({
      workspaceId: alpha.workspace.id,
      search: "dashboard chart",
    });
    expect(search.items.length).toBe(1);

    const loginSearch = await listConversations({
      workspaceId: alpha.workspace.id,
      search: "login broken",
    });
    expect(loginSearch.items.length).toBe(1);
    expect(loginSearch.items[0].contact.email).toBe("sam@example.com");
  });

  it("tags conversations with workspace-scoped tag names", async () => {
    const conversationId = await seedConversation(alpha, alphaProductId, { body: "tag me" });

    expect((await tagConversation({ ctx: alpha, conversationId, name: "Billing" })).ok).toBe(true);
    expect((await tagConversation({ ctx: alpha, conversationId, name: "billing" })).ok).toBe(true);

    const detail = await getConversationDetail({
      workspaceId: alpha.workspace.id,
      conversationId,
    });
    expect(detail?.tags.length).toBe(1);
    expect(detail?.tags[0].tag.name).toBe("billing");

    const tagId = detail!.tags[0].tagId;
    expect((await untagConversation({ ctx: alpha, conversationId, tagId })).ok).toBe(true);
    expect(
      (
        await getConversationDetail({ workspaceId: alpha.workspace.id, conversationId })
      )?.tags.length,
    ).toBe(0);
  });

  it("merges contacts by email within one workspace", async () => {
    const c1 = await upsertContact({ workspaceId: alpha.workspace.id, email: "dup@example.com", name: "Dup" });
    const c2 = await upsertContact({ workspaceId: alpha.workspace.id, email: "DUP@example.com" });
    expect(c1.id).toBe(c2.id);

    const betaContact = await upsertContact({
      workspaceId: beta.workspace.id,
      email: "dup@example.com",
    });
    expect(betaContact.id).not.toBe(c1.id);
  });
});
