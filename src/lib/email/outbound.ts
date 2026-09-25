import nodemailer, { type Transporter } from "nodemailer";

import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";

/**
 * Outbound email (ADR-0004, FR-EMAIL-02/03). Replies go out via the managed
 * sender "{Product} Support <no-reply@…>" with a Reply-To that routes back to
 * the conversation's reply token, so customers stay in the thread. SMTP is
 * configured through SMTP_URL (self-hosters bring their own provider); with
 * no SMTP_URL every send is recorded but not delivered (dev mode).
 */
export type OutboundMessage = {
  to: string;
  subject: string;
  text: string;
  replyToken: string | null;
  productName: string;
  inReplyToHeader: string | null;
  referencesHeader: string | null;
  attachments?: Array<{ filename: string; contentType: string; content: Buffer }>;
};

export function inboundDomain(): string {
  return process.env.INBOUND_EMAIL_DOMAIN?.trim() || new URL(appConfig.url).hostname;
}

export function managedSender(): string {
  const local = process.env.OUTBOUND_EMAIL_LOCAL?.trim() || "no-reply";
  return `${local}@${inboundDomain()}`;
}

function joinReason(a?: string, b?: string): string | undefined {
  return [a, b].filter(Boolean).join("; ") || undefined;
}

/**
 * Sanitise a display name for a quoted RFC 5322 phrase. Address-structural
 * characters (quotes, angle brackets, commas, semicolons) are removed so the
 * value can never break out of the quoted phrase regardless of how any
 * intermediary parses it (From-header injection).
 */
function escapeDisplayName(name: string): string {
  // Allowlist: keep only characters that cannot form an address or break
  // the quoted phrase; everything else (including @) becomes a space.
  return (
    name
      .replace(/[^a-zA-Z0-9 .\-'&()\/+#!?*]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 60) || "Support"
  );
}

const globalForTransport = globalThis as unknown as { __supportsealTransport?: Transporter };

function getTransport(): Transporter | null {
  // Test-injected transport wins; otherwise SMTP_URL decides.
  if (globalForTransport.__supportsealTransport) return globalForTransport.__supportsealTransport;
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (!smtpUrl) return null;
  const transport = nodemailer.createTransport(smtpUrl);
  globalForTransport.__supportsealTransport = transport;
  return transport;
}

/** Test seam: inject a transport (or null to force record-only mode). */
export function setTransportForTest(transport: Transporter | null): void {
  globalForTransport.__supportsealTransport = transport ?? undefined;
}

export type SendResult =
  | { ok: true; providerMessageId: string | null; delivered: boolean }
  | { ok: false; error: string };

export async function sendReplyEmail(input: {
  workspaceId: string;
  productId: string;
  conversationId: string;
  agentMessageId: string;
  message: OutboundMessage;
  note?: string;
}): Promise<SendResult> {
  // Idempotency: one outbound delivery per agent message.
  const alreadySent = await prisma.emailDelivery.findUnique({
    where: { agentMessageId: input.agentMessageId },
  });
  if (alreadySent?.status === "SENT") {
    return { ok: true, providerMessageId: alreadySent.providerMessageId, delivered: true };
  }
  const sender = `"${escapeDisplayName(`${input.message.productName} Support`)}" <${managedSender()}>`;
  const headers: Record<string, string> = {};
  if (input.message.replyToken) {
    headers["Reply-To"] = `reply+${input.message.replyToken}@${inboundDomain()}`;
  }
  if (input.message.inReplyToHeader) headers["In-Reply-To"] = input.message.inReplyToHeader;
  if (input.message.referencesHeader) headers["References"] = input.message.referencesHeader;

  const transport = getTransport();
  if (!transport) {
    // Dev / no-SMTP mode: record the send so the flow is auditable.
    await recordDelivery(input, null, "SENT", joinReason("no SMTP configured — recorded only", input.note));
    return { ok: true, providerMessageId: null, delivered: false };
  }

  try {
    const info = await transport.sendMail({
      from: sender,
      to: input.message.to,
      subject: input.message.subject,
      text: input.message.text,
      headers,
      ...(input.message.attachments && input.message.attachments.length > 0
        ? {
            attachments: input.message.attachments.map((a) => ({
              filename: a.filename,
              contentType: a.contentType,
              content: a.content,
            })),
          }
        : {}),
    });
    try {
      await recordDelivery(input, info.messageId ?? null, "SENT", input.note, input.message.to);
    } catch {
      // The customer already has the mail; never report this as FAILED.
    }
    return { ok: true, providerMessageId: info.messageId ?? null, delivered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "send failed";
    await recordDelivery(input, null, "FAILED", reason, input.message.to).catch(() => undefined);
    return { ok: false, error: reason };
  }
}

async function recordDelivery(
  input: { workspaceId: string; productId: string; conversationId: string; agentMessageId: string },
  providerMessageId: string | null,
  status: "SENT" | "FAILED",
  reason?: string,
  toAddress?: string,
): Promise<void> {
  await prisma.emailDelivery.upsert({
    where: { agentMessageId: input.agentMessageId },
    create: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      conversationId: input.conversationId,
      direction: "OUTBOUND",
      status,
      providerMessageId,
      toAddress: toAddress ?? null,
      reason: reason ?? null,
      agentMessageId: input.agentMessageId,
    },
    update: { status, providerMessageId, reason: reason ?? null },
  });
}

/** Default outbound subject for a conversation (re: threading, not matching). */
export function replySubject(subject: string | null, productName: string): string {
  const base = subject?.trim() || `${productName} support`;
  return /^re:/iu.test(base) ? base : `Re: ${base}`;
}
