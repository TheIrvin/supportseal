import { NextResponse, type NextRequest } from "next/server";

import {
  getAvailabilityForProduct,
  isOriginAllowed,
  loadWidgetProduct,
  resolveEmbeddingHostname,
} from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * Public widget configuration (FR-CHAT-01). The key identifies the Product
 * and grants no privileged access; the embedding origin must be allowed.
 * Invalid key/origin returns 404 with no detail.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const hostParam = request.nextUrl.searchParams.get("host");
  const product = await loadWidgetProduct(key);
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const hostname = resolveEmbeddingHostname(request.headers, hostParam);
  const allowed = hostname !== null && isOriginAllowed(
    hostname,
    product.domains,
    process.env.NODE_ENV === "production",
  );
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
    { headers: { "cache-control": "no-store" } },
  );
}
