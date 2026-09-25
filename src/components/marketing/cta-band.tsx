import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { cn } from "@/lib/cn";

export type CtaLink = { label: string; href: string; external?: boolean };

/**
 * Closing call-to-action band (docs/design/marketing-site.md). Plain
 * `surface` band by default; the ink variant is the one ink band allowed per
 * page, with the mint-on-ink button treatment.
 */
export function CtaBand({
  title,
  lead,
  primary,
  secondary,
  band = "surface",
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  primary: CtaLink;
  secondary?: CtaLink;
  band?: "surface" | "ink";
}) {
  const onInk = band === "ink";
  return (
    <Section band={band} aria-label="Get started">
      <div className="max-w-[40rem]">
        <SectionHeading title={title} lead={lead} onInk={onInk} />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className={cn(onInk && "bg-brand-mint text-brand-ink hover:bg-brand-mint hover:opacity-90")}
          >
            {linkFor(primary)}
          </Button>
          {secondary ? (
            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                onInk && "border-white bg-transparent text-white hover:border-white hover:bg-white hover:text-brand-ink",
              )}
            >
              {linkFor(secondary)}
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function linkFor(cta: CtaLink) {
  return cta.external ? (
    <a href={cta.href} target="_blank" rel="noopener">
      {cta.label}
      <span className="sr-only"> (opens on GitHub)</span>
    </a>
  ) : (
    <Link href={cta.href}>{cta.label}</Link>
  );
}
