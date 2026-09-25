import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import HomePage from "@/app/(marketing)/page";
import FeaturesPage from "@/app/(marketing)/features/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import OpenSourcePage from "@/app/(marketing)/open-source/page";

describe("marketing home page", () => {
  const html = renderToStaticMarkup(<HomePage />);

  it("uses the canonical hero copy and CTAs", () => {
    expect(html).toContain("One inbox for everything you build.");
    expect(html).toContain("For founders supporting several products");
    expect(html).toContain('href="/register"');
    expect(html).toContain("Set up your inbox");
    expect(html).toContain('href="/open-source"');
    expect(html).toContain("Explore self-hosting");
  });

  it("renders every copy section", () => {
    for (const heading of [
      "Keep each product in view",
      "Chat now. Continue by email.",
      "Bring the app details into the Conversation",
      "Leave a useful thread for the next reply",
      "Choose how to run your support desk",
      "Receive a message. Answer it. Add your next product.",
    ]) {
      expect(html).toContain(heading);
    }
  });

  it("ships the real developer-context snippet from the shipped API", () => {
    expect(html).toContain("SupportSealWidget.q.push");
    expect(html).toContain("identify");
    expect(html).toContain("context");
  });

  it("includes hero screenshot slots (desktop + mobile art direction)", () => {
    expect(html).toContain("Screenshot placeholder: S1 ");
    expect(html).toContain("Screenshot placeholder: S1m");
  });
});

describe("marketing features page", () => {
  const html = renderToStaticMarkup(<FeaturesPage />);

  it("renders the hero with both CTAs", () => {
    expect(html).toContain("Follow the Conversation from the first message to the next reply");
    expect(html).toContain('href="/register"');
    expect(html).toContain('href="/pricing"');
  });

  it("renders one anchored section per features copy row", () => {
    const anchors = [
      "products",
      "email",
      "away",
      "inbox",
      "context",
      "statuses",
      "saved-replies",
      "attachments",
      "team",
      "onboarding",
    ];
    for (const anchor of anchors) {
      expect(html).toContain(`id="${anchor}"`);
    }
    for (const heading of [
      "Give every product a place to reach you",
      "Reuse an answer, then make it specific",
      "Bring your team into the same Workspace",
      "Start with a real exchange",
    ]) {
      expect(html).toContain(heading);
    }
  });
});

describe("marketing pricing page", () => {
  const html = renderToStaticMarkup(<PricingPage />);

  it("shows the model, not invented numbers", () => {
    expect(html).toContain("Each Conversation counts once ever");
    expect(html).toContain("Unlimited");
    expect(html).toContain("No per-seat pricing");
    expect(html).not.toMatch(/\$\s?\d/); // no dollar figures until Pete decides (issue #6)
  });

  it("marks every undecided number as TBD with its config path", () => {
    expect(html).toContain('data-config-key="pricingConfig.hostedPro.monthlyPriceUsd"');
    expect(html).toContain('data-config-key="pricingConfig.hostedFree.monthlyConversations"');
    expect((html.match(/TBD/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("explains counting with Counted/Not counted labels (never colour alone)", () => {
    expect(html).toContain("How a Conversation is counted");
    expect(html).toContain("Counted");
    expect((html.match(/Not counted/g) ?? []).length).toBe(3);
  });

  it("renders the pricing FAQ questions verbatim", () => {
    expect(html).toContain("Is there a charge for every message?");
    expect(html).toContain("Can I self-host for free?");
  });

  it("renders an accessible comparison table", () => {
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain("Where data lives");
  });
});

describe("marketing open-source page", () => {
  const html = renderToStaticMarkup(<OpenSourcePage />);

  it("uses the canonical hero and licence copy", () => {
    expect(html).toContain("Run your support desk on your infrastructure");
    expect(html).toContain("AGPLv3");
    expect(html).toContain("Read the licence");
  });

  it("copies the quick-start commands verbatim from the guide", () => {
    expect(html).toContain("git clone https://github.com/pietervw/supportseal.git");
    expect(html).toContain("cd supportseal");
    expect(html).toContain("cp .env.example .env");
    expect(html).toContain("docker compose up -d");
  });

  it("lists what you run and closes by pointing at hosted plans", () => {
    expect(html).toContain("What you run");
    expect(html).toContain("PostgreSQL");
    expect(html).toContain("Prefer we host it?");
    expect(html).toContain('href="/pricing"');
  });
});
