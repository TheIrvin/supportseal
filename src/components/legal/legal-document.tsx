import Link from "next/link";
import { IconAlertTriangle } from "@tabler/icons-react";

import { Section } from "@/components/marketing/section";
import {
  legalConfig,
  PLACEHOLDER_PATTERN,
  type LegalBlock,
  type LegalDocument,
  type LegalTable,
} from "@/config/legal";
import { legalDocuments, legalHref } from "@/content/legal";
import { brand } from "@/lib/brand";

/** Renders text with every placeholder token visibly highlighted. */
export function LegalText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark
        key={start}
        data-legal-placeholder=""
        className="rounded-sm bg-warning-label px-1 font-medium text-heading"
      >
        {match[0]}
      </mark>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * Shown on every legal page until `legalConfig.operative` is flipped, so a
 * draft can never be read as a policy in force (issue #14).
 */
export function DraftNotice() {
  if (legalConfig.operative) return null;
  return (
    <div
      role="note"
      aria-label="Draft notice"
      data-legal-draft-notice=""
      className="mt-6 flex gap-3 rounded-lg border-2 border-warning bg-warning-label p-4 text-heading"
    >
      <IconAlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="text-[1rem] leading-[1.6]">
        <p className="font-semibold">Draft: not in effect</p>
        <p className="mt-1">
          This is an unreviewed draft prepared for legal review. It is not an operative policy, does
          not form part of any agreement with {brand.name}, and is not legal advice. Highlighted
          placeholders mark details that are not yet decided.
        </p>
      </div>
    </div>
  );
}

function Table({ table }: { table: LegalTable }) {
  return (
    <div
      role="region"
      aria-label={table.caption}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border"
    >
      <table className="w-full min-w-[36rem] border-collapse text-left text-[0.933rem]">
        <caption className="sr-only">{table.caption}</caption>
        <thead className="bg-surface">
          <tr>
            {table.head.map((cell) => (
              <th key={cell} scope="col" className="border-b border-border px-3 py-2 font-semibold text-heading">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]} className="align-top">
              {row.map((cell, index) => (
                <td key={index} className="border-b border-border px-3 py-2 break-words">
                  <LegalText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return (
      <p>
        <LegalText text={block} />
      </p>
    );
  }
  if (Array.isArray(block)) {
    return (
      <ul className="list-disc space-y-2 ps-6">
        {block.map((item) => (
          <li key={item}>
            <LegalText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  return <Table table={block} />;
}

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const related = legalDocuments.filter((other) => other.slug !== doc.slug);
  return (
    <Section>
      <article className="max-w-[48rem]">
        <p className="text-[0.933rem] text-muted">
          <Link href="/legal" className="underline-offset-4 hover:text-heading hover:underline">
            Legal
          </Link>
        </p>
        <h1 className="mt-2 text-[clamp(2rem,1.5rem+2vw,2.8rem)] leading-[1.15] font-semibold tracking-[-0.02em] text-heading">
          {doc.title}
        </h1>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.933rem] text-muted">
          <dt>Effective</dt>
          <dd>
            <LegalText text={doc.effectiveDate} />
          </dd>
          {legalConfig.operative ? null : (
            <>
              <dt>Draft revised</dt>
              <dd>{legalConfig.draftRevised}</dd>
            </>
          )}
        </dl>
        <DraftNotice />

        <nav aria-label="On this page" className="mt-8 rounded-lg border border-border p-4">
          <h2 className="text-[0.933rem] font-semibold text-heading">On this page</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-[0.933rem]">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-primary underline-offset-4 hover:underline">
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section, index) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2
                id={section.id}
                className="scroll-mt-24 text-[1.4rem] leading-[1.3] font-semibold text-heading"
              >
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-4 space-y-4 text-[1.067rem] leading-[1.7] text-body">
                {section.blocks.map((block, blockIndex) => (
                  <Block key={blockIndex} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav aria-label="Other legal documents" className="mt-14 border-t border-border pt-6">
          <h2 className="text-[0.933rem] font-semibold text-heading">Other legal documents</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[0.933rem]">
            {related.map((other) => (
              <li key={other.slug}>
                <Link href={legalHref(other.slug)} className="text-primary underline-offset-4 hover:underline">
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </Section>
  );
}
