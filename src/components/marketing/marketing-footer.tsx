import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";
import { brand } from "@/lib/brand";

function ExternalFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-[0.9375rem] text-muted underline-offset-4 transition-colors duration-150 hover:text-heading hover:underline"
    >
      {label}
      <IconArrowUpRight aria-hidden className="size-3.5" />
      <span className="sr-only"> (opens on GitHub)</span>
    </a>
  );
}

function InternalFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[0.9375rem] text-muted underline-offset-4 transition-colors duration-150 hover:text-heading hover:underline"
    >
      {label}
    </Link>
  );
}

/**
 * Public marketing footer (docs/design/marketing-site.md, "Global frame").
 * Privacy, Terms and Changelog links appear only once those pages/releases
 * exist — no dead links (open questions M3/M4). The "Company" column is
 * omitted until a contact address is configured.
 */
export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface text-muted">
      <div className="mx-auto w-full max-w-[80rem] px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo href="/" />
            <p className="mt-4 max-w-[20rem] text-[0.9375rem]">{brand.tagline}.</p>
            <p className="mt-4 text-[0.875rem]">
              Licence:{" "}
              <a
                href={siteConfig.licenseUrl}
                className="text-muted underline underline-offset-4 hover:text-heading"
              >
                AGPLv3
              </a>
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="text-[0.867rem] font-semibold tracking-[0.04em] text-heading">Product</h2>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <InternalFooterLink href="/features" label="Features" />
              </li>
              <li>
                <InternalFooterLink href="/pricing" label="Pricing" />
              </li>
            </ul>
          </nav>

          <nav aria-label="Open source">
            <h2 className="text-[0.867rem] font-semibold tracking-[0.04em] text-heading">Open source</h2>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <ExternalFooterLink href={siteConfig.repositoryUrl} label="GitHub" />
              </li>
              <li>
                <ExternalFooterLink href={siteConfig.selfHostingGuideUrl} label="Self-hosting guide" />
              </li>
              <li>
                <ExternalFooterLink href={siteConfig.licenseUrl} label="Licence" />
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-[0.875rem]">
            © {year} {siteConfig.name}
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
