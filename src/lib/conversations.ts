import { prisma } from "@/lib/prisma";
import type { WorkspaceContext } from "@/lib/workspace";

export type ConversationStatus = "OPEN" | "PENDING" | "CLOSED";
export type ConversationChannel = "CHAT" | "EMAIL";
export type MessageKind = "CUSTOMER" | "AGENT" | "NOTE";

const MAX_BODY_LENGTH = 20_000;

export type ConversationListItem = {
  id: string;
  status: ConversationStatus;
  channel: ConversationChannel;
  subject: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  product: { id: string; name: string; primaryColor: string };
  contact: { id: string; email: string | null; name: string | null };
  preview: string | null;
  messageCount: number;
  tags: { id: string; name: string }[];
};

/**
 * Create or update a Contact for a Workspace. Anonymous chat visitors start
 * without an email and can be enriched later (FR-CHAT-04).
 */
export async function upsertContact(input: {
  workspaceId: string;
  email?: string | null;
  name?: string | null;
}) {
  const email = input.email?.trim().toLowerCase() || null;
  const name = input.name?.trim() || null;

  if (!email) {
    return prisma.contact.create({ data: { workspaceId: input.workspaceId, name } });
  }
  return prisma.contact.upsert({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    create: { workspaceId: input.workspaceId, email, name },
    update: {
      name: name ?? undefined,
      email,
    },
  });
}

export async function createConversation(input: {
  workspaceId: string;
  productId: string;
  contactId: string;
  channel: ConversationChannel;
  subject?: string | null;
}): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const product = await prisma.product.findFirst({
    where: {
      id: input.productId,
      workspaceId: input.workspaceId,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, error: "Product not found in this Workspace." };
  }

  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      contactId: input.contactId,
      channel: input.channel,
      subject: input.subject?.trim() || null,
    },
  });
  return { ok: true, conversationId: conversation.id };
}

async function loadConversationForWorkspace(workspaceId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: {
      product: { select: { id: true, name: true, primaryColor: true } },
      contact: true,
      tags: { include: { tag: true } },
    },
  });
}

export type CustomerMessageSource =
  | { kind: "visitor"; visitorId: string }
  | { kind: "email"; fromEmail: string };

/** Append a customer-side message; reopens closed conversations. */
export async function addCustomerMessage(input: {
  workspaceId: string;
  conversationId: string;
  body: string;
  source: CustomerMessageSource;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = input.body.trim();
  if (!body || body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: "Message body is empty or too long." };
  }
  const conversation = await loadConversationForWorkspace(input.workspaceId, input.conversationId);
  if (!conversation) return { ok: false, error: "Conversation not found." };

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        kind: "CUSTOMER",
        body,
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        status: conversation.status === "CLOSED" ? "OPEN" : conversation.status,
        closedAt: conversation.status === "CLOSED" ? null : undefined,
      },
    });
  });
  return { ok: true };
}

/** Agent reply (agents + admins). Sets status PENDING awaiting the customer. */
export async function addAgentMessage(input: {
  ctx: WorkspaceContext;
  conversationId: string;
  body: string;
  kind?: "AGENT" | "NOTE";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = input.body.trim();
  if (!body || body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: "Message body is empty or too long." };
  }
  const kind = input.kind ?? "AGENT";
  const conversation = await loadConversationForWorkspace(
    input.ctx.workspace.id,
    input.conversationId,
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        kind,
        body,
        agentUserId: input.ctx.user.id,
      },
    });
    if (kind === "AGENT") {
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          status: conversation.status === "CLOSED" ? "PENDING" : "PENDING",
          closedAt: null,
          firstAgentReplyAt: conversation.firstAgentReplyAt ?? new Date(),
        },
      });
    }
  });
  return { ok: true };
}

export async function setConversationStatus(input: {
  ctx: WorkspaceContext;
  conversationId: string;
  status: ConversationStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const conversation = await loadConversationForWorkspace(
    input.ctx.workspace.id,
    input.conversationId,
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: input.status,
      closedAt: input.status === "CLOSED" ? new Date() : null,
    },
  });
  return { ok: true };
}

export type ListConversationsInput = {
  workspaceId: string;
  status?: ConversationStatus | "ALL";
  productId?: string;
  search?: string;
  limit?: number;
  cursor?: string | null;
};

export async function listConversations(
  input: ListConversationsInput,
): Promise<{ items: ConversationListItem[]; nextCursor: string | null }> {
  const limit = Math.min(input.limit ?? 50, 100);
  const search = input.search?.trim();

  const where = {
    workspaceId: input.workspaceId,
    ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            { contact: { email: { contains: search, mode: "insensitive" as const } } },
            { contact: { name: { contains: search, mode: "insensitive" as const } } },
            {
              messages: {
                some: { body: { contains: search, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      product: { select: { id: true, name: true, primaryColor: true } },
      contact: { select: { id: true, email: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        where: { kind: { in: ["CUSTOMER", "AGENT"] as MessageKind[] } },
        select: { body: true },
      },
      _count: { select: { messages: { where: { kind: { not: "NOTE" as MessageKind } } } } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: page.map((row) => ({
      id: row.id,
      status: row.status,
      channel: row.channel,
      subject: row.subject,
      lastMessageAt: row.lastMessageAt,
      createdAt: row.createdAt,
      product: row.product,
      contact: row.contact,
      preview: row.messages[0]?.body.slice(0, 140) ?? null,
      messageCount: row._count.messages,
      tags: row.tags.map((t) => t.tag),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function getConversationDetail(input: {
  workspaceId: string;
  conversationId: string;
}) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, workspaceId: input.workspaceId },
    include: {
      product: { select: { id: true, name: true, primaryColor: true } },
      contact: true,
      tags: { include: { tag: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!conversation) return null;
  return conversation;
}

// --- Tags -------------------------------------------------------------------

export async function listTags(workspaceId: string) {
  return prisma.tag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function ensureTag(input: {
  ctx: WorkspaceContext;
  name: string;
}): Promise<{ ok: true; tagId: string } | { ok: false; error: string }> {
  const name = input.name.trim().toLowerCase().slice(0, 40);
  if (!name) return { ok: false, error: "Tag name is required." };
  const tag = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: input.ctx.workspace.id, name } },
    create: { workspaceId: input.ctx.workspace.id, name },
    update: {},
  });
  return { ok: true, tagId: tag.id };
}

export async function tagConversation(input: {
  ctx: WorkspaceContext;
  conversationId: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ensured = await ensureTag({ ctx: input.ctx, name: input.name });
  if (!ensured.ok) return ensured;

  const conversation = await loadConversationForWorkspace(
    input.ctx.workspace.id,
    input.conversationId,
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  try {
    await prisma.conversationTag.create({
      data: { conversationId: conversation.id, tagId: ensured.tagId },
    });
  } catch {
    // already tagged — treat as success
  }
  return { ok: true };
}

export async function untagConversation(input: {
  ctx: WorkspaceContext;
  conversationId: string;
  tagId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const conversation = await loadConversationForWorkspace(
    input.ctx.workspace.id,
    input.conversationId,
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const removed = await prisma.conversationTag.deleteMany({
    where: { conversationId: conversation.id, tagId: input.tagId },
  });
  if (removed.count === 0) return { ok: false, error: "Tag not on this conversation." };
  return { ok: true };
}

// --- Contacts ----------------------------------------------------------------

export async function listContacts(workspaceId: string) {
  return prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}
