import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isWidgetOriginAllowed,
  loadWidgetProduct,
  resolveVisitorSession,
  setVisitorEmail,
  touchVisitor,
  visitorListMessages,
  visitorSendMessage,
} from "@/lib/widget";

export const dynamic = "force-dynamic";

const MIN_SEND_INTERVAL_MS = 800;

function visitorCookieName(productId: string): string {
  return `ss_visitor_${productId.slice(0, 8)}`;
}

async function guard(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const hostParam = request.nextUrl.searchParams.get("host");
  const product = await loadWidgetProduct(key);
  if (!product) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };

  const allowed = isWidgetOriginAllowed({
    productDomains: product.domains,
    hostParam,
    referer: request.headers.get("referer"),
    serviceOrigin: request.nextUrl.origin,
    serviceIsProduction: process.env.NODE_ENV === "production",
  });
  if (!allowed) return { error: NextResponse.json({ error: "origin_not_allowed" }, { status: 403 }) };

  const token = request.cookies.get(visitorCookieName(product.id))?.value;
  const visitor = await resolveVisitorSession(product, token);
  if (!visitor) return { error: NextResponse.json({ error: "no_session" }, { status: 401 }) };

  return { product, visitor };
}

/** Send a visitor message (rate limited per visitor). */
export async function POST(request: NextRequest) {
  const guarded = await guard(request);
  if ("error" in guarded) return guarded.error;
  const { product, visitor } = guarded;

  const last = await prisma.chatVisitor.findUnique({
    where: { id: visitor.visitorId },
    select: { lastSeenAt: true },
  });
  if (last && Date.now() - last.lastSeenAt.getTime() < MIN_SEND_INTERVAL_MS) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { body?: string; pageUrl?: string }
    | null;
  if (!payload?.body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const result = await visitorSendMessage({
    product,
    visitor,
    body: payload.body,
    pageUrl: payload.pageUrl ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const thread = await visitorListMessages({ product, visitor: { ...visitor, conversationId: result.conversationId } });
  return NextResponse.json({ thread });
}

/** Poll the thread (cursor-free V1 polling; SSE arrives with ADR-0003). */
export async function GET(request: NextRequest) {
  const guarded = await guard(request);
  if ("error" in guarded) return guarded.error;
  const { product, visitor } = guarded;
  const thread = await visitorListMessages({ product, visitor });
  return NextResponse.json({ thread }, { headers: { "cache-control": "no-store" } });
}

/** Email capture (away form and live-chat capture card, FR-CHAT-04). */
export async function PUT(request: NextRequest) {
  const guarded = await guard(request);
  if ("error" in guarded) return guarded.error;
  const { visitor } = guarded;

  const payload = (await request.json().catch(() => null)) as { email?: string } | null;
  if (!payload?.email) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const result = await setVisitorEmail({ visitor, email: payload.email });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await touchVisitor(visitor.visitorId);
  return NextResponse.json({ email: result.email });
}
