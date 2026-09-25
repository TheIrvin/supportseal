import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/marketing/code-block";
import { CtaBand } from "@/components/marketing/cta-band";
import { ScreenshotFrame } from "@/components/marketing/screenshot-frame";
import { Section, SectionHeading } from "@/components/marketing/section";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

import { FeaturesNav, type FeaturesNavItem } from "./features-nav";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore a shared inbox, live chat, support email, app context, notes, tags, saved replies and attachments for the products you build.",
  openGraph: {
    title: "Follow the Conversation",
    description: "Chat, email and the app context you supply, together in your team's inbox.",
    type: "website",
  },
};

const CONTEXT_SNIPPET = `window.SupportSealWidget = window.SupportSealWidget || { q: [] };
SupportSealWidget.q.push(["identify", {
  userId: "u_1042",
  email: "sam@example.com",
}]);
SupportSealWidget.q.push(["context", {
  plan: "Pro",
  appVersion: "2.4.1",
  adminUrl: "https://admin.example.com/accounts/1042",
}]);`;

type FeatureSection = {
  id: string;
  title: string;
  body: React.ReactNode;
  shot: { id: string; alt: string; withCode?: boolean };
};

const SECTIONS: FeatureSection[] = [
  {
    id: "products",
    title: "Give every product a place to reach you",
    body: "Set each Product's name, colour and allowed domains, then embed its chat widget. Customers can start a live chat without an account or email address.",
    shot: { id: "S2", alt: "A product's chat widget panel with one live exchange" },
  },
  {
    id: "email",
    title: "Answer email where you answer chat",
    body: "Forward your support addresses to their Product inbox addresses. Read and reply in the shared inbox, with the Product identified in the email sender name.",
    shot: { id: "S6", alt: "Email reply arriving in the same conversation as an earlier chat" },
  },
  {
    id: "away",
    title: "Keep support open when you step away",
    body: "Set the Workspace to Away so new chat visitors leave a message and reply address. Continue by email when a visitor has left an address and is no longer connected.",
    shot: { id: "S7", alt: "Chat widget in away mode, asking for a message and an email address" },
  },
  {
    id: "inbox",
    title: "Find the thread you need",
    body: "Filter by Product or status. Search message text, subjects, customer names and email addresses across your Workspace.",
    shot: { id: "S4", alt: "Inbox filtered to one product with a shortened conversation list" },
  },
  {
    id: "context",
    title: "See the details your app can provide",
    body: "Use identify() and context() to send customer and app details into the Conversation panel. Include an account, plan, version or admin link where it helps you answer.",
    shot: { id: "S5", alt: "Context panel beside a conversation showing account, plan, version and admin link", withCode: true },
  },
  {
    id: "statuses",
    title: "Keep track of the work",
    body: "Use Open, Pending and Closed states. Add internal notes for your team and tags for the topics you handle.",
    shot: { id: "S1", alt: "Inbox with conversations at different statuses across products" },
  },
  {
    id: "saved-replies",
    title: "Reuse an answer, then make it specific",
    body: "Admins maintain shared saved replies. Insert one into your reply, edit the wording and send it when you're ready.",
    shot: { id: "S11", alt: "Saved-reply picker open over a conversation with a note and a tag" },
  },
  {
    id: "attachments",
    title: "Keep files with the question",
    body: "Share supported attachments through chat and email. See them alongside the messages they belong to.",
    shot: { id: "S-attachments", alt: "Conversation showing a shared file attachment" },
  },
  {
    id: "team",
    title: "Bring your team into the same Workspace",
    body: "Invite teammates as Admins or Agents. Admins manage Products and invitations; Agents work in the inbox.",
    shot: { id: "S9", alt: "Team settings listing members with Admin and Agent roles" },
  },
  {
    id: "onboarding",
    title: "Start with a real exchange",
    body: "Follow onboarding to add a Product, allow its domain and install the widget. Send a test message, answer it and add your next Product.",
    shot: { id: "S8", alt: "Onboarding install step with the embed snippet and a copy button" },
  },
];

const NAV_ITEMS: FeaturesNavItem[] = SECTIONS.map((section) => ({ id: section.id, label: section.title }));

export default function FeaturesPage() {
  return (
    <>
      <Section className="pb-8 lg:pb-12">
        <div className="max-w-[40rem]">
          <h1 className="text-[clamp(2.4rem,1.6rem+3.2vw,3.73rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-heading">
            Follow the Conversation from the first message to the next reply
          </h1>
          <p className="mt-5 text-[1.2rem] leading-[1.6] text-body">
            {siteConfig.name} brings your products&apos; chat, support email and supplied app
            context into one inbox.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="solid" color="primary" size="lg">
              <Link href="/register">Set up your inbox</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
        {/* Chip row sits directly under the hero text (not sticky, design doc). */}
        <FeaturesNav items={NAV_ITEMS} variant="chips" />
      </Section>

      {/* Sticky "On this page" sidebar beside the section column on lg; the
          chip row (inside FeaturesNav) shows under the hero on small screens.
          The grid keeps the nav sticky across every section. */}
      <div className="mx-auto w-full max-w-[80rem] px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <FeaturesNav items={NAV_ITEMS} variant="sidebar" />
          <div className="min-w-0">
            {SECTIONS.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className={cn(
                  "border-y border-border py-12 sm:py-16 lg:py-20",
                  index % 2 === 0 ? "bg-surface" : "bg-body-bg",
                )}
              >
                <div className="max-w-[50rem]">
                  <SectionHeading id={`${section.id}-heading`} title={section.title} />
                  <p className="mt-4 max-w-[40rem] text-[1.067rem] leading-[1.65] text-body">
                    {section.body}
                  </p>
                </div>
                <div className="mt-10 max-w-[60rem]">
                  <ScreenshotFrame shotId={section.shot.id} alt={section.shot.alt} />
                  {section.shot.withCode ? (
                    <div className="mt-6">
                      <CodeBlock code={CONTEXT_SNIPPET} label="Developer context snippet" />
                    </div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <CtaBand
        title="Follow the Conversation from the first message to the next reply"
        lead={`${siteConfig.name} brings your products' chat, support email and supplied app context into one inbox.`}
        primary={{ label: "Set up your inbox", href: "/register" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  );
}
