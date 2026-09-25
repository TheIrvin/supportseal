import { brand } from "@/lib/brand";
import { appConfig } from "@/lib/config";

export const siteConfig = {
  name: brand.name,
  description: `${brand.name}: ${brand.tagline}. Live chat and support email for every product, one inbox.`,
  version: "0.1.0",
  url: appConfig.url,
  /** Project repository; also the target of marketing header/footer links. */
  repositoryUrl: "https://github.com/pietervw/supportseal",
  /** No docs site yet: header "Docs" links to the guide on GitHub (marketing-site.md). */
  selfHostingGuideUrl: "https://github.com/pietervw/supportseal/blob/main/docs/self-hosting.md",
  licenseUrl: "https://github.com/pietervw/supportseal/blob/main/LICENSE",
};
