import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { UmamiScript } from "@/components/marketing/umami-script";

/**
 * Public marketing frame (docs/design/marketing-site.md, "Routing and
 * gating"): marketing header/footer instead of the authenticated shell.
 * Pages in this group are statically rendered and read no session, cookies
 * or database; hosting-mode gating runs in proxy.ts.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-heading focus:shadow-menu"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
      <UmamiScript />
    </>
  );
}
