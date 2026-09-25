import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { ConfigValue } from "@/components/marketing/config-value";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqList } from "@/components/marketing/faq-list";
import { ScreenshotFrame } from "@/components/marketing/screenshot-frame";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CORE_CAPABILITIES } from "@/config/hosting-comparison";
import { isHostedMode } from "@/lib/hosting";
import { assertPricingCompleteForHostedProduction, pricingConfig } from "@/config/pricing";
import { siteConfig } from "@/config/site";

// A hosted production build must fail while any public pricing value is
// unset, so "TBD" can never reach customers (docs/design/marketing-site.md).
if (process.env.NODE_ENV === "production" && isHostedMode()) {
  assertPricingCompleteForHostedProduction();
}

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Hosted plans based on Conversation volume. Each Conversation counts once ever. Unlimited Products, no per-seat pricing and free self-hosting.",
  openGraph: {
    title: "Each Conversation counts once ever",
    description: "Choose hosted Free or Pro, or self-host for free. Unlimited Products and no per-seat pricing.",
    type: "website",
  },
};

const COUNTING_TIMELINE: TimelineItem[] = [
  {
    title: "A Conversation opens",
    description: "A visitor starts a chat on one of your products.",
    time: "Month 1",
    color: "success",
    extra: (
      <Badge color="success" variant="light" className="mt-2">
        Counted
      </Badge>
    ),
  },
  {
    title: "It continues",
    description: "Agent replies; the visitor leaves, and the reply continues by email.",
    time: "Month 1",
    extra: (
      <Badge color="secondary" variant="light" className="mt-2">
        Not counted
      </Badge>
    ),
  },
  {
    title: "Closed",
    description: "The Conversation is resolved and closed.",
    time: "Month 1",
    extra: (
      <Badge color="secondary" variant="light" className="mt-2">
        Not counted
      </Badge>
    ),
  },
  {
    title: "It reopens",
    description: "The customer replies next month; the same Conversation reopens.",
    time: "Month 2",
    extra: (
      <Badge color="secondary" variant="light" className="mt-2">
        Not counted
      </Badge>
    ),
  },
];

const FAQ_ITEMS = [
  {
    question: "Is there a charge for every message?",
    answer: "No. Usage counts Conversations. Sending more messages in the same Conversation does not increase the count.",
  },
  {
    question: "Is this a separate charge for each Conversation?",
    answer:
      "No. The hosted model uses plans: Free includes a monthly Conversation allowance, and Pro has unlimited Conversations for its subscription price.",
  },
  {
    question: "What happens if I go over the Free allowance?",
    answer: (
      <>
        Incoming messages keep being accepted. Billing shows your usage, a {pricingConfig.graceDays}-day
        grace window and an upgrade option. Going over the allowance does not automatically upgrade
        your plan.
      </>
    ),
  },
  {
    question: "Does adding a product or teammate change the price?",
    answer: "No. Products are unlimited, and there is no per-seat pricing.",
  },
  {
    question: "Can I self-host for free?",
    answer:
      "Yes. The AGPLv3 software has no self-hosting licence fee. You provide and maintain the infrastructure and email setup.",
  },
];

type PlanCell = { text: string } | { included: true } | { unset: string };

const COMPARISON_COLUMNS = ["Hosted Free", "Hosted Pro", "Self-hosted"];

const COMPARISON_ROWS: Array<{ label: string; cells: [PlanCell, PlanCell, PlanCell] }> = [
  {
    label: "Conversations per month",
    cells: [{ unset: "pricingConfig.hostedFree.monthlyConversations" }, { text: "Unlimited" }, { text: "No hosted Conversation allowance" }],
  },
  {
    label: "Products",
    cells: [{ text: "Unlimited" }, { text: "Unlimited" }, { text: "Unlimited" }],
  },
  {
    label: "Team",
    cells: [{ text: "No per-seat pricing" }, { text: "No per-seat pricing" }, { text: "Unlimited agents" }],
  },
  ...CORE_CAPABILITIES.map((capability) => ({
    label: capability,
    cells: [{ included: true }, { included: true }, { included: true }] as [PlanCell, PlanCell, PlanCell],
  })),
  {
    label: "Billing",
    cells: [{ text: "Stripe subscription" }, { text: "Stripe subscription" }, { text: "Not required" }],
  },
  {
    label: "Updates",
    cells: [{ text: "Handled by the service" }, { text: "Handled by the service" }, { text: "Documented in the guide" }],
  },
  {
    label: "Where data lives",
    cells: [{ text: "Managed service" }, { text: "Managed service" }, { text: "Your infrastructure" }],
  },
];

function ComparisonCell({ cell }: { cell: PlanCell }) {
  if ("included" in cell) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <IconCheck aria-hidden className="size-4 text-primary" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if ("unset" in cell) {
    return <ConfigValue value={pricingConfig.hostedFree.monthlyConversations} configKey={cell.unset} />;
  }
  return <>{cell.text}</>;
}

function ComparisonTable() {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Hosting plan comparison"
      className="relative max-w-full overflow-x-auto rounded-lg border border-border bg-surface"
    >
      <table className="w-full min-w-[40rem] border-collapse text-[0.933rem]">
        <caption className="sr-only">
          Feature comparison of hosted Free, hosted Pro and self-hosted installations
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="sticky start-0 bg-surface px-4 py-3 text-start font-semibold text-heading">
              <span className="sr-only">Feature</span>
            </th>
            {COMPARISON_COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 text-start font-semibold text-heading">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-b-0">
              <th scope="row" className="sticky start-0 bg-surface px-4 py-3 text-start font-medium text-heading">
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td key={index} className="px-4 py-3 text-body">
                  <ComparisonCell cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PricingPage() {
  return (
    <>
      <Section className="pb-8 lg:pb-12">
        <div className="max-w-[40rem]">
          <h1 className="text-[clamp(2.4rem,1.6rem+3.2vw,3.73rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-heading">
            Pricing around the Conversations you handle
          </h1>
          <p className="mt-5 text-[1.2rem] leading-[1.6] text-body">
            Each Conversation counts once ever. Add unlimited Products and bring your team without
            per-seat pricing. Choose a hosted plan or self-host for free.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="solid" color="primary" size="lg">
              <Link href="/register">Start on Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/open-source">Explore self-hosting</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Plan cards */}
      <Section band="surface">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="flex h-full flex-col pt-6">
              <h2 className="text-[1.33rem] font-semibold tracking-[-0.01em] text-heading">Hosted Free</h2>
              <p className="mt-3 text-[1.2rem] text-heading">Free</p>
              <p className="mt-2 text-[0.933rem] text-muted">
                Start receiving and answering support messages.
              </p>
              <dl className="mt-5 flex flex-col gap-2.5 text-[0.9375rem]">
                <div className="flex gap-2">
                  <dt className="text-muted">Conversations:</dt>
                  <dd className="text-body">
                    <ConfigValue
                      value={pricingConfig.hostedFree.monthlyConversations}
                      configKey="pricingConfig.hostedFree.monthlyConversations"
                    />{" "}
                    new Conversations per month
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Products:</dt>
                  <dd className="text-body">Unlimited</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Team:</dt>
                  <dd className="text-body">No per-seat pricing</dd>
                </div>
              </dl>
              <div className="mt-6 pt-2">
                <Button asChild variant="outline" size="md" className="w-full sm:w-auto">
                  <Link href="/register">Start on Free</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col pt-6">
              <h2 className="text-[1.33rem] font-semibold tracking-[-0.01em] text-heading">Hosted Pro</h2>
              <p className="mt-3 flex flex-wrap items-baseline gap-1.5 text-[1.2rem] text-heading">
                <ConfigValue
                  value={pricingConfig.hostedPro.monthlyPriceUsd}
                  configKey="pricingConfig.hostedPro.monthlyPriceUsd"
                />
                <span className="text-[0.933rem] text-muted">USD / month</span>
              </p>
              <p className="mt-2 text-[0.933rem] text-muted">
                An unlimited Conversation allowance for your Workspace.
              </p>
              <dl className="mt-5 flex flex-col gap-2.5 text-[0.9375rem]">
                <div className="flex gap-2">
                  <dt className="text-muted">Conversations:</dt>
                  <dd className="text-body">Unlimited</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Products:</dt>
                  <dd className="text-body">Unlimited</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Team:</dt>
                  <dd className="text-body">No per-seat pricing</dd>
                </div>
              </dl>
              <div className="mt-6 pt-2">
                <Button asChild variant="solid" color="primary" size="md" className="w-full sm:w-auto">
                  <Link href="/register">Choose Pro</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col pt-6">
              <h2 className="text-[1.33rem] font-semibold tracking-[-0.01em] text-heading">Self-hosted</h2>
              <p className="mt-3 text-[1.2rem] text-heading">Free software</p>
              <p className="mt-2 text-[0.933rem] text-muted">
                Run the core support tools on your infrastructure.
              </p>
              <dl className="mt-5 flex flex-col gap-2.5 text-[0.9375rem]">
                <div className="flex gap-2">
                  <dt className="text-muted">Conversations:</dt>
                  <dd className="text-body">No hosted Conversation allowance</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Products:</dt>
                  <dd className="text-body">Unlimited</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Team:</dt>
                  <dd className="text-body">Unlimited agents</dd>
                </div>
              </dl>
              <div className="mt-6 pt-2">
                <Button asChild variant="outline" size="md" className="w-full sm:w-auto">
                  <a href={siteConfig.selfHostingGuideUrl} target="_blank" rel="noopener">
                    Read the self-hosting guide
                    <span className="sr-only"> (opens on GitHub)</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <p className="mt-6 max-w-[40rem] text-[1rem] text-muted">
          Self-hosting has no software licence fee. You cover your infrastructure and any
          email-provider costs, and manage your installation.
        </p>
      </Section>

      {/* How a Conversation is counted */}
      <Section>
        <SectionHeading
          title="How a Conversation is counted"
          lead="A Conversation counts once, in the UTC calendar month it first opens."
        />
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <Timeline items={COUNTING_TIMELINE} />
          <div className="max-w-[40rem] text-[1.067rem] leading-[1.65] text-body">
            <p>
              The number of messages doesn&apos;t change that count. Replies, reopening a Closed
              Conversation and continuing the same chat by email do not count again — even when the
              reply comes in a later month.
            </p>
            <p className="mt-4">
              A separate new Conversation counts separately, including one from a customer who has
              contacted you before.
            </p>
          </div>
        </div>
      </Section>

      {/* If you go over */}
      <Section band="surface">
        <SectionHeading title="If you go over the Free allowance" />
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="max-w-[40rem] text-[1.067rem] leading-[1.65] text-body">
            <p>
              Incoming messages keep being accepted. Billing shows your usage, a{" "}
              {pricingConfig.graceDays}-day grace window and an upgrade option. Going over the
              allowance does not automatically upgrade your plan.
            </p>
          </div>
          <ScreenshotFrame
            shotId="S10"
            alt="Hosted billing page showing the usage meter for the current period"
          />
        </div>
      </Section>

      {/* Comparison table */}
      <Section>
        <SectionHeading title="Compare the hosting options" />
        <div className="mt-10">
          <ComparisonTable />
        </div>
      </Section>

      {/* Pricing FAQ */}
      <Section band="surface">
        <SectionHeading title="Pricing questions" />
        <div className="mt-10 max-w-[50rem]">
          <FaqList items={FAQ_ITEMS} />
        </div>
      </Section>

      <CtaBand
        title="Pricing around the Conversations you handle"
        lead="Each Conversation counts once ever. Add unlimited Products and bring your team without per-seat pricing. Choose a hosted plan or self-host for free."
        primary={{ label: "Start on Free", href: "/register" }}
        secondary={{ label: "Explore self-hosting", href: "/open-source" }}
      />
    </>
  );
}
