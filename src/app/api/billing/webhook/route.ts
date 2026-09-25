import { NextResponse, type NextRequest } from "next/server";

import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";
import { verifyStripeSignature, type StripeEvent } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook (hosted only): verifies the signature over the raw body,
 * then applies subscription lifecycle to the Workspace plan. Delivery
 * dedup is by event id on a bounded processed-set.
 */
const processed = new Set<string>();

export async function POST(request: NextRequest) {
  if (!isHostedMode()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature({ payload, header: signature, secret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  if (processed.has(event.id)) return NextResponse.json({ received: true });
  if (processed.size > 2000) processed.clear();
  processed.add(event.id);

  const workspaceId = event.data?.object?.metadata?.workspaceId;
  if (workspaceId) {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      if (event.data.object.status !== "unpaid" && event.data.object.status !== "canceled") {
        await prisma.workspace
          .update({ where: { id: workspaceId }, data: { plan: "PRO" } })
          .catch(() => undefined);
      }
    }
    if (
      event.type === "customer.subscription.deleted" ||
      (event.type === "customer.subscription.updated" && event.data.object.status === "canceled")
    ) {
      await prisma.workspace
        .update({ where: { id: workspaceId }, data: { plan: "FREE" } })
        .catch(() => undefined);
    }
  }

  return NextResponse.json({ received: true });
}
