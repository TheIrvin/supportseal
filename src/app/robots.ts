import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { isHostedMode } from "@/lib/hosting";

export const dynamic = "force-dynamic";

/**
 * Marketing pages are listed only in hosted mode (docs/design/marketing-site.md
 * "SEO and metadata"). A self-hosted installation is a private support desk:
 * nothing is advertised and nothing is indexed.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isHostedMode()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The public site is the marketing surface; app routes stay out of
        // search indexes even in hosted mode.
        disallow: [
          "/api/",
          "/inbox",
          "/settings",
          "/onboarding",
          "/saved-replies",
          "/widget-preview",
          "/start",
          "/login",
          "/register",
          "/invite/",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
