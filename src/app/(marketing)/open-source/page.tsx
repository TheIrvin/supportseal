import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/marketing/code-block";
import { CtaBand } from "@/components/marketing/cta-band";
import { HostingComparison } from "@/components/marketing/hosting-comparison";
import { Section, SectionHeading } from "@/components/marketing/section";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Self-host & open source",
  description: `Self-host ${siteConfig.name} under AGPLv3. Explore the Docker Compose configuration and guides for email setup, backups and upgrades.`,
  openGraph: {
    title: "Your support desk, on your infrastructure",
    description: "AGPLv3 source, free self-hosting and a Docker Compose configuration for your support desk.",
    type: "website",
  },
};

/** Verbatim quick start from docs/self-hosting.md (commands are never paraphrased). */
const QUICK_START = `git clone https://github.com/pietervw/supportseal.git
cd supportseal
cp .env.example .env        # then edit (see the reference below)
docker compose up -d`;

const WHAT_YOU_RUN = [
  { name: "App", detail: "The application container on port 3000" },
  { name: "PostgreSQL", detail: "PostgreSQL 17 with a persistent volume" },
  { name: "Migrate job", detail: "One-shot database migration before the app boots" },
  { name: "Your SMTP provider", detail: "Delivers agent replies by email" },
  { name: "Inbound email forwarding", detail: "Your provider forwards support mail in" },
];

export default function OpenSourcePage() {
  return (
    <>
      <Section className="pb-8 lg:pb-12">
        <div className="max-w-[40rem]">
          <h1 className="text-[clamp(2.4rem,1.6rem+3.2vw,3.73rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-heading">
            Run your support desk on your infrastructure
          </h1>
          <p className="mt-5 text-[1.2rem] leading-[1.6] text-body">
            {siteConfig.name} is open source under AGPLv3 and free to self-host. Use the same core
            support tools for your products in a single Workspace, with no hosted subscription
            required.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="solid" color="primary" size="lg">
              <a href={siteConfig.selfHostingGuideUrl} target="_blank" rel="noopener">
                Read the self-hosting guide
                <span className="sr-only"> (opens on GitHub)</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={siteConfig.repositoryUrl} target="_blank" rel="noopener">
                View the source
                <span className="sr-only"> (opens on GitHub)</span>
              </a>
            </Button>
          </div>
        </div>
      </Section>

      <Section band="surface">
        <SectionHeading
          title="Docker Compose configuration included"
          lead="The repository includes a Docker Compose configuration for the app, PostgreSQL and database migrations."
        />
        <div className="mt-10 max-w-[50rem]">
          <CodeBlock code={QUICK_START} label="Self-hosting quick start commands" />
          <p className="mt-4 text-[1.067rem] leading-[1.65] text-body">
            Follow the guide to configure the environment and use the documented start command. The
            guide also covers email configuration, HTTPS, backups and upgrades.
          </p>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Your products and team, in one installation" />
        <div className="mt-6 max-w-[40rem] text-[1.067rem] leading-[1.65] text-body">
          <p>
            A self-hosted installation serves one Workspace with unlimited Products and agents. Work
            from the shared inbox, connect chat and support email, supply app context and use notes,
            tags and saved replies. The core workflow uses the same source as hosted mode.
          </p>
        </div>
        <div className="mt-10">
          <HostingComparison />
        </div>
      </Section>

      <Section band="surface">
        <SectionHeading title="What you run" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_YOU_RUN.map((component) => (
            <li
              key={component.name}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <p className="text-[1.067rem] font-semibold text-heading">{component.name}</p>
              <p className="mt-1 text-[0.933rem] text-muted">{component.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading title="Bring your email setup" />
        <div className="mt-6 max-w-[40rem] text-[1.067rem] leading-[1.65] text-body">
          <p>
            Configure inbound forwarding and a provider webhook or forwarder to receive support
            mail. Connect SMTP to deliver replies. Self-hosting does not require the managed service
            or hosted billing; you operate the installation and its email connections.
          </p>
        </div>
      </Section>

      <Section band="surface">
        <SectionHeading title="Read the source. Run it yourself." />
        <div className="mt-6 max-w-[40rem] text-[1.067rem] leading-[1.65] text-body">
          <p>
            The source is published under AGPLv3. Explore the code and read the licence in the
            repository. There is no software licence fee for self-hosting.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline" size="md">
            <a href={siteConfig.repositoryUrl} target="_blank" rel="noopener">
              View the source
              <span className="sr-only"> (opens on GitHub)</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="md">
            <a href={siteConfig.licenseUrl} target="_blank" rel="noopener">
              Read the licence
              <span className="sr-only"> (opens on GitHub)</span>
            </a>
          </Button>
        </div>
      </Section>

      <CtaBand
        band="ink"
        title="Prefer we host it?"
        primary={{ label: "See hosted plans", href: "/pricing" }}
      />
    </>
  );
}
