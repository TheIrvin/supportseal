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
};

export function inboundDomain(): string {
  return process.env.INBOUND_EMAIL_DOMAIN?.trim() || new URL(appConfig.url).hostname;
}

export function managedSender(): string {
  const local = process.env.OUTBOUND_EMAIL_LOCAL?.trim() || "no-reply";
  return `${local}@${inboundDomain()}`;
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
}): Promise<SendResult> {
  const sender = `"${input.message.productName} Support" <${managedSender()}>`;
  const headers: Record<string, string> = {};
  if (input.message.replyToken) {
    headers["Reply-To"] = `reply+${input.message.replyToken}@${inboundDomain()}`;
  }
  if (input.message.inReplyToHeader) headers["In-Reply-To"] = input.message.inReplyToHeader;
  if (input.message.referencesHeader) headers["References"] = input.message.referencesHeader;

  const transport = getTransport();
  if (!transport) {
    // Dev / no-SMTP mode: record the send so the flow is auditable.
    await recordDelivery(input, null, "SENT", "no SMTP configured — recorded only");
    return { ok: true, providerMessageId: null, delivered: false };
  }

  try {
    const info = await transport.sendMail({
      from: sender,
      to: input.message.to,
      subject: input.message.subject,
      text: input.message.text,
      headers,
    });
    await recordDelivery(input, info.messageId ?? null, "SENT");
    return { ok: true, providerMessageId: info.messageId ?? null, delivered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "send failed";
    await recordDelivery(input, null, "FAILED", reason);
    return { ok: false, error: reason };
  }
}

async function recordDelivery(
  input: { workspaceId: string; productId: string; conversationId: string; agentMessageId: string },
  providerMessageId: string | null,
  status: "SENT" | "FAILED",
  reason?: string,
): Promise<void> {
  await prisma.emailDelivery.create({
    data: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      conversationId: input.conversationId,
      direction: "OUTBOUND",
      status,
      providerMessageId,
      toAddress: null,
      reason: reason ?? null,
    },
  });
}

/** Default outbound subject for a conversation (re: threading, not matching). */
export function replySubject(subject: string | null, productName: string): string {
  const base = subject?.trim() || `${productName} support`;
  return /^re:/iu.test(base) ? base : `Re: ${base}`;
}
