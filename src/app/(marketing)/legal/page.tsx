import type { Metadata } from "next";
import Link from "next/link";

import { DraftNotice } from "@/components/legal/legal-document";
import { Section } from "@/components/marketing/section";
import { legalMetadata } from "@/config/legal";
import { legalDocuments, legalHref } from "@/content/legal";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = legalMetadata(
  "Legal",
  `Terms, privacy and data-handling documents for the hosted ${siteConfig.name} service.`,
);

export default function LegalIndexPage() {
  return (
    <Section>
      <div className="max-w-[48rem]">
        <h1 className="text-[clamp(2rem,1.5rem+2vw,2.8rem)] leading-[1.15] font-semibold tracking-[-0.02em] text-heading">
          Legal
        </h1>
        <p className="mt-4 text-[1.2rem] leading-[1.6] text-body">
          The documents that apply to the hosted {siteConfig.name} service.
        </p>
        <DraftNotice />
        <ul className="mt-10 divide-y divide-border rounded-lg border border-border">
          {legalDocuments.map((doc) => (
            <li key={doc.slug} className="p-4">
              <Link
                href={legalHref(doc.slug)}
                className="text-[1.133rem] font-semibold text-primary underline-offset-4 hover:underline"
              >
                {doc.title}
              </Link>
              <p className="mt-1 text-[0.967rem] text-muted">{doc.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
