import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/marketing/code-block";
import { CtaBand } from "@/components/marketing/cta-band";
import { FeatureRow } from "@/components/marketing/feature-row";
import { HostingComparison } from "@/components/marketing/hosting-comparison";
import { ScreenshotFrame } from "@/components/marketing/screenshot-frame";
import { Section, SectionHeading } from "@/components/marketing/section";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — One inbox for all your products` },
  description:
    "Handle chat and support email for your products in one inbox, with the app context you send beside each Conversation. Explore hosted plans or self-host.",
  // OG image: static crop of S1 with the logo, added once captures exist
  // (docs/design/marketing-site.md "SEO and metadata").
  openGraph: {
    title: "One inbox for everything you build",
    description: `Give each product its own chat and support email. Answer from one inbox with ${siteConfig.name}.`,
    type: "website",
  },
};

/**
 * Async-safe developer-context snippet, matching the shipped widget API
 * exactly (src/app/api/widget/js/route.ts; docs/design/chat-widget.md
 * "Developer context API"). The copy pass never edits code.
 */
const CONTEXT_SNIPPET = `<script>
  window.SupportSealWidget = window.SupportSealWidget || { q: [] };
  SupportSealWidget.q.push(["identify", {
    userId: "u_1042",
    email: "sam@example.com",
    name: "Sam Field",
  }]);
  SupportSealWidget.q.push(["context", {
    plan: "Pro",
    appVersion: "2.4.1",
  }]);
</script>`;

export default function HomePage() {
  return (
    <>
      {/* Hero (outcome). Left-aligned text column, then the real inbox shot. */}
      <Section className="pb-12 lg:pb-16">
        <div className="max-w-[40rem]">
          <p className="text-[1rem] text-muted">For founders supporting several products</p>
          <h1 className="mt-3 text-[clamp(2.4rem,1.6rem+3.2vw,3.73rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-heading">
            One inbox for everything you build.
          </h1>
          <p className="mt-5 text-[1.2rem] leading-[1.6] text-body">
            Give each product its own chat widget and support email. Answer from one inbox, with the
            customer and app details you choose to send beside the Conversation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="solid" color="primary" size="lg">
              <Link href="/register">Set up your inbox</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/open-source">Explore self-hosting</Link>
            </Button>
          </div>
          <p className="mt-4 text-[0.933rem] text-muted">
            Start with a message from one product. Add the next to the same inbox.
          </p>
        </div>
        <div className="mt-10 lg:mt-14">
          {/* Art direction: mobile gets the dedicated mobile capture (S1m). */}
          <div className="lg:hidden">
            <ScreenshotFrame
              shotId="S1m"
              eager
              alt="Mobile inbox listing conversations from several products"
            />
          </div>
          <div className="hidden lg:block">
            <ScreenshotFrame
              shotId="S1"
              eager
              alt="Inbox showing conversations from all products, with the sidebar listing three products and a context panel beside the selected conversation"
            />
          </div>
        </div>
      </Section>

      {/* How it works (feature rows). */}
      <Section band="surface">
        <FeatureRow
          headingLevel="h2"
          title="Keep each product in view"
          media={
            <ScreenshotFrame
              shotId="S4"
              alt="Inbox scoped to one product with a filtered conversation list"
              caption="Each product has its own name and colour. Your team shares the inbox."
            />
          }
        >
          <p>
            Work through support for all your products together. Each Conversation shows which
            product it belongs to. Filter to one product when you need to focus, then return to the
            full inbox.
          </p>
        </FeatureRow>
      </Section>

      <Section>
        <FeatureRow
          headingLevel="h2"
          reverse
          title="Chat now. Continue by email."
          media={
            <ScreenshotFrame
              shotId="S6"
              alt="Conversation that started as a chat and continued by email, with the email reply visible"
            />
          }
        >
          <p>
            Customers can start a live chat without creating an account. When you set support to
            Away, the widget asks for an email address with their message. If a chat visitor leaves
            an address and goes offline, your reply can reach them by email in the same
            Conversation.
          </p>
          <p className="mt-4">
            Already have support addresses? Forward each one to its Product&apos;s inbox address and
            answer incoming email alongside chat.
          </p>
        </FeatureRow>
      </Section>

      <Section band="surface">
        <FeatureRow
          headingLevel="h2"
          title="Bring the app details into the Conversation"
          media={
            <div className="flex flex-col gap-6">
              <ScreenshotFrame
                shotId="S5"
                alt="Context panel showing the identified user with their plan, app version, page URL and an admin link"
                caption="The app context you send, next to the customer's question."
              />
              <CodeBlock code={CONTEXT_SNIPPET} label="Developer context snippet" />
            </div>
          }
        >
          <p>
            Send the customer&apos;s account, plan, app version or admin link through{" "}
            <code className="font-mono text-[0.933rem]">identify()</code> and{" "}
            <code className="font-mono text-[0.933rem]">context()</code>. See those details beside
            their message while you answer. The widget also records the page origin and path,
            without the query string or fragment.
          </p>
        </FeatureRow>
      </Section>

      <Section>
        <FeatureRow
          headingLevel="h2"
          reverse
          title="Leave a useful thread for the next reply"
          media={
            <ScreenshotFrame
              shotId="S11"
              alt="Conversation with an internal note, a topic tag and the saved-reply picker open"
            />
          }
          actions={
            <Button asChild variant="text" color="primary" size="md" className="self-start px-0">
              <Link href="/features">Explore the features</Link>
            </Button>
          }
        >
          <p>
            Mark Conversations Open, Pending or Closed. Add an internal note, tag the topic and
            share files with the customer. For questions you answer often, insert a saved reply and
            edit it before sending.
          </p>
        </FeatureRow>
      </Section>

      {/* Hosting choice. */}
      <Section band="surface">
        <SectionHeading title="Choose how to run your support desk" />
        <div className="mt-10">
          <HostingComparison />
        </div>
      </Section>

      <CtaBand
        title="Receive a message. Answer it. Add your next product."
        lead="Create your Workspace, add a Product and install its widget. Send a test message and reply from your inbox. When you add another Product, its Conversations appear there too."
        primary={{ label: "Set up your inbox", href: "/register" }}
        secondary={{ label: "Explore self-hosting", href: "/open-source" }}
      />
    </>
  );
}
