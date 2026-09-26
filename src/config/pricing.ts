/**
 * Central pricing configuration (docs/design/marketing-site.md, "Pricing
 * configuration"). The single source of plan names, allowances and grace
 * values so the marketing pricing page and the in-app usage meter read the
 * same numbers. No dollar amounts live in page components (Initial.md §24).
 *
 * `PRICING_UNSET` marks launch decisions that have not been made yet
 * (pricing issue #6, docs/open-questions.md M2) and is deliberately distinct
 * from `null`, which means "unlimited" in plan limits. Unset values render
 * as a "TBD" badge in development and preview, and a hosted production
 * build fails while any value shown on the pricing page is unset
 * (`assertPricingCompleteForHostedProduction`).
 */

export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  monthlyConversations: number | null; // null = unlimited
  graceDays: number;
};

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthlyConversations: envInt("FREE_TIER_CONVERSATION_LIMIT", 100),
    graceDays: envInt("USAGE_GRACE_DAYS", 14),
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyConversations: null,
    graceDays: 0,
  },
};

/** Plan ids allowed in hosted checkout (self-hosted never bills). */
export function hostedPlans(): Plan[] {
  return [PLANS.free, PLANS.pro];
}

// --- Public pricing display values -----------------------------------------

/** Explicit marker for "not decided yet" — never `null` (that means unlimited). */
export const PRICING_UNSET = "__PRICING_UNSET__" as const;

export type MaybePricingValue<T> = T | typeof PRICING_UNSET;

export const pricingConfig = {
  currency: "USD" as const,
  hostedPro: {
    /**
     * Pro monthly subscription price in USD. Unset until Pete decides the
     * tier shape and numbers (issue #6, open-questions M2). Do not invent a
     * value here.
     */
    monthlyPriceUsd: PRICING_UNSET as MaybePricingValue<number>,
  },
  hostedFree: {
    /**
     * Free monthly Conversation allowance shown publicly. Unset until the
     * launch decision (issue #6, M2): `PLANS.free.monthlyConversations` is
     * the enforced allowance and its default (100) is an implementation
     * default, not a launch decision — wire the two together once decided.
     */
    monthlyConversations: PRICING_UNSET as MaybePricingValue<number>,
  },
  /** Grace period is enforced config (env USAGE_GRACE_DAYS), shown as-is. */
  graceDays: PLANS.free.graceDays,
} as const;

export function isPricingUnset(value: unknown): value is typeof PRICING_UNSET {
  return value === PRICING_UNSET;
}

/** Format an amount in the configured currency (Initial.md §23: USD). */
export function formatUsd(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricingConfig.currency,
  }).format(amountUsd);
}

/** Config paths of pricing values shown on the public page that are unset. */
export function unsetPricingValues(): string[] {
  const checks: Array<[string, MaybePricingValue<number>]> = [
    ["pricingConfig.hostedPro.monthlyPriceUsd", pricingConfig.hostedPro.monthlyPriceUsd],
    ["pricingConfig.hostedFree.monthlyConversations", pricingConfig.hostedFree.monthlyConversations],
  ];
  return checks.filter(([, value]) => isPricingUnset(value)).map(([path]) => path);
}

/**
 * A hosted production build must fail while any public pricing value is
 * unset, so "TBD" can never reach customers
 * (docs/design/marketing-site.md "Decisions and defaults").
 */
export function assertPricingCompleteForHostedProduction(): void {
  const unset = unsetPricingValues();
  if (unset.length > 0) {
    throw new Error(
      `Unset pricing values would render publicly: ${unset.join(", ")}. ` +
        "Set them in src/config/pricing.ts before building the hosted production site (issue #6).",
    );
  }
}
