import { placeholder, type LegalDocument } from "@/config/legal";

import { CONTACT_EMAIL, EFFECTIVE_DATE, NAME } from "./shared";

const ABUSE_EMAIL = placeholder("abuse and security reporting address");

export const acceptableUse: LegalDocument = {
  slug: "acceptable-use",
  title: "Acceptable Use Policy",
  description: `What you may not do with the hosted ${NAME} service. Part of the Terms of Service.`,
  effectiveDate: EFFECTIVE_DATE,
  sections: [
    {
      id: "about",
      heading: "About this policy",
      blocks: [
        `This Acceptable Use Policy is part of the ${NAME} Terms of Service and applies to everyone who uses the hosted Service, including every member of a Workspace. Workspace Admins are responsible for making sure their members follow it.`,
      ],
    },
    {
      id: "content",
      heading: "Prohibited content and activity",
      blocks: [
        `You may not use the Service to send, store or facilitate:`,
        [
          `anything illegal, or that promotes illegal activity;`,
          `child sexual abuse material, or any content that sexualises minors;`,
          `harassment, threats, or content that incites violence or hatred against people based on protected characteristics;`,
          `material that infringes someone else's intellectual property or privacy rights;`,
          `malware, phishing, or deceptive content, including impersonating another person, company or product;`,
          `spam: unsolicited bulk or commercial messages, or email to people who have not contacted you or otherwise agreed to hear from you.`,
        ],
      ],
    },
    {
      id: "email",
      heading: "Email",
      blocks: [
        `The Service's email features are for support conversations: receiving messages sent to your Products' support addresses and replying to the people who wrote them. Do not use them for marketing campaigns, newsletters or cold outreach. Only forward addresses and domains you control to the Service. You must also follow the acceptable-use rules of our email provider, Postmark.`,
      ],
    },
    {
      id: "sensitive-data",
      heading: "Sensitive data",
      blocks: [
        `The Service is not designed for regulated categories of data. Do not use it to collect or store, and do not send through the widget or developer APIs:`,
        [
          `payment card numbers or bank credentials;`,
          `government identification numbers;`,
          `health information governed by specific health-privacy laws;`,
          `passwords, authentication tokens or API secrets;`,
          `any other data that a law or contract requires to be handled under safeguards the Service does not claim to meet.`,
        ],
        `We do not claim compliance with HIPAA, PCI DSS, SOC 2 or similar frameworks.`,
      ],
    },
    {
      id: "security",
      heading: "Security and integrity of the Service",
      blocks: [
        `You may not:`,
        [
          `access, or try to access, another Workspace's data, or any account or system you are not authorised to use;`,
          `probe, scan or test the vulnerability of the hosted Service, or run load tests against it, without our written permission;`,
          `bypass rate limits, usage limits, domain restrictions or other technical controls;`,
          `install the ${NAME} widget on websites you do not control or are not authorised to use;`,
          `interfere with or disrupt the Service or other customers' use of it.`,
        ],
        `The ${NAME} source code is open under the AGPLv3; you are welcome to study it and run your own copy. These restrictions apply to the hosted Service that we operate.`,
      ],
    },
    {
      id: "reporting",
      heading: "Reporting abuse and security issues",
      blocks: [
        `To report abuse of the Service, or a security vulnerability, contact ${ABUSE_EMAIL}. Please do not include the details of a vulnerability in a public issue tracker.`,
      ],
    },
    {
      id: "enforcement",
      heading: "Enforcement",
      blocks: [
        `If we believe this policy has been breached, we may remove or disable content, limit features, or suspend or terminate the account or Workspace involved, as described in the Terms of Service. Where the law requires it, or where there is a risk of harm, we may report activity to the appropriate authorities.`,
        `Questions about this policy: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};
