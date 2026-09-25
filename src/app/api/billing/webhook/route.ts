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

  const object = event.data?.object ?? {};
  const workspaceId = object.metadata?.workspaceId;
  if (workspaceId) {
    let target: "PRO" | "FREE" | null = null;
    if (event.type === "checkout.session.completed") {
      // Only a PAID completion upgrades (delayed methods can complete a
      // session while payment is still unpaid).
      target = (object as { payment_status?: string }).payment_status === "paid" ? "PRO" : null;
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      target = object.status === "active" || object.status === "trialing" ? "PRO" : "FREE";
    } else if (event.type === "customer.subscription.deleted") {
      target = "FREE";
    }
    if (target) {
      // Let failures bubble (500) so Stripe retries — a charged customer
      // must never be silently stuck on the wrong plan. Mark the event
      // processed ONLY after the update succeeds.
      await prisma.workspace.update({ where: { id: workspaceId }, data: { plan: target } });
    }
  }

  if (processed.size > 2000) processed.clear();
  processed.add(event.id);

  return NextResponse.json({ received: true });
}
