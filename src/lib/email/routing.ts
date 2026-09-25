import { prisma } from "@/lib/prisma";
import { sendReplyEmail, replySubject } from "@/lib/email/outbound";

/**
 * Reply-channel routing (design default D5, FR-EMAIL-02):
 * - email-started conversation → email
 * - chat conversation with a known visitor email and the visitor no longer
 *   connected (no heartbeat within 60 s) → email as well, stored in the
 *   chat thread so the visitor sees it if they return
 * - chat conversation, visitor connected or no email → chat only
 */
export const VISITOR_CONNECTED_WINDOW_MS = 60_000;

export type RoutingDecision = "email" | "chat-only";

export async function decideReplyRouting(input: {
  channel: "CHAT" | "EMAIL";
  visitorEmail: string | null;
  visitorLastSeenAt: Date | null;
}): Promise<RoutingDecision> {
  if (input.channel === "EMAIL") return "email";
  if (!input.visitorEmail) return "chat-only";
  if (!input.visitorLastSeenAt) return "email";
  return Date.now() - input.visitorLastSeenAt.getTime() > VISITOR_CONNECTED_WINDOW_MS
    ? "email"
    : "chat-only";
}

/**
 * Deliver an agent reply by email when the routing decision says so. Called
 * after the message is durably stored; failures are recorded on the delivery
 * row (visible for follow-up) and never block the chat thread.
 */
export async function deliverAgentReplyIfRouted(input: {
  workspaceId: string;
  conversationId: string;
  messageId: string;
}): Promise<{ routed: RoutingDecision; sent: boolean; error?: string }> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, workspaceId: input.workspaceId },
    include: {
      product: { select: { id: true, name: true } },
      contact: { select: { email: true } },
      chatVisitors: { orderBy: { lastSeenAt: "desc" }, take: 1, select: { email: true, lastSeenAt: true } },
    },
  });
  if (!conversation) return { routed: "chat-only", sent: false, error: "conversation not found" };

  const visitor = conversation.chatVisitors[0] ?? null;
  const decision = await decideReplyRouting({
    channel: conversation.channel,
    visitorEmail: visitor?.email ?? conversation.contact.email,
    visitorLastSeenAt: visitor?.lastSeenAt ?? null,
  });
  if (decision === "chat-only") return { routed: decision, sent: false };

  const to = visitor?.email ?? conversation.contact.email;
  if (!to) return { routed: "chat-only", sent: false, error: "no email address" };

  const message = await prisma.message.findUnique({
    where: { id: input.messageId },
    select: { body: true },
  });
  if (!message) return { routed: decision, sent: false, error: "message not found" };

  if (!conversation.emailReplyToken) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { emailReplyToken: crypto.randomUUID().replace(/-/gu, "") },
    });
  }

  const lastOutbound = await prisma.emailDelivery.findFirst({
    where: { conversationId: conversation.id, direction: "OUTBOUND", status: "SENT" },
    orderBy: { createdAt: "desc" },
    select: { providerMessageId: true },
  });

  const result = await sendReplyEmail({
    workspaceId: input.workspaceId,
    productId: conversation.product.id,
    conversationId: conversation.id,
    agentMessageId: input.messageId,
    message: {
      to,
      subject: replySubject(conversation.subject, conversation.product.name),
      text: message.body,
      replyToken: conversation.emailReplyToken,
      productName: conversation.product.name,
      inReplyToHeader: conversation.emailMessageId ?? null,
      referencesHeader: [conversation.emailMessageId, lastOutbound?.providerMessageId]
        .filter((id): id is string => Boolean(id))
        .join(" ") || null,
    },
  });

  return { routed: decision, sent: result.ok, error: result.ok ? undefined : result.error };
}
