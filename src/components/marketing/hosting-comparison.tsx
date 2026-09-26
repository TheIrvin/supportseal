import Link from "next/link";
import { IconArrowUpRight, IconCheck } from "@tabler/icons-react";

import { hostingCards } from "@/config/hosting-comparison";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The hosting-choice pair (docs/design/marketing-site.md, home "Hosting
 * choice"): two cards with checklist facts from the shared comparison data,
 * rendered identically wherever the choice is presented.
 */
export function HostingComparison({ headingLevel = "h3" }: { headingLevel?: "h3" | "h2" }) {
  const Heading = headingLevel;
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[hostingCards.hosted, hostingCards.selfHosted].map((card) => (
          <Card key={card.name} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col pt-6">
              <Heading className="text-[1.33rem] font-semibold tracking-[-0.01em] text-heading">
                {card.name}
              </Heading>
              <ul className="mt-4 flex flex-col gap-3">
                {card.facts.map((fact) => (
                  <li key={fact} className="flex items-start gap-2.5 text-[1rem] leading-[1.65] text-body">
                    <IconCheck aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                    {fact}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {"external" in card.cta && card.cta.external ? (
                  <a
                    href={card.cta.href}
                    className="inline-flex items-center gap-1 text-[0.9375rem] font-medium text-primary underline underline-offset-4"
                  >
                    {card.cta.label}
                    <IconArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only"> (opens on GitHub)</span>
                  </a>
                ) : (
                  <Link
                    href={card.cta.href}
                    className="text-[0.9375rem] font-medium text-primary underline underline-offset-4"
                  >
                    {card.cta.label}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-[1rem] text-muted">{hostingCards.sameLine}</p>
    </div>
  );
}
