import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe REST access without the SDK dependency: checkout-session
 * creation and webhook signature verification (Stripe uses an HMAC-SHA256
 * over `${timestamp}.${payload}` with the endpoint secret).
 */
const STRIPE_API = "https://api.stripe.com";

export function stripeSecret(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

export type StripeCheckoutSession = { id: string; url: string };

export async function createCheckoutSession(input: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  workspaceId: string;
}): Promise<StripeCheckoutSession | { error: string }> {
  const key = stripeSecret();
  if (!key) return { error: "stripe-not-configured" };

  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "metadata[workspaceId]": input.workspaceId,
  });
  if (input.customerEmail) body.set("customer_email", input.customerEmail);

  const response = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await response.json().catch(() => null)) as { id?: string; url?: string; error?: { message?: string } } | null;
  if (!response.ok || !data?.id || !data.url) {
    return { error: data?.error?.message ?? "stripe-request-failed" };
  }
  return { id: data.id, url: data.url };
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: { metadata?: { workspaceId?: string }; subscription?: string; status?: string } };
};

/** Verify the Stripe-Signature header against the raw request body. */
export function verifyStripeSignature(input: {
  payload: string;
  header: string | null;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  if (!input.header) return false;
  const parts = Object.fromEntries(
    input.header.split(",").map((part) => part.split("=").map((s) => s.trim()) as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > (input.toleranceSeconds ?? 300)) return false;

  const expected = createHmac("sha256", input.secret).update(`${timestamp}.${input.payload}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
