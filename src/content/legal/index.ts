import { legalConfig, type LegalDocument } from "@/config/legal";

import { acceptableUse } from "./acceptable-use";
import { dataResponsibility } from "./data-responsibility";
import { privacy } from "./privacy";
import { subprocessors } from "./subprocessors";
import { terms } from "./terms";

export const legalDocuments: readonly LegalDocument[] = [
  terms,
  privacy,
  acceptableUse,
  subprocessors,
  dataResponsibility,
];

export function legalHref(slug: string): string {
  return `/legal/${slug}`;
}

export function findLegalDocument(slug: string): LegalDocument | undefined {
  return legalDocuments.find((doc) => doc.slug === slug);
}

/**
 * Links for public surfaces (footer, sitemap, signup). Empty while the
 * documents are drafts, so nothing public points at them (issue #14).
 */
export function publicLegalLinks(): Array<{ slug: string; label: string; href: string }> {
  if (!legalConfig.operative) return [];
  return legalDocuments.map((doc) => ({ slug: doc.slug, label: doc.title, href: legalHref(doc.slug) }));
}
