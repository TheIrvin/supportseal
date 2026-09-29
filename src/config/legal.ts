import type { Metadata } from "next";

/**
 * Legal pages (issue #14): Terms, Privacy Policy, acceptable use,
 * subprocessors and hosted-vs-self-hosted data responsibility.
 *
 * `operative` is the single switch that turns the drafts into published
 * policies. While it is false the pages render under /legal with a
 * "Draft: not in effect" banner, are marked noindex, and are left out of
 * the sitemap, the marketing footer and the signup form. Flipping it is
 * Pete's decision after qualified legal review; the readiness check below
 * blocks it while any placeholder is unresolved.
 */
export const legalConfig: { operative: boolean; draftRevised: string } = {
  operative: false,
  /** Date the draft text was last revised (not an effective date). */
  draftRevised: "2026-09-29",
};

/** Drafts are titled as drafts and kept out of search indexes. */
export function legalMetadata(title: string, description: string): Metadata {
  if (legalConfig.operative) return { title, description };
  return {
    title: `Draft: ${title}`,
    description: `Unreviewed draft, not in effect. ${description}`,
    robots: { index: false, follow: false },
  };
}

export const PLACEHOLDER_PREFIX = "[PLACEHOLDER - requires Pete";

/** Visible marker for a fact only Pete (or counsel) can supply. */
export function placeholder(what: string): string {
  return `${PLACEHOLDER_PREFIX}: ${what}]`;
}

export const PLACEHOLDER_PATTERN = /\[PLACEHOLDER - requires Pete[^\]]*\]/g;

export type LegalTable = { caption: string; head: string[]; rows: string[][] };

/** A string is a paragraph, a string array a bulleted list. */
export type LegalBlock = string | string[] | LegalTable;

export type LegalSection = { id: string; heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  slug: string;
  title: string;
  /** Meta description and index-page summary. */
  description: string;
  effectiveDate: string;
  sections: LegalSection[];
};

function blockText(block: LegalBlock): string[] {
  if (typeof block === "string") return [block];
  if (Array.isArray(block)) return block;
  return [block.caption, ...block.head, ...block.rows.flat()];
}

export function documentText(doc: LegalDocument): string[] {
  return [
    doc.title,
    doc.description,
    doc.effectiveDate,
    ...doc.sections.flatMap((section) => [section.heading, ...section.blocks.flatMap(blockText)]),
  ];
}

/** Every unresolved placeholder, prefixed with the document it sits in. */
export function unresolvedPlaceholders(docs: readonly LegalDocument[]): string[] {
  return docs.flatMap((doc) =>
    documentText(doc).flatMap((text) =>
      [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => `${doc.slug}: ${match[0]}`),
    ),
  );
}

/**
 * Operative policies must not carry placeholders. Called by the test suite
 * unconditionally and by the page module in hosted production builds.
 */
export function assertLegalReadyIfOperative(
  docs: readonly LegalDocument[],
  operative: boolean = legalConfig.operative,
): void {
  if (!operative) return;
  const unresolved = unresolvedPlaceholders(docs);
  if (unresolved.length > 0) {
    throw new Error(
      `legalConfig.operative is true but ${unresolved.length} placeholder(s) remain:\n` +
        `${unresolved.join("\n")}\nResolve them in src/content/legal/ (issue #14).`,
    );
  }
}
