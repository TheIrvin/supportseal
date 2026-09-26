/**
 * Single source for plan names, prices, allowances, agent limits, grace days
 * and currency (docs/design/marketing-site.md). Marketing, the usage meter
 * and invite checks all read `PLANS`. Dollar amounts stay out of page
 * components (Initial.md §24).
 *
 * Decided (issues #6 and #15): Free $0 — 100 new Conversations/month, 1
 * agent; Pro $39 — 1,000 new Conversations/month, unlimited agents. Pro is
 * never advertised as unlimited Conversations. Grace is at least 30 days
 * (`USAGE_GRACE_DAYS` may only lengthen it).
 *
 * `PRICING_UNSET` marks a value that is not decided yet. It is distinct from
 * `null` (unlimited). A hosted production build fails while any value shown
 * on the pricing page is unset.
 */

export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly subscription price in USD (Initial.md §23). */
  priceUsd: number;
  monthlyConversations: number | null; // null = unlimited
  agents: number | null; // null = unlimited
  graceDays: number;
};

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MIN_GRACE_DAYS = 30;

/** Grace days. `USAGE_GRACE_DAYS` can lengthen the window, never shorten it. */
function configuredGraceDays(): number {
  return Math.max(MIN_GRACE_DAYS, envInt("USAGE_GRACE_DAYS", MIN_GRACE_DAYS));
}

const graceDays = configuredGraceDays();

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    monthlyConversations: envInt("FREE_TIER_CONVERSATION_LIMIT", 100),
    agents: 1,
    graceDays,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 39,
    monthlyConversations: envInt("PRO_TIER_CONVERSATION_LIMIT", 1000),
    agents: null,
    graceDays,
  },
};

/** Workspace.plan enum → shared plan. Missing or unknown plans are Free. */
export function planForWorkspace(plan: "FREE" | "PRO" | null | undefined): Plan {
  return PLANS[plan === "PRO" ? "pro" : "free"];
}

/** Allowance usage fraction at which admins are warned ("approaching"). */
export const ALLOWANCE_APPROACHING_THRESHOLD = 0.8;

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
    monthlyPriceUsd: PLANS.pro.priceUsd as MaybePricingValue<number>,
    monthlyConversations: PLANS.pro.monthlyConversations as MaybePricingValue<number>,
    agents: PLANS.pro.agents,
  },
  hostedFree: {
    monthlyConversations: PLANS.free.monthlyConversations as MaybePricingValue<number>,
    agents: PLANS.free.agents,
  },
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

/** Format an allowance/count for display ("1,000", "100"). */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** "1 agent", "2 agents", or "Unlimited agents". */
export function formatAgentLimit(agents: number | null): string {
  if (agents === null) return "Unlimited agents";
  return `${formatCount(agents)} ${agents === 1 ? "agent" : "agents"}`;
}

/** Config paths of pricing values shown on the public page that are unset. */
export function unsetPricingValues(): string[] {
  const checks: Array<[string, MaybePricingValue<number>]> = [
    ["pricingConfig.hostedPro.monthlyPriceUsd", pricingConfig.hostedPro.monthlyPriceUsd],
    ["pricingConfig.hostedPro.monthlyConversations", pricingConfig.hostedPro.monthlyConversations],
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
        "Set them in src/config/pricing.ts before building the hosted production site (issue #15).",
    );
  }
}
