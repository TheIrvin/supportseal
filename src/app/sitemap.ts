import type { MetadataRoute } from "next";

import { marketingPages, siteConfig } from "@/config/site";
import { publicLegalLinks } from "@/content/legal";
import { isHostedMode } from "@/lib/hosting";

export const dynamic = "force-dynamic";

/**
 * Marketing pages in hosted mode only (docs/design/marketing-site.md "SEO and
 * metadata"). Legal pages join only once they are operative.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isHostedMode()) return [];
  const legal = publicLegalLinks();
  const legalPaths = legal.length > 0 ? ["/legal", ...legal.map((link) => link.href)] : [];
  return ["", ...marketingPages.map((page) => page.href), ...legalPaths].map((path) => ({
    url: `${siteConfig.url}${path}`,
  }));
}
