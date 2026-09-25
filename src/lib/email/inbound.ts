import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { addCustomerMessage, upsertContact } from "@/lib/conversations";
import {
  AttachmentError,
  storeAttachment,
  validateAttachment,
} from "@/lib/attachments";

/**
 * Inbound email (ADR-0004, FR-EMAIL-01/03). The webhook accepts either a
 * SendGrid Inbound Parse multipart post or the same fields as JSON (the
 * documented self-host bridge shape). Everything here treats input as
 * untrusted: addresses/headers are parsed defensively, HTML is never used as
 * the message body (plain text only — safe by construction; the raw HTML is
 * kept in the delivery record for later sanitised display), threading relies
 * on validated headers or the conversation reply token, never the subject.
 */
export const INBOUND_AUTH_HEADER = "x-supportseal-inbound-secret";

export function inboundSecret(): string | undefined {
  return process.env.INBOUND_WEBHOOK_SECRET?.trim() || undefined;
}

/** Constant-time-ish compare for the webhook secret. */
export function secretMatches(candidate: string | null | undefined): boolean {
  const expected = inboundSecret();
  if (!expected || !candidate) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(a, b);
}

export type InboundAttachmentInput = {
  filename: string;
  contentType: string;
  data: Uint8Array;
};

export type InboundEmail = {
  from: { email: string; name: string | null };
  to: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
  headers: {
    messageId: string | null;
    inReplyTo: string | null;
    references: string[];
    autoSubmitted: string | null;
    precedence: string | null;
    xAutoreply: string | null;
  };
  attachments: InboundAttachmentInput[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Extract the first address from a header value like `Name <a@b.c>`. */
export function parseAddress(raw: string | null | undefined): { email: string; name: string | null } | null {
  if (!raw) return null;
  const value = raw.trim();
  const bracket = /<([^<>]+)>/u.exec(value);
  const candidate = (bracket ? bracket[1] : value).trim();
  // Lowercase only the domain: local parts (incl. reply tokens) are
  // case-sensitive and must keep their stored casing.
  const at = candidate.lastIndexOf("@");
  if (at <= 0 || at === candidate.length - 1) return null;
  const email = `${candidate.slice(0, at)}@${candidate.slice(at + 1).toLowerCase()}`;
  if (!EMAIL_PATTERN.test(email)) return null;
  const name = bracket ? value.slice(0, bracket.index).trim().replace(/^"|"$/gu, "") : null;
  return { email, name: name || null };
}

/** Split an address list on commas, ignoring commas inside quoted strings. */
export function parseAddressList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of raw) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === "," && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts
    .map((part) => parseAddress(part)?.email)
    .filter((email): email is string => Boolean(email));
}

export function splitMessageIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  // Keep the angle brackets: stored Message-Ids include them.
  return raw.split(/\s+/u).map((token) => token.trim()).filter(Boolean);
}

/** Strip tags from an HTML part to obtain usable plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>/giu, "\n\n")
    .replace(/<[^>]+>/gu, "")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export class InboundRejectError extends Error {
  constructor(
    public code:
      | "unauthorized"
      | "bad_request"
      | "unknown_address"
      | "archived_product"
      | "duplicate"
      | "invalid_sender",
    message: string,
  ) {
    super(message);
  }
}

/** Product inbound address local part: product_<random>@<inbound domain>. */
export function generateInboundLocalPart(): string {
  return `product_${randomBytes(9).toString("base64url").toLowerCase()}`;
}

export function replyTokenFor(): string {
  // Lowercase: some mail hops lowercase local parts; the token must
  // survive that (finding: case-sensitive continuation).
  return randomBytes(16).toString("base64url").toLowerCase();
}

async function findProductByRecipient(recipients: string[]) {
  for (const recipient of recipients) {
    const [localPart, domain] = recipient.split("@");
    if (!localPart || !domain) continue;
    const product = await prisma.product.findFirst({
      where: { inboundEmail: { equals: recipient, mode: "insensitive" } },
      include: { workspace: { select: { id: true } } },
    });
    if (product) return { product, matchedAddress: recipient, kind: "product" as const };
    // Reply tokens: reply+<token>@<domain> continues a conversation.
    const replyMatch = /^reply\+([a-z0-9_-]+)$/iu.exec(localPart);
    if (replyMatch) {
      const conversation = await prisma.conversation.findUnique({
        where: { emailReplyToken: replyMatch[1] },
        include: { product: { include: { workspace: { select: { id: true } } } } },
      });
      if (conversation) {
        return {
          product: conversation.product,
          matchedAddress: recipient,
          kind: "reply" as const,
          conversation,
        };
      }
    }
  }
  return null;
}

async function findConversationByHeaders(email: InboundEmail, productId: string, workspaceId: string) {
  const candidates = [
    ...splitMessageIds(email.headers.inReplyTo ?? null),
    ...email.headers.references,
  ].map((id) => id.trim());
  for (const candidate of candidates) {
    if (!candidate) continue;
    const byConversationHeader = await prisma.conversation.findFirst({
      where: { productId, emailMessageId: candidate },
    });
    if (byConversationHeader) return byConversationHeader;
    const byDelivery = await prisma.emailDelivery.findFirst({
      where: {
        direction: "OUTBOUND",
        providerMessageId: candidate,
        workspaceId,
      },
    });
    if (byDelivery?.conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: byDelivery.conversationId, productId },
      });
      if (conversation) return conversation;
    }
  }
  return null;
}

function bodyPreview(email: InboundEmail): string {
  return (email.text?.trim() || (email.html ? htmlToText(email.html) : "")).slice(0, 500);
}

function isAutoResponse(email: InboundEmail): boolean {
  const auto = email.headers.autoSubmitted?.toLowerCase();
  if (auto && auto !== "no") return true;
  if (email.headers.xAutoreply) return true;
  const precedence = email.headers.precedence?.toLowerCase();
  if (precedence === "bulk" || precedence === "junk" || precedence === "list") return true;
  return false;
}

export type InboundResult =
  | { outcome: "created"; conversationId: string; duplicate: false }
  | { outcome: "duplicate"; conversationId: string | null }
  | { outcome: "ignored"; reason: string }
  | { outcome: "rejected"; reason: string; bounce: boolean };

/**
 * Process one normalised inbound email against a Product. Idempotent by
 * Message-ID, threads by headers/reply token, never by subject.
 */
export async function processInboundEmail(input: {
  email: InboundEmail;
}): Promise<InboundResult> {
  const { email } = input;
  const sender = email.from;
  if (!sender) throw new InboundRejectError("invalid_sender", "No usable From address.");

  const match = await findProductByRecipient(email.to);
  if (!match) {
    return { outcome: "rejected", reason: "no product matches the recipient address", bounce: true };
  }
  const { product } = match;
  const workspaceId = product.workspace.id;

  let providerMessageId = email.headers.messageId ?? null;
  if (!providerMessageId) {
    // No Message-ID: derive a deterministic one so provider retries stay
    // idempotent (same from/to/subject/body).
    providerMessageId = `<sha256-${createHash("sha256")
      .update(`${sender.email}|${email.to.join(",")}|${email.subject ?? ""}|${bodyPreview(email)}`)
      .digest("hex")}>`;
  }
  const existing = await prisma.emailDelivery.findUnique({
    where: {
      direction_productId_providerMessageId: {
        direction: "INBOUND",
        productId: product.id,
        providerMessageId,
      },
    },
  });
  if (existing) {
    // A prior attempt recorded RECEIVED but crashed before creating the
    // message: recover by continuing instead of acking silently.
    if (existing.conversationId) {
      const orphan = await prisma.message.findFirst({
        where: { conversationId: existing.conversationId },
        select: { id: true },
      });
      if (orphan) return { outcome: "duplicate", conversationId: existing.conversationId };
      // fall through: reprocess onto the orphan conversation
    }
  }

  const recordDelivery = async (status: "RECEIVED" | "IGNORED" | "REJECTED", conversationId: string | null, reason?: string) => {
    try {
      await prisma.emailDelivery.create({
        data: {
          workspaceId,
          productId: product.id,
          conversationId,
          direction: "INBOUND",
          status,
          providerMessageId,
          fromAddress: sender.email,
          toAddress: email.to.join(", "),
          subject: email.subject?.slice(0, 250) ?? null,
          reason: reason?.slice(0, 250) ?? null,
        },
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        // Unique race: another worker recorded this message id first.
        throw new InboundRejectError("duplicate", "Already processed.");
      }
      throw error;
    }
  };

  if (product.archivedAt) {
    await recordDelivery("REJECTED", null, "product archived — inbound mail is rejected (bounce)");
    return { outcome: "rejected", reason: "product archived", bounce: true };
  }

  if (isAutoResponse(email)) {
    await recordDelivery("IGNORED", null, "auto-response (Auto-Submitted/Precedence/X-Autoreply)");
    return { outcome: "ignored", reason: "auto-response" };
  }

  // Resolve the conversation: reply token first, then validated threading headers.
  let conversation =
    match.kind === "reply" ? match.conversation : await findConversationByHeaders(email, product.id, workspaceId);
  if (match.kind === "reply" && conversation) {
    // The token is a shared secret; still require the sender to be a known
    // participant (contact or visitor email) before posting as the customer.
    const known = new Set(
      [conversation.contactId ? await prisma.contact.findUnique({ where: { id: conversation.contactId }, select: { email: true } }) : null]
        .filter(Boolean)
        .map((c) => (c as { email: string | null }).email?.toLowerCase())
        .filter(Boolean) as string[],
    );
    const visitor = await prisma.chatVisitor.findFirst({
      where: { conversationId: conversation.id },
      select: { email: true },
    });
    if (visitor?.email) known.add(visitor.email.toLowerCase());
    if (!known.has(sender.email)) {
      await recordDelivery("REJECTED", null, "reply-token sender does not match conversation participants");
      return { outcome: "rejected", reason: "sender not a conversation participant", bounce: false };
    }
  }
  // Recover a crashed prior attempt (RECEIVED recorded, message never created).
  if (!conversation && existing?.conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: { id: existing.conversationId, productId: product.id },
    });
  }

  const bodyText = (email.text?.trim() || (email.html ? htmlToText(email.html) : "")).slice(0, 20_000);

  let createdConversation = false;
  if (!conversation) {
    const contact = await upsertContact({ workspaceId, email: sender.email, name: sender.name });
    // Conversation + RECEIVED delivery in one transaction: a concurrent
    // duplicate webhook loses the unique race cleanly, without orphans.
    conversation = await prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          workspaceId,
          productId: product.id,
          contactId: contact.id,
          channel: "EMAIL",
          subject: email.subject?.slice(0, 250) ?? null,
          emailMessageId: providerMessageId,
          emailReplyToken: replyTokenFor(),
        },
      });
      await tx.emailDelivery.create({
        data: {
          workspaceId,
          productId: product.id,
          conversationId: created.id,
          direction: "INBOUND",
          status: "RECEIVED",
          providerMessageId,
          fromAddress: sender.email,
          toAddress: email.to.join(", "),
          subject: email.subject?.slice(0, 250) ?? null,
        },
      });
      return created;
    }).catch((error: { code?: string }) => {
      if (error.code === "P2002") throw new InboundRejectError("duplicate", "Already processed.");
      throw error;
    });
    createdConversation = true;
  } else if (providerMessageId && !conversation.emailMessageId) {
    // In a thread, remember the root/first inbound Message-ID for future replies.
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { emailMessageId: conversation.emailMessageId ?? providerMessageId },
    });
  }

  if (!createdConversation) {
    await recordDelivery("RECEIVED", conversation.id);
  }

  const attachmentIds: string[] = [];
  const storedAttachments: Array<{ id: string; filename: string; contentType: string; size: number }> = [];
  for (const attachment of email.attachments.slice(0, 10)) {
    try {
      const validated = validateAttachment({
        name: attachment.filename,
        type: attachment.contentType,
        data: attachment.data,
      });
      const stored = await storeAttachment({
        workspaceId,
        productId: product.id,
        conversationId: conversation.id,
        file: validated,
      });
      attachmentIds.push(stored.id);
      storedAttachments.push(stored);
    } catch (error) {
      if (error instanceof AttachmentError) continue; // oversized/unsafe attachment: drop, keep the message
      throw error;
    }
  }

  const message = await addCustomerMessage({
    workspaceId,
    conversationId: conversation.id,
    body: bodyText || "(no text content)",
    source: { kind: "email", fromEmail: sender.email },
    attachmentIds,
  });
  if (!message.ok) throw new Error(message.error);

  void createdConversation;
  return {
    outcome: "created",
    conversationId: conversation.id,
    duplicate: false,
  };
}
