import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  createVisitorSession,
  getAvailabilityForProduct,
  isWidgetOriginAllowed,
  loadWidgetProduct,
  resolveVisitorSession,
  visitorListMessages,
} from "@/lib/widget";

export const dynamic = "force-dynamic";

function visitorCookieName(productId: string): string {
  return `ss_visitor_${productId.slice(0, 8)}`;
}

export async function POST(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const hostParam = request.nextUrl.searchParams.get("host");
  const product = await loadWidgetProduct(key);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const allowed = isWidgetOriginAllowed({
    productDomains: product.domains,
    hostParam,
    referer: request.headers.get("referer"),
    serviceOrigin: request.nextUrl.origin,
    serviceIsProduction: process.env.NODE_ENV === "production",
  });
  if (!allowed) return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });

  const existingToken = request.cookies.get(visitorCookieName(product.id))?.value;
  const existing = await resolveVisitorSession(product, existingToken);
  if (existing) {
    const thread = await visitorListMessages({ product, visitor: existing });
    const availability = await getAvailabilityForProduct(product.workspaceId);
    return NextResponse.json({
      session: { email: existing.email, name: existing.name },
      availability,
      thread,
    });
  }

  const { token } = await createVisitorSession(product);
  const availability = await getAvailabilityForProduct(product.workspaceId);
  const response = NextResponse.json({
    session: { email: null, name: null },
    availability,
    thread: { conversationId: null, messages: [], status: "OPEN" },
  });
  response.cookies.set(visitorCookieName(product.id), token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function GET(request: NextRequest) {
  // Session lookup for the panel (cookie auth; no key in query for reads).
  const productId = request.nextUrl.searchParams.get("product");
  if (!productId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const productRow = await prisma.product.findFirst({
    where: { id: productId },
    include: { domains: { select: { domain: true } } },
  });
  if (!productRow) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const product = {
    id: productRow.id,
    name: productRow.name,
    primaryColor: productRow.primaryColor,
    workspaceId: productRow.workspaceId,
    domains: productRow.domains.map((d) => d.domain),
  };

  const token = request.cookies.get(visitorCookieName(product.id))?.value;
  const session = await resolveVisitorSession(product, token);
  if (!session) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const availability = await getAvailabilityForProduct(product.workspaceId);
  const thread = await visitorListMessages({ product, visitor: session });
  return NextResponse.json({
    session: { email: session.email, name: session.name },
    availability,
    thread,
  });
}
