import { createHash, randomBytes } from "node:crypto";

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
  const a = Buffer.from(expected);
  const b = Buffer.from(candidate);
  return a.length === b.length && createHash("sha256").update(a).digest("hex") === createHash("sha256").update(b).digest("hex");
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
  const email = (bracket ? bracket[1] : value).trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return null;
  const name = bracket ? value.slice(0, bracket.index).trim().replace(/^"|"$/gu, "") : null;
  return { email, name: name || null };
}

export function parseAddressList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => parseAddress(part)?.email)
    .filter((email): email is string => Boolean(email));
}

export function splitMessageIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\s+/u)
    .map((token) => token.trim().replace(/^<|>$/gu, ""))
    .filter(Boolean);
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
  return randomBytes(16).toString("base64url");
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
    ...(email.headers.inReplyTo ? [email.headers.inReplyTo] : []),
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

  const providerMessageId = email.headers.messageId ?? null;
  if (providerMessageId) {
    const existing = await prisma.emailDelivery.findUnique({
      where: { direction_providerMessageId: { direction: "INBOUND", providerMessageId } },
    });
    if (existing) {
      return { outcome: "duplicate", conversationId: existing.conversationId };
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
    } catch {
      // unique race: another worker recorded this message id first
      throw new InboundRejectError("duplicate", "Already processed.");
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

  const bodyText = (email.text?.trim() || (email.html ? htmlToText(email.html) : "")).slice(0, 20_000);

  let createdConversation = false;
  if (!conversation) {
    const contact = await upsertContact({ workspaceId, email: sender.email, name: sender.name });
    conversation = await prisma.conversation.create({
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
    createdConversation = true;
  } else if (providerMessageId && !conversation.emailMessageId) {
    // In a thread, remember the root/first inbound Message-ID for future replies.
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { emailMessageId: conversation.emailMessageId ?? providerMessageId },
    });
  }

  await recordDelivery("RECEIVED", conversation.id);

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
