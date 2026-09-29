import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal/legal-document";
import { assertLegalReadyIfOperative, legalMetadata } from "@/config/legal";
import { findLegalDocument, legalDocuments } from "@/content/legal";

// Fails the build if the pages are switched live with placeholders left.
assertLegalReadyIfOperative(legalDocuments);

export const dynamicParams = false;

export function generateStaticParams() {
  return legalDocuments.map((doc) => ({ slug: doc.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = findLegalDocument((await params).slug);
  if (!doc) return {};
  return legalMetadata(doc.title, doc.description);
}

export default async function LegalDocumentPage({ params }: Props) {
  const doc = findLegalDocument((await params).slug);
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
