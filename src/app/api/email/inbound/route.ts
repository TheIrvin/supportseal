import { NextResponse, type NextRequest } from "next/server";

import {
  INBOUND_AUTH_HEADER,
  InboundRejectError,
  htmlToText,
  parseAddress,
  parseAddressList,
  processInboundEmail,
  secretMatches,
  splitMessageIds,
  type InboundEmail,
} from "@/lib/email/inbound";

export const dynamic = "force-dynamic";

/**
 * Inbound email webhook (ADR-0004). Accepts SendGrid Inbound Parse
 * multipart posts or the same fields as JSON (self-host bridge). Auth: the
 * shared secret via the x-supportseal-inbound-secret header or ?secret=
 * query parameter (SendGrid destination URLs can embed it). Duplicate
 * deliveries are idempotent; rejections never leak Product existence.
 */
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get(INBOUND_AUTH_HEADER) ?? request.nextUrl.searchParams.get("secret");
  if (!secretMatches(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let email: InboundEmail;
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      email = fromJsonBody(body);
    } else {
      email = await fromMultipart(request);
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await processInboundEmail({ email });
    // Acks are deliberately uniform so senders retry nothing.
    if (result.outcome === "created") {
      return NextResponse.json({ ok: true });
    }
    if (result.outcome === "duplicate") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (result.outcome === "ignored") {
      return NextResponse.json({ ok: true, ignored: true });
    }
    // rejected: acknowledge (200) so providers do not retry; the bounce
    // itself is sent by the outbound slice.
    return NextResponse.json({ ok: true, rejected: true });
  } catch (error) {
    if (error instanceof InboundRejectError) {
      const status = error.code === "duplicate" ? 200 : error.code === "unauthorized" ? 401 : 400;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseRawHeaders(value: string): Record<string, string> {
  // SendGrid can post headers as a JSON string, or folded RFC 822 text;
  // accept both so threading headers are never silently dropped.
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as Record<string, string>;
    } catch {
      return {};
    }
  }
  const map: Record<string, string> = {};
  let lastName: string | null = null;
  for (const line of trimmed.split(/\r?\n/u)) {
    if (/^\s/u.test(line) && lastName) {
      // folded continuation line
      map[lastName] = `${map[lastName]} ${line.trim()}`;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0) {
      lastName = line.slice(0, colon).trim();
      map[lastName] = line.slice(colon + 1).trim();
    }
  }
  return map;
}

function headersFromBody(body: Record<string, unknown>) {
  // SendGrid posts full headers under "headers" as an object or a JSON/RFC
  // 822 string; bridges may pass headers as top-level fields. Accept all.
  let raw: Record<string, unknown> = {};
  if (body.headers && typeof body.headers === "string") raw = parseRawHeaders(body.headers);
  else if (body.headers && typeof body.headers === "object") raw = body.headers as Record<string, unknown>;
  // Normalize keys once: header names arrive in any casing
  // (Message-Id, MESSAGE-ID, message-id…).
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) normalized[key.toLowerCase()] = value;
  const get = (...names: string[]) => {
    for (const name of names) {
      const value = normalized[name.toLowerCase()] ?? body[name];
      if (typeof value === "string" && value.trim()) return value;
    }
    return null;
  };
  return {
    messageId: get("Message-ID"),
    inReplyTo: get("In-Reply-To"),
    references: splitMessageIds(get("References")),
    autoSubmitted: get("Auto-Submitted"),
    precedence: get("Precedence"),
    xAutoreply: get("X-Autoreply"),
  };
}

function fromJsonBody(body: Record<string, unknown>): InboundEmail {
  const from = parseAddress(str(body.from));
  if (!from) throw new Error("invalid from");
  return {
    from,
    to: parseAddressList(str(body.to)),
    subject: str(body.subject),
    text: str(body.text),
    html: str(body.html),
    headers: headersFromBody(body),
    attachments: [],
  };
}

async function fromMultipart(request: NextRequest): Promise<InboundEmail> {
  const form = await request.formData();
  const get = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" && value.trim() ? value : null;
  };
  const from = parseAddress(get("from"));
  if (!from) throw new Error("invalid from");

  const attachments: InboundEmail["attachments"] = [];
  const MAX_FILES = 10;
  const pushFile = async (value: File, fallbackName: string) => {
    if (attachments.length >= MAX_FILES) return; // cap while collecting
    attachments.push({
      filename: value.name || fallbackName,
      contentType: value.type || "application/octet-stream",
      data: new Uint8Array(await value.arrayBuffer()),
    });
  };
  for (const value of form.getAll("attachments").values()) {
    if (value instanceof File && value.size > 0) await pushFile(value, "attachment");
  }
  // SendGrid also posts attachment info as attachment-info JSON + numbered
  // files (attachment1, attachment2, …) — collect those too.
  for (const [name, value] of form.entries()) {
    if (/^attachment\d+$/u.test(name) && value instanceof File && value.size > 0) {
      await pushFile(value, name);
    }
  }

  const envelopeRaw = get("envelope");
  let toList = parseAddressList(get("to"));
  if (envelopeRaw) {
    try {
      const envelope = JSON.parse(envelopeRaw) as { to?: string[] };
      const envelopeTo = (envelope.to ?? []).flatMap((entry) => parseAddressList(entry));
      if (envelopeTo.length > 0) toList = envelopeTo;
    } catch {
      // fall back to the to field
    }
  }

  const charsetsRaw = get("charsets");
  void charsetsRaw;
  const text = get("text");
  const html = get("html");
  void htmlToText;

  return {
    from,
    to: toList,
    subject: get("subject"),
    text,
    html,
    headers: headersFromBody(Object.fromEntries(form.entries()) as Record<string, unknown>),
    attachments,
  };
}
