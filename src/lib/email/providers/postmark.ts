import { randomUUID } from "node:crypto";

import type { OutboundPayload, OutboundTransport } from "@/lib/email/outbound";
import { parseAddress, splitMessageIds, type InboundEmail } from "@/lib/email/inbound";
import { ATTACHMENT_LIMITS } from "@/lib/attachments";

/**
 * Postmark adapter (ADR-0004 — first hosted provider, chosen in #4).
 * Outbound: the transactional /email API (X-Postmark-Server-Token). Inbound:
 * the parsed-JSON inbound webhook — Postmark retries non-200 deliveries up
 * to 10 times with growing intervals, so processing stays idempotent by
 * Message-ID (retry-safe parsing). Postmark does not sign webhooks; the
 * documented protection is HTTP Basic Auth embedded in the webhook URL
 * (or a secret in the URL), verified by the route against
 * INBOUND_WEBHOOK_SECRET.
 */

const POSTMARK_SEND_ENDPOINT = "https://api.postmarkapp.com/email";

type PostmarkSend = (payload: OutboundPayload) => Promise<{ messageId: string | null }>;

const globalForPostmark = globalThis as unknown as { __supportsealPostmarkSend?: PostmarkSend };

/** Test seam: inject a Postmark sender (or null to fall back to env config). */
export function setPostmarkSendForTest(send: PostmarkSend | null): void {
  globalForPostmark.__supportsealPostmarkSend = send ?? undefined;
}

/** Postmark /email API response body (subset). */
type PostmarkSendResponse = {
  MessageID?: string;
  ErrorCode?: number;
  Message?: string;
};

/** Domain of a `Name <local@domain>` sender address. */
function senderDomain(from: string): string {
  const at = from.lastIndexOf("@");
  return at >= 0 ? from.slice(at + 1).replace(/>$/u, "").trim() : "supportseal.invalid";
}

async function sendWithPostmark(token: string, payload: OutboundPayload): Promise<{ messageId: string | null }> {
  // Reply-To is a first-class API field on Postmark, not a custom header.
  const { "Reply-To": replyTo, ...headers } = payload.headers;
  // Postmark lets us set the RFC Message-ID via the Headers array; owning
  // it means the stored providerMessageId is exactly the id customers'
  // replies quote in In-Reply-To/References, so header threading works
  // (ADR-0004). The API's own MessageID GUID is only bounce correlation.
  let messageId: string | null = headers["Message-ID"] ?? null;
  if (!messageId) {
    messageId = `<${randomUUID()}@${senderDomain(payload.from)}>`;
    headers["Message-ID"] = messageId;
  }
  const body = {
    From: payload.from,
    To: payload.to,
    Subject: payload.subject,
    TextBody: payload.text,
    MessageStream: process.env.POSTMARK_MESSAGE_STREAM?.trim() || "outbound",
    ...(replyTo ? { ReplyTo: replyTo } : {}),
    ...(Object.keys(headers).length > 0
      ? { Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })) }
      : {}),
    ...(payload.attachments && payload.attachments.length > 0
      ? {
          Attachments: payload.attachments.map((a) => ({
            Name: a.filename,
            ContentType: a.contentType,
            Content: a.content.toString("base64"),
          })),
        }
      : {}),
  };
  const response = await fetch(POSTMARK_SEND_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await response.json().catch(() => null)) as PostmarkSendResponse | null;
  if (!response.ok || !data || data.ErrorCode !== 0) {
    throw new Error(
      `postmark send failed (${data?.ErrorCode ?? response.status}): ${data?.Message ?? response.statusText}`,
    );
  }
  return { messageId };
}

/**
 * Outbound transport backed by the Postmark API, or null when Postmark is
 * not configured (no token) and no test sender is injected.
 */
export function postmarkTransport(): OutboundTransport | null {
  const injected = globalForPostmark.__supportsealPostmarkSend;
  if (injected) return { send: injected };
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  if (!token) return null;
  return { send: (payload) => sendWithPostmark(token, payload) };
}

// ---------------------------------------------------------------------------
// Inbound webhook parsing (provider JSON → provider-neutral InboundEmail)
// ---------------------------------------------------------------------------

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Normalise a Postmark inbound-webhook JSON body into the provider-neutral
 * InboundEmail. Everything is untrusted: fields are validated piece by
 * piece and unusable values degrade to null; only a message without a
 * usable From address is rejected outright.
 */
export function parsePostmarkInbound(body: unknown): InboundEmail {
  if (!isObject(body)) throw new Error("invalid payload");

  const fromFull = isObject(body.FromFull) ? body.FromFull : {};
  const from = parseAddress(str(fromFull.Email)) ?? parseAddress(str(body.From));
  if (!from) throw new Error("invalid from");
  const fromName = str(fromFull.Name) ?? str(body.FromName);

  // Recipient candidates for Product/reply-token matching: envelope
  // recipient first, then parsed To (a Product may also be Cc'd).
  const recipients: string[] = [];
  const seen = new Set<string>();
  const addRecipient = (candidate: unknown) => {
    const source = typeof candidate === "string" ? candidate : isObject(candidate) ? str(candidate.Email) : null;
    const email = parseAddress(source)?.email;
    if (email && !seen.has(email)) {
      seen.add(email);
      recipients.push(email);
    }
  };
  addRecipient(body.OriginalRecipient);
  if (Array.isArray(body.ToFull)) for (const entry of body.ToFull) addRecipient(entry);
  if (Array.isArray(body.CcFull)) for (const entry of body.CcFull) addRecipient(entry);

  const headerMap = new Map<string, string>();
  if (Array.isArray(body.Headers)) {
    for (const entry of body.Headers) {
      if (!isObject(entry)) continue;
      const name = str(entry.Name);
      if (name) headerMap.set(name.toLowerCase(), str(entry.Value) ?? "");
    }
  }
  const header = (name: string) => headerMap.get(name) || null;

  // Prefer the RFC Message-ID header (angle-bracket form, consistent with
  // SMTP-derived threading); Postmark's MessageID GUID is the retry-stable
  // provider event id and a dedupe fallback when the header is missing.
  const messageId = header("message-id") ?? str(body.MessageID);

  const attachments: InboundEmail["attachments"] = [];
  if (Array.isArray(body.Attachments)) {
    for (const entry of body.Attachments) {
      if (attachments.length >= 10) break; // cap while collecting
      if (!isObject(entry)) continue;
      const content = str(entry.Content);
      if (!content) continue;
      // Skip oversized attachments before decoding. ContentLength is untrusted,
      // so a small declared length cannot force a decode of a huge body.
      // Padding is removed so an accurate length at the cap still decodes;
      // validateAttachment re-checks the decoded bytes downstream.
      const padding = content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0;
      const estimated = Math.floor((content.length * 3) / 4) - padding;
      const declared =
        typeof entry.ContentLength === "number" && entry.ContentLength >= 0
          ? entry.ContentLength
          : estimated;
      if (declared > ATTACHMENT_LIMITS.maxBytes || estimated > ATTACHMENT_LIMITS.maxBytes) continue;
      attachments.push({
        filename: str(entry.Name) ?? "attachment",
        contentType: str(entry.ContentType) ?? "application/octet-stream",
        data: new Uint8Array(Buffer.from(content, "base64")),
      });
    }
  }

  return {
    from: { email: from.email, name: from.name ?? fromName ?? null },
    to: recipients,
    subject: str(body.Subject),
    text: str(body.TextBody) ?? str(body.StrippedTextReply),
    html: str(body.HtmlBody),
    headers: {
      messageId,
      inReplyTo: header("in-reply-to"),
      references: splitMessageIds(header("references")),
      autoSubmitted: header("auto-submitted"),
      precedence: header("precedence"),
      xAutoreply: header("x-autoreply"),
    },
    attachments,
  };
}
