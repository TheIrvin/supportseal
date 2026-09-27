import { NextResponse, type NextRequest } from "next/server";

import {
  INBOUND_AUTH_HEADER,
  InboundRejectError,
  basicAuthSecretCandidates,
  processInboundEmail,
  secretMatches,
} from "@/lib/email/inbound";
import { parsePostmarkInbound } from "@/lib/email/providers/postmark";

export const dynamic = "force-dynamic";

/**
 * Postmark inbound webhook (ADR-0004). Postmark POSTs the fully parsed
 * email as JSON; this adapter normalises it to the provider-neutral
 * InboundEmail and reuses the shared intake pipeline. Postmark retries
 * non-200 responses (10 attempts, growing intervals), so processing is
 * idempotent by Message-ID. Postmark does not sign webhooks: the documented
 * protection is HTTP Basic Auth embedded in the webhook URL (either side
 * may carry the shared secret) — verified against INBOUND_WEBHOOK_SECRET —
 * or the shared secret via the usual header / ?secret= query.
 */
export async function POST(request: NextRequest) {
  const basicCandidates = basicAuthSecretCandidates(request.headers.get("authorization"));
  const authenticated =
    secretMatches(request.headers.get(INBOUND_AUTH_HEADER)) ||
    secretMatches(request.nextUrl.searchParams.get("secret")) ||
    basicCandidates.some((candidate) => secretMatches(candidate));
  if (!authenticated) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let email;
  try {
    email = parsePostmarkInbound(await request.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await processInboundEmail({ email });
    // Acks are deliberately uniform so Postmark retries nothing.
    if (result.outcome === "created") {
      return NextResponse.json({ ok: true });
    }
    if (result.outcome === "duplicate") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (result.outcome === "ignored") {
      return NextResponse.json({ ok: true, ignored: true });
    }
    // rejected: acknowledge (200) so Postmark does not retry; the bounce
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
