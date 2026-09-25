import { siteConfig } from "@/config/site";

/**
 * Shared hosted-vs-self-hosted facts (docs/design/marketing-site.md:
 * "Facts come from the shared HostingComparison data (also used on /pricing
 * and /open-source) so they cannot drift"). Text from docs/marketing/copy.md.
 */
export const hostingCards = {
  hosted: {
    name: "Hosted",
    facts: [
      "Choose a plan around Conversation volume.",
      "Add unlimited Products and invite your team without per-seat pricing.",
      "Each Conversation counts once ever, when it first opens.",
    ],
    cta: { label: "See hosted plans", href: "/pricing" },
  },
  selfHosted: {
    name: "Self-hosted",
    facts: [
      "Run the same core support tools on your infrastructure.",
      "The AGPLv3 source is free to self-host and includes a Docker Compose configuration.",
      "You provide the hosting and email setup.",
    ],
    cta: { label: "Read the self-hosting guide", href: siteConfig.selfHostingGuideUrl, external: true },
  },
  /** One line under both cards (FR-HOST-01; copy.md self-host section). */
  sameLine: "The core workflow uses the same source as hosted mode.",
} as const;

/** Core support capabilities present in every hosting mode (SF-13). */
export const CORE_CAPABILITIES = ["Live chat", "Support email", "Developer context", "Attachments"] as const;
