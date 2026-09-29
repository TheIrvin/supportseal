import { placeholder, type LegalDocument } from "@/config/legal";

import { CONTACT_EMAIL, EFFECTIVE_DATE, NAME } from "./shared";

export const subprocessors: LegalDocument = {
  slug: "subprocessors",
  title: "Subprocessors",
  description: `Third-party providers that process personal information for the hosted ${NAME} service.`,
  effectiveDate: EFFECTIVE_DATE,
  sections: [
    {
      id: "about",
      heading: "About this list",
      blocks: [
        `A subprocessor is a third party that processes personal information on our behalf to run the hosted ${NAME} service. This list covers the hosted Service only. Self-hosted installations of ${NAME} do not use our subprocessors; their operators choose their own providers.`,
      ],
    },
    {
      id: "current",
      heading: "Subprocessors",
      blocks: [
        {
          caption: `Subprocessors of the hosted ${NAME} service`,
          head: ["Provider", "Purpose", "Data processed", "Location", "Status"],
          rows: [
            [
              `Hetzner Online GmbH ${placeholder("confirm contracting Hetzner entity")}`,
              "Infrastructure hosting: application servers, database and attachment storage",
              "All account data and Customer Data stored in the Service",
              `Germany ${placeholder("confirm datacentre location")}`,
              "Active",
            ],
            [
              "Postmark (ActiveCampaign LLC)",
              "Transactional support email: inbound processing and outbound delivery, including password-reset and usage-notification emails",
              "Message content, sender and recipient addresses, attachments, IP addresses",
              `United States; EU region available ${placeholder("region chosen at Postmark account setup")}`,
              "Planned: not yet enabled",
            ],
            [
              `Payment processor ${placeholder("legal name of the payment processor contracting entity (the code integrates Stripe)")}`,
              "Payment processing for paid plans",
              "Billing contact email, payment details, subscription status",
              placeholder("processing location"),
              "Planned: not yet enabled",
            ],
          ],
        },
        `The Service's website analytics, if enabled, run on a self-hosted Umami instance that we operate, not on a third-party analytics service.`,
      ],
    },
    {
      id: "pending",
      heading: "Pending confirmation before publication",
      blocks: [
        `Each item below must be confirmed and either added to the table above or removed from this section before this page goes live.`,
        [
          placeholder("Coolify: confirm whether Coolify Cloud (the managed control plane that deploys the Service and holds its environment configuration) is used, and whether it must be listed"),
          placeholder("Cloudflare: DNS is on Cloudflare; if the Cloudflare proxy is enabled for supportseal.app it processes all traffic and must be listed"),
          placeholder("Backup storage: provider and location of off-server database backups"),
          placeholder("Umami: server location of the self-hosted analytics instance"),
        ],
      ],
    },
    {
      id: "changes",
      heading: "Changes to this list",
      blocks: [
        `We will update this page before a new subprocessor starts processing personal information. ${placeholder("advance-notice mechanism and period for new subprocessors, e.g. email subscription")}`,
        `Questions: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};
