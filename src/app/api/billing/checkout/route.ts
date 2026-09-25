import { NextResponse, type NextRequest } from "next/server";

import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";
import { createCheckoutSession, stripeSecret } from "@/lib/stripe";
import { getSessionUser } from "@/lib/session";
import { getPrimaryMembership } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/**
 * Hosted-only billing checkout (PR 15). Creates a Stripe Checkout session
 * for the Pro plan. Self-hosted mode has no billing at all (FR-HOST-01).
 */
export async function POST(request: NextRequest) {
  if (!isHostedMode()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const membership = await getPrimaryMembership(user.id);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID?.trim();
  if (!stripeSecret() || !priceId) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const session = await createCheckoutSession({
    priceId,
    successUrl: `${appConfig.url}/settings/billing?checkout=success`,
    cancelUrl: `${appConfig.url}/settings/billing?checkout=cancelled`,
    customerEmail: user.email,
    workspaceId: membership.workspaceId,
  });
  if ("error" in session) {
    return NextResponse.json({ error: session.error }, { status: 502 });
  }
  void prisma;
  return NextResponse.json({ url: session.url });
}
