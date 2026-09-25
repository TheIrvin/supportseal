/**
 * Umami analytics configuration (docs/design/marketing-site.md, performance
 * budgets: "Future Umami analytics (separate work, hosted only, defer)").
 *
 * Off by default: the script renders only when an operator explicitly
 * configures both the script URL and the website ID. Self-hosted installs
 * therefore never load analytics unless they opt in through these settings.
 * `NEXT_PUBLIC_*` values are inlined at build time, matching the statically
 * rendered marketing pages.
 */
export type AnalyticsConfig = {
  enabled: boolean;
  scriptUrl: string | null;
  websiteId: string | null;
};

export function resolveAnalytics(env: Record<string, string | undefined> = process.env): AnalyticsConfig {
  const scriptUrl = env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || null;
  const websiteId = env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || null;
  return {
    enabled: scriptUrl !== null && websiteId !== null,
    scriptUrl,
    websiteId,
  };
}

export const analytics = resolveAnalytics();
