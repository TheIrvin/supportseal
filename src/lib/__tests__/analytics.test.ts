import { describe, expect, it } from "vitest";

import { resolveAnalytics } from "@/lib/analytics";

describe("resolveAnalytics (Umami behind env settings, off by default)", () => {
  it("is off when nothing is configured", () => {
    const config = resolveAnalytics({});
    expect(config.enabled).toBe(false);
    expect(config.scriptUrl).toBeNull();
    expect(config.websiteId).toBeNull();
  });

  it("is off when only one of the two settings is present", () => {
    expect(resolveAnalytics({ NEXT_PUBLIC_UMAMI_SCRIPT_URL: "https://a.example.com/script.js" }).enabled).toBe(false);
    expect(resolveAnalytics({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: "w-1" }).enabled).toBe(false);
  });

  it("ignores blank values", () => {
    const config = resolveAnalytics({
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: "   ",
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: "",
    });
    expect(config.enabled).toBe(false);
  });

  it("is on only when explicitly configured with both settings", () => {
    const config = resolveAnalytics({
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: "https://analytics.example.com/script.js",
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: "  w-1  ",
    });
    expect(config.enabled).toBe(true);
    expect(config.scriptUrl).toBe("https://analytics.example.com/script.js");
    expect(config.websiteId).toBe("w-1");
  });
});
