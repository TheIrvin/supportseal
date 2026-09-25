import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isHostedMode } from "@/lib/hosting";

const PROTECTED_PREFIXES = ["/inbox", "/settings", "/onboarding", "/saved-replies"];
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

/**
 * Marketing paths are served only in hosted mode (docs/design/marketing-site.md
 * "Routing and gating", open question M1 default). In self-hosted mode `/`
 * keeps its first-run → /register / else → /inbox behaviour via the dynamic
 * `/start` entry page, and the marketing pages are not served. The gating
 * decision lives here so one build serves both modes.
 */
const MARKETING_PAGES = ["/features", "/pricing", "/open-source"];
const SELF_HOSTED_ROOT_ENTRY = "/start";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hosted = isHostedMode();

  if (!hosted) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(SELF_HOSTED_ROOT_ENTRY, request.url));
    }
    if (MARKETING_PAGES.includes(pathname)) {
      return NextResponse.redirect(new URL("/inbox", request.url));
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next|api|widget|robots\\.txt|favicon\\.ico|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest)).*)",
  ],
};
