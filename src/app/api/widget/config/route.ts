import { NextResponse, type NextRequest } from "next/server";

import { getAvailabilityForProduct, isWidgetOriginAllowed, loadWidgetProduct } from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * Public widget configuration (FR-CHAT-01). CORS-open for the loader
 * (credentials are never needed here); the key identifies the Product and
 * grants no privileged access. Invalid key/origin returns an error with no
 * detail.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const hostParam = request.nextUrl.searchParams.get("host");
  const product = await loadWidgetProduct(key);
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const allowed = isWidgetOriginAllowed({
    productDomains: product.domains,
    hostParam,
    referer: request.headers.get("referer"),
    serviceOrigin: request.nextUrl.origin,
    serviceIsProduction: process.env.NODE_ENV === "production",
    testToken: request.nextUrl.searchParams.get("testToken"),
    productId: product.id,
  });
  if (!allowed) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const availability = await getAvailabilityForProduct(product.workspaceId);
  return NextResponse.json(
    {
      name: product.name,
      color: product.primaryColor,
      availability,
    },
    {
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET",
    },
  });
}
