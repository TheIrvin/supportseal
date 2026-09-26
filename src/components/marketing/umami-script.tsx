import { analytics } from "@/lib/analytics";

/**
 * Umami analytics script for the public marketing pages. Renders the
 * standard `defer` snippet only when explicitly configured via
 * NEXT_PUBLIC_UMAMI_SCRIPT_URL + NEXT_PUBLIC_UMAMI_WEBSITE_ID
 * (src/lib/analytics.ts); otherwise renders nothing.
 */
export function UmamiScript() {
  if (!analytics.enabled || !analytics.scriptUrl || !analytics.websiteId) return null;
  return <script defer src={analytics.scriptUrl} data-website-id={analytics.websiteId} />;
}
