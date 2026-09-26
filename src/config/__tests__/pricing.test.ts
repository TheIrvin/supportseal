import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PLANS,
  PRICING_UNSET,
  assertPricingCompleteForHostedProduction,
  formatAgentLimit,
  formatCount,
  formatUsd,
  isPricingUnset,
  pricingConfig,
  unsetPricingValues,
} from "@/config/pricing";

describe("PLANS (single source shared with src/lib/usage.ts)", () => {
  const originalLimit = process.env.FREE_TIER_CONVERSATION_LIMIT;
  const originalProLimit = process.env.PRO_TIER_CONVERSATION_LIMIT;
  const originalGrace = process.env.USAGE_GRACE_DAYS;

  beforeEach(() => {
    delete process.env.FREE_TIER_CONVERSATION_LIMIT;
    delete process.env.PRO_TIER_CONVERSATION_LIMIT;
    delete process.env.USAGE_GRACE_DAYS;
  });

  afterEach(() => {
    if (originalLimit === undefined) delete process.env.FREE_TIER_CONVERSATION_LIMIT;
    else process.env.FREE_TIER_CONVERSATION_LIMIT = originalLimit;
    if (originalProLimit === undefined) delete process.env.PRO_TIER_CONVERSATION_LIMIT;
    else process.env.PRO_TIER_CONVERSATION_LIMIT = originalProLimit;
    if (originalGrace === undefined) delete process.env.USAGE_GRACE_DAYS;
    else process.env.USAGE_GRACE_DAYS = originalGrace;
  });

  it("ships the decided tier shape (issue #15: Free $0/100/1 agent, Pro $39/1000/unlimited agents)", () => {
    expect(PLANS.free).toMatchObject({
      id: "free",
      name: "Free",
      priceUsd: 0,
      monthlyConversations: 100,
      agents: 1,
      graceDays: 30,
    });
    expect(PLANS.pro).toMatchObject({
      id: "pro",
      name: "Pro",
      priceUsd: 39,
      monthlyConversations: 1000,
      agents: null,
      graceDays: 30,
    });
  });

  it("still honours the environment overrides", async () => {
    process.env.FREE_TIER_CONVERSATION_LIMIT = "250";
    process.env.PRO_TIER_CONVERSATION_LIMIT = "5000";
    process.env.USAGE_GRACE_DAYS = "45";
    vi.resetModules();
    const mod = await import("@/config/pricing");
    expect(mod.PLANS.free.monthlyConversations).toBe(250);
    expect(mod.PLANS.pro.monthlyConversations).toBe(5000);
    expect(mod.PLANS.free.graceDays).toBe(45);
    expect(mod.PLANS.pro.graceDays).toBe(45);
  });

  it("never lets the grace override drop below the promised 30-day floor", async () => {
    process.env.USAGE_GRACE_DAYS = "7";
    vi.resetModules();
    const mod = await import("@/config/pricing");
    expect(mod.PLANS.free.graceDays).toBe(30);
    expect(mod.PLANS.pro.graceDays).toBe(30);
  });

  it("is the same object re-exported from src/lib/usage.ts", async () => {
    vi.resetModules();
    const [pricing, usage] = await Promise.all([
      import("@/config/pricing"),
      import("@/lib/usage"),
    ]);
    expect(usage.PLANS).toBe(pricing.PLANS);
  });
});

describe("public pricing display values", () => {
  it("marks undecided numbers with a marker distinct from null (unlimited)", () => {
    expect(isPricingUnset(PRICING_UNSET)).toBe(true);
    expect(isPricingUnset(null)).toBe(false);
    expect(isPricingUnset(100)).toBe(false);
  });

  it("exposes the decided values wired to the enforced plans (issue #15)", () => {
    expect(pricingConfig.hostedPro.monthlyPriceUsd).toBe(PLANS.pro.priceUsd);
    expect(pricingConfig.hostedPro.monthlyPriceUsd).toBe(39);
    expect(pricingConfig.hostedPro.monthlyConversations).toBe(PLANS.pro.monthlyConversations);
    expect(pricingConfig.hostedPro.monthlyConversations).toBe(1000);
    expect(pricingConfig.hostedFree.monthlyConversations).toBe(PLANS.free.monthlyConversations);
    expect(pricingConfig.hostedFree.monthlyConversations).toBe(100);
    expect(pricingConfig.hostedFree.agents).toBe(PLANS.free.agents);
    expect(pricingConfig.hostedPro.agents).toBe(PLANS.pro.agents);
  });

  it("takes the grace period from the enforced plan config", () => {
    expect(pricingConfig.graceDays).toBe(PLANS.free.graceDays);
    expect(pricingConfig.graceDays).toBeGreaterThanOrEqual(30);
  });

  it("formats USD with Intl.NumberFormat", () => {
    expect(formatUsd(12)).toBe("$12.00");
    expect(formatUsd(12.5)).toBe("$12.50");
    expect(formatUsd(39)).toBe("$39.00");
  });

  it("formats allowances for display", () => {
    expect(formatCount(100)).toBe("100");
    expect(formatCount(1000)).toBe("1,000");
    expect(formatAgentLimit(1)).toBe("1 agent");
    expect(formatAgentLimit(null)).toBe("Unlimited agents");
  });
});

describe("hosted production build guard", () => {
  it("reports no unset values once every public value is decided", () => {
    expect(unsetPricingValues()).toEqual([]);
    expect(() => assertPricingCompleteForHostedProduction()).not.toThrow();
  });

  it("fails while any public value is unset", () => {
    const pro = pricingConfig.hostedPro as { monthlyPriceUsd: number | typeof PRICING_UNSET };
    pro.monthlyPriceUsd = PRICING_UNSET;
    try {
      expect(() => assertPricingCompleteForHostedProduction()).toThrowError(/hostedPro\.monthlyPriceUsd/);
    } finally {
      pro.monthlyPriceUsd = 39;
    }
  });
});
