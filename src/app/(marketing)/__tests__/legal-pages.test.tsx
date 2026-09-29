import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("notFound");
  },
}));

import LegalDocumentPage, { generateMetadata, generateStaticParams } from "@/app/(marketing)/legal/[slug]/page";
import LegalIndexPage, { metadata as indexMetadata } from "@/app/(marketing)/legal/page";
import { RegisterForm } from "@/app/(auth)/register/register-form";
import sitemap from "@/app/sitemap";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import {
  assertLegalReadyIfOperative,
  documentText,
  legalConfig,
  PLACEHOLDER_PREFIX,
  unresolvedPlaceholders,
} from "@/config/legal";
import { legalDocuments, publicLegalLinks } from "@/content/legal";
import proxy from "@/proxy";

async function renderDoc(slug: string) {
  return renderToStaticMarkup(await LegalDocumentPage({ params: Promise.resolve({ slug }) }));
}

const SLUGS = ["terms", "privacy", "acceptable-use", "subprocessors", "data-responsibility"];

describe("legal documents (issue #14)", () => {
  it("covers every document the issue requires", () => {
    expect(generateStaticParams().map((p) => p.slug)).toEqual(SLUGS);
  });

  it("never lets the pages go operative with placeholders left", () => {
    // Flipping legalConfig.operative fails this test until every
    // placeholder in src/content/legal/ is resolved.
    expect(() => assertLegalReadyIfOperative(legalDocuments)).not.toThrow();
    expect(() => assertLegalReadyIfOperative(legalDocuments, true)).toThrowError(/placeholder/);
  });

  it("uses only the exact placeholder token, so the gate sees every one", () => {
    for (const doc of legalDocuments) {
      const text = documentText(doc).join("\n");
      const loose = text.split(/\[PLACEHOLDER/i).length - 1;
      const strict = unresolvedPlaceholders([doc]).length;
      expect(loose, doc.slug).toBe(strict);
      expect(text).not.toMatch(/\b(TODO|TBD|lorem ipsum|Acme)\b/i);
    }
  });

  it("makes no compliance claims (Initial.md §29)", () => {
    for (const doc of legalDocuments) {
      const text = documentText(doc).join("\n");
      expect(text, doc.slug).not.toMatch(/\b(GDPR|CCPA|HIPAA|SOC ?2|PCI)[- ]?(DSS )?(compliant|certified)\b/i);
    }
  });

  it.each(SLUGS)("%s renders the draft notice and highlighted placeholders", async (slug) => {
    const html = await renderDoc(slug);
    expect(html).toContain("data-legal-draft-notice");
    expect(html).toContain("Draft: not in effect");
    expect(html).toContain("is not legal advice");
    expect(html).toContain(`<mark data-legal-placeholder="" class=`);
    expect(html).toContain(PLACEHOLDER_PREFIX);
  });

  it.each(SLUGS)("%s is titled as a draft and kept out of search indexes", async (slug) => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug }) });
    expect(meta.title).toMatch(/^Draft: /);
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("the index lists every document under the draft notice, noindex", () => {
    const html = renderToStaticMarkup(<LegalIndexPage />);
    for (const slug of SLUGS) expect(html).toContain(`href="/legal/${slug}"`);
    expect(html).toContain("data-legal-draft-notice");
    expect(indexMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("states repository facts, not invented ones", async () => {
    const subprocessors = await renderDoc("subprocessors");
    expect(subprocessors).toContain("Hetzner Online GmbH");
    expect(subprocessors).toContain("Postmark (ActiveCampaign LLC)");
    expect(subprocessors).toContain("Planned: not yet enabled");
    const privacy = await renderDoc("privacy");
    expect(privacy).toContain("Up to 30 days without use");
    expect(privacy).toContain("Up to 365 days");
    expect(privacy).toContain("do not sell personal information");
  });
});

describe("draft legal pages are not linked from public surfaces", () => {
  const originalHosted = process.env.HOSTED_MODE;
  beforeEach(() => {
    process.env.HOSTED_MODE = "1";
  });
  afterEach(() => {
    legalConfig.operative = false;
    if (originalHosted === undefined) delete process.env.HOSTED_MODE;
    else process.env.HOSTED_MODE = originalHosted;
  });

  it("stays out of the footer, sitemap and signup form while draft", () => {
    expect(publicLegalLinks()).toEqual([]);
    expect(renderToStaticMarkup(<MarketingFooter />)).not.toContain("/legal");
    expect(sitemap().map((entry) => entry.url).join(" ")).not.toContain("/legal");
    expect(renderToStaticMarkup(<RegisterForm legalLinks={publicLegalLinks()} />)).not.toContain(
      "data-signup-legal-notice",
    );
  });

  it("appears everywhere at once when Pete flips the switch", async () => {
    legalConfig.operative = true;
    const footer = renderToStaticMarkup(<MarketingFooter />);
    for (const slug of SLUGS) expect(footer).toContain(`href="/legal/${slug}"`);
    expect(sitemap().some((entry) => entry.url.endsWith("/legal/privacy"))).toBe(true);
    const signup = renderToStaticMarkup(<RegisterForm legalLinks={publicLegalLinks()} />);
    expect(signup).toContain("data-signup-legal-notice");
    expect(signup).toContain('href="/legal/terms"');
    expect(signup).toContain('href="/legal/acceptable-use"');
    expect(signup).toContain('href="/legal/privacy"');
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "terms" }) });
    expect(meta.robots).toBeUndefined();
    expect(meta.title).toBe("Terms of Service");
  });
});

describe("proxy: legal pages are hosted-only", () => {
  const originalHosted = process.env.HOSTED_MODE;
  afterEach(() => {
    if (originalHosted === undefined) delete process.env.HOSTED_MODE;
    else process.env.HOSTED_MODE = originalHosted;
  });

  it.each(["/legal", "/legal/privacy"])("self-hosted mode redirects %s to the app", (path) => {
    delete process.env.HOSTED_MODE;
    const response = proxy(new NextRequest(new URL(`http://localhost:3000${path}`)));
    expect(response.headers.get("location")).toBe("http://localhost:3000/inbox");
  });

  it("hosted mode serves /legal pages", () => {
    process.env.HOSTED_MODE = "1";
    const response = proxy(new NextRequest(new URL("http://localhost:3000/legal/terms")));
    expect(response.headers.get("location")).toBeNull();
  });
});
