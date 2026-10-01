import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ScreenshotFrame } from "@/components/marketing/screenshot-frame";
import { ConfigValue } from "@/components/marketing/config-value";
import { FaqList } from "@/components/marketing/faq-list";
import { CodeBlock } from "@/components/marketing/code-block";
import { UmamiScript } from "@/components/marketing/umami-script";
import { PRICING_UNSET } from "@/config/pricing";

describe("ScreenshotFrame", () => {
  it("renders the available capture with light and dark image variants", () => {
    const html = renderToStaticMarkup(
      <ScreenshotFrame shotId="S1" alt="Inbox with all products" />,
    );
    // next/image encodes non-priority sources through /_next/image.
    expect(html).toContain("url=%2Fmarketing%2FS1-light.png");
    expect(html).toContain("url=%2Fmarketing%2FS1-dark.png");
    expect(html).toContain('alt="Inbox with all products"');
    expect(html).not.toContain("Screenshot placeholder");
  });

  it("renders a clearly marked placeholder slot while a capture is pending", () => {
    const html = renderToStaticMarkup(
      <ScreenshotFrame shotId="S3" alt="Second product widget" />,
    );
    expect(html).toContain("S3");
    expect(html).toContain("Real capture pending");
    expect(html).toContain('aria-label="Screenshot placeholder: S3');
  });

  it("describes the placeholder accessibly and never emits a fake image", () => {
    const html = renderToStaticMarkup(<ScreenshotFrame shotId="S2m" alt="Widget on mobile" />);
    expect(html).toContain('role="img"');
    expect(html).not.toContain("<img");
  });

  it("rejects unknown shot ids instead of silently rendering nothing", () => {
    expect(() => renderToStaticMarkup(<ScreenshotFrame shotId="S99" alt="x" />)).toThrowError(
      /Unknown marketing shot/,
    );
  });
});

describe("ConfigValue", () => {
  it("renders an explicit TBD badge with its config path when unset", () => {
    const html = renderToStaticMarkup(
      <ConfigValue value={PRICING_UNSET} configKey="pricingConfig.hostedPro.monthlyPriceUsd" />,
    );
    expect(html).toContain("TBD");
    expect(html).toContain('data-config-key="pricingConfig.hostedPro.monthlyPriceUsd"');
  });

  it("renders a decided value through the formatter", () => {
    const html = renderToStaticMarkup(
      <ConfigValue value={19} configKey="k" format={(v) => `$${v}`} suffix=" / month" />,
    );
    expect(html).toContain("$19 / month");
  });
});

describe("FaqList", () => {
  it("uses native details/summary", () => {
    const html = renderToStaticMarkup(
      <FaqList items={[{ question: "Is there a charge for every message?", answer: "No." }]} />,
    );
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("Is there a charge for every message?");
  });
});

describe("CodeBlock", () => {
  it("renders a labelled, focusable scroll region with the snippet", () => {
    const html = renderToStaticMarkup(<CodeBlock code="docker compose up -d" label="Start command" />);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Start command"');
    expect(html).toContain("docker compose up -d");
  });
});

describe("UmamiScript", () => {
  it("renders nothing unless analytics is explicitly configured", () => {
    // No env settings in the test environment → off by default.
    expect(renderToStaticMarkup(<UmamiScript />)).toBe("");
  });
});
