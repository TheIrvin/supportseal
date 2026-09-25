import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import proxy from "@/proxy";

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
      }
    });

    it("still protects app routes", () => {
      const response = proxy(makeRequest("/inbox"));
      expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Finbox");
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
