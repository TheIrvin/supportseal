import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PLANS,
  PRICING_UNSET,
  assertPricingCompleteForHostedProduction,
  formatUsd,
  isPricingUnset,
  pricingConfig,
  unsetPricingValues,
} from "@/config/pricing";

describe("PLANS (single source shared with src/lib/usage.ts)", () => {
  const originalLimit = process.env.FREE_TIER_CONVERSATION_LIMIT;
  const originalGrace = process.env.USAGE_GRACE_DAYS;

  beforeEach(() => {
    delete process.env.FREE_TIER_CONVERSATION_LIMIT;
    delete process.env.USAGE_GRACE_DAYS;
  });

  afterEach(() => {
    if (originalLimit === undefined) delete process.env.FREE_TIER_CONVERSATION_LIMIT;
    else process.env.FREE_TIER_CONVERSATION_LIMIT = originalLimit;
    if (originalGrace === undefined) delete process.env.USAGE_GRACE_DAYS;
    else process.env.USAGE_GRACE_DAYS = originalGrace;
  });

  it("keeps the enforced plan limits unchanged", () => {
    expect(PLANS.free).toMatchObject({
      id: "free",
      name: "Free",
      monthlyConversations: 100,
      graceDays: 14,
    });
    expect(PLANS.pro).toMatchObject({ id: "pro", name: "Pro", monthlyConversations: null, graceDays: 0 });
  });

  it("still honours the environment overrides", async () => {
    process.env.FREE_TIER_CONVERSATION_LIMIT = "250";
    process.env.USAGE_GRACE_DAYS = "7";
    vi.resetModules();
    const mod = await import("@/config/pricing");
    expect(mod.PLANS.free.monthlyConversations).toBe(250);
    expect(mod.PLANS.free.graceDays).toBe(7);
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

  it("ships with price and Free allowance as explicit placeholders (issue #6, M2)", () => {
    expect(isPricingUnset(pricingConfig.hostedPro.monthlyPriceUsd)).toBe(true);
    expect(isPricingUnset(pricingConfig.hostedFree.monthlyConversations)).toBe(true);
  });

  it("takes the grace period from the enforced plan config", () => {
    expect(pricingConfig.graceDays).toBe(PLANS.free.graceDays);
  });

  it("formats USD with Intl.NumberFormat", () => {
    expect(formatUsd(12)).toBe("$12.00");
    expect(formatUsd(12.5)).toBe("$12.50");
  });
});

describe("hosted production build guard", () => {
  it("reports every unset value with its config path", () => {
    expect(unsetPricingValues()).toEqual([
      "pricingConfig.hostedPro.monthlyPriceUsd",
      "pricingConfig.hostedFree.monthlyConversations",
    ]);
  });

  it("fails while any public value is unset", () => {
    expect(() => assertPricingCompleteForHostedProduction()).toThrowError(/hostedPro\.monthlyPriceUsd/);
  });

  it("passes once every public value is decided", () => {
    const pro = pricingConfig.hostedPro as { monthlyPriceUsd: number | typeof PRICING_UNSET };
    const free = pricingConfig.hostedFree as { monthlyConversations: number | typeof PRICING_UNSET };
    pro.monthlyPriceUsd = 19;
    free.monthlyConversations = 100;
    try {
      expect(() => assertPricingCompleteForHostedProduction()).not.toThrow();
    } finally {
      pro.monthlyPriceUsd = PRICING_UNSET;
      free.monthlyConversations = PRICING_UNSET;
    }
  });
});
