import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import proxy from "@/proxy";
import { PRICING_UNSET, pricingConfig } from "@/config/pricing";

function makeRequest(path: string) {
  return new NextRequest(new URL(`http://localhost:3000${path}`));
}

/**
 * Marketing routing/gating (docs/design/marketing-site.md "Routing and
 * gating"): marketing pages are served in hosted mode only; in self-hosted
 * mode `/` keeps the first-run/inbox behaviour and marketing paths bounce to
 * the app. One build serves both modes.
 */
describe("proxy marketing gating", () => {
  const originalHosted = process.env.HOSTED_MODE;

  beforeEach(() => {
    delete process.env.HOSTED_MODE;
  });

  afterEach(() => {
    if (originalHosted === undefined) delete process.env.HOSTED_MODE;
    else process.env.HOSTED_MODE = originalHosted;
  });

  describe("self-hosted mode (default)", () => {
    it("rewrites / to the dynamic start entry", () => {
      const response = proxy(makeRequest("/"));
      expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/start");
    });

    it.each(["/features", "/pricing", "/open-source"])("does not serve %s", (path) => {
      const response = proxy(makeRequest(path));
      expect(response.headers.get("location")).toBe("http://localhost:3000/inbox");
    });

    it("keeps unauthenticated app routes redirecting to login", () => {
      const response = proxy(makeRequest("/settings/team"));
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/login?next=%2Fsettings%2Fteam",
      );
    });
  });

  describe("hosted mode", () => {
    beforeEach(() => {
      process.env.HOSTED_MODE = "1";
    });

    it("lets marketing paths through to the static pages", () => {
      for (const path of ["/", "/features", "/pricing", "/open-source"]) {
        const response = proxy(makeRequest(path));
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-rewrite")).toBeNull();
        expect(response.status).toBe(200);
      }
    });

    it("still protects app routes", () => {
      const response = proxy(makeRequest("/inbox"));
      expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Finbox");
    });
  });

  describe("hosted production pricing readiness", () => {
    beforeEach(() => {
      process.env.HOSTED_MODE = "1";
    });

    it("serves the pricing page in production now that values are decided (issue #15)", () => {
      vi.stubEnv("NODE_ENV", "production");
      try {
        const response = proxy(makeRequest("/pricing"));
        expect(response.status).toBe(200);
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("still refuses the static pricing page if any public value is unset", () => {
      const pro = pricingConfig.hostedPro as { monthlyPriceUsd: number | typeof PRICING_UNSET };
      const previous = pro.monthlyPriceUsd;
      pro.monthlyPriceUsd = PRICING_UNSET;
      vi.stubEnv("NODE_ENV", "production");
      try {
        const response = proxy(makeRequest("/pricing"));
        expect(response.status).toBe(503);
      } finally {
        pro.monthlyPriceUsd = previous;
        vi.unstubAllEnvs();
      }
    });

    it("keeps serving the pricing page in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      try {
        const response = proxy(makeRequest("/pricing"));
        expect(response.status).toBe(200);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});

describe("proxy session handling", () => {
  it("passes protected routes through with a session cookie", () => {
    const request = makeRequest("/inbox");
    request.cookies.set("better-auth.session_token", "t");
    const response = proxy(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });
});
