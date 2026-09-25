import type { MetadataRoute } from "next";

import { marketingPages, siteConfig } from "@/config/site";
import { isHostedMode } from "@/lib/hosting";

export const dynamic = "force-dynamic";

/** Marketing pages in hosted mode only (docs/design/marketing-site.md "SEO and metadata"). */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isHostedMode()) return [];
  return ["", ...marketingPages.map((page) => page.href)].map((path) => ({
    url: `${siteConfig.url}${path}`,
  }));
}
