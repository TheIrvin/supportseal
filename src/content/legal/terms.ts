import { placeholder, type LegalDocument } from "@/config/legal";

import { ADDRESS, CONTACT_EMAIL, EFFECTIVE_DATE, ENTITY, NAME, SITE } from "./shared";

export const terms: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  description: `The terms that govern use of the hosted ${NAME} service at ${SITE}.`,
  effectiveDate: EFFECTIVE_DATE,
  sections: [
    {
      id: "about",
      heading: "About these Terms",
      blocks: [
        `These Terms of Service ("Terms") govern your access to and use of the hosted ${NAME} service available at ${SITE} (the "Service"). The Service is operated by ${ENTITY} ("we", "us", "our").`,
        `By creating an account or using the Service you agree to these Terms, our Privacy Policy and our Acceptable Use Policy. If you use the Service on behalf of an organisation, you confirm that you are authorised to accept these Terms for it, and "you" includes that organisation.`,
        `If you do not agree to these Terms, do not use the Service.`,
      ],
    },
    {
      id: "hosted-vs-software",
      heading: "The hosted Service and the open-source software",
      blocks: [
        `${NAME} is also published as open-source software under the GNU Affero General Public License version 3 ("AGPLv3"). These Terms apply only to the hosted Service that we operate. If you download and run the software yourself, the AGPLv3 governs your use of the software and these Terms do not apply to your installation.`,
        `Nothing in these Terms limits the rights the AGPLv3 grants you in the software. These Terms do not grant you any right to use our names, logos or other brand features.`,
      ],
    },
    {
      id: "eligibility-accounts",
      heading: "Eligibility and accounts",
      blocks: [
        `You must be at least ${placeholder("minimum age for account holders")} and able to form a binding contract to use the Service. The Service is intended for businesses and individuals providing customer support for their own products; it is not intended for personal, family or household use.`,
        `You must give accurate account information and keep it up to date. You are responsible for keeping your password confidential and for all activity under your account. Tell us promptly at ${CONTACT_EMAIL} if you believe your account has been accessed without authorisation.`,
        `A Workspace is administered by its Admins. Admins decide who is invited to the Workspace and are responsible for the actions of the members they invite.`,
      ],
    },
    {
      id: "customer-data",
      heading: "Your content and your customers' data",
      blocks: [
        `"Customer Data" means the content that you, your team and the people who contact you through the Service submit to it, including chat and email messages, attachments, contact details, notes, tags and any context your applications send through the ${NAME} widget or developer APIs.`,
        `As between you and us, you own your Customer Data. You grant us a limited licence to host, copy, transmit, process and display Customer Data only as needed to provide, secure and support the Service for you, and as described in our Privacy Policy.`,
        [
          `You are responsible for having the rights and any consents needed to submit Customer Data to the Service.`,
          `You are responsible for telling the people who contact you how their information is handled, for example in your own privacy notice.`,
          `You must not use the Service to collect or store categories of data the Acceptable Use Policy prohibits, such as payment card numbers or health information regulated by specific laws.`,
        ],
        `We process Customer Data on your behalf and according to your instructions as expressed through your use of the Service. ${placeholder("whether a data processing agreement (DPA) is offered, and where to find it")}`,
      ],
    },
    {
      id: "acceptable-use",
      heading: "Acceptable use",
      blocks: [
        `Your use of the Service must comply with our Acceptable Use Policy, which forms part of these Terms.`,
      ],
    },
    {
      id: "plans-fees",
      heading: "Plans, fees and usage limits",
      blocks: [
        `The Service offers a free plan and may offer paid plans. The plans, prices and usage allowances in effect are those shown on our pricing page at the time. Usage allowances are measured as described there.`,
        `Fees for paid plans are billed in advance through our payment processor. ${placeholder("billing cycle, taxes, refund policy, failed-payment handling and notice period for price changes")}`,
      ],
    },
    {
      id: "early-service",
      heading: "Changes to the Service",
      blocks: [
        `The Service is at an early stage of development. We may add, change or remove features. We do not currently offer a service-level agreement or guaranteed uptime.`,
        `If we make a change that materially reduces the Service you rely on, we will try to give you reasonable notice. ${placeholder("minimum notice commitment, if any")}`,
      ],
    },
    {
      id: "termination",
      heading: "Suspension, termination and your data",
      blocks: [
        `You may stop using the Service at any time. The Service does not yet offer self-serve account or Workspace deletion; to close your account and delete your Workspace, contact us at ${CONTACT_EMAIL}.`,
        `We may suspend or terminate your access if you materially breach these Terms or the Acceptable Use Policy, if required by law, or if your use poses a security or operational risk to the Service or other customers. Where reasonable, we will tell you first and give you an opportunity to fix the problem.`,
        `After termination, we delete Customer Data within ${placeholder("deletion period after account closure, including backup expiry")}. Before deletion, you may ask us for a copy of your Customer Data; ${placeholder("export commitment, format and request window")}`,
      ],
    },
    {
      id: "third-parties",
      heading: "Third-party services",
      blocks: [
        `The Service relies on third-party providers, listed on our Subprocessors page. Websites and applications where you install the ${NAME} widget, and email providers you connect, are your own responsibility; their terms apply to your use of them.`,
      ],
    },
    {
      id: "disclaimers",
      heading: "Disclaimers",
      blocks: [
        `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE OR SECURE, OR THAT MESSAGES OR EMAILS WILL ALWAYS BE DELIVERED.`,
        `Some jurisdictions do not allow certain warranty exclusions, so some of the above may not apply to you.`,
      ],
    },
    {
      id: "liability",
      heading: "Limitation of liability",
      blocks: [
        `TO THE FULLEST EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA OR GOODWILL, ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS.`,
        `OUR TOTAL LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS WILL NOT EXCEED ${placeholder("liability cap, e.g. fees paid in a stated period, and any minimum amount")}.`,
        `Nothing in these Terms excludes or limits liability that cannot be excluded or limited by law.`,
      ],
    },
    {
      id: "indemnity",
      heading: "Indemnity",
      blocks: [
        `To the extent permitted by law, you will defend and indemnify us against third-party claims arising from your Customer Data or your breach of these Terms or the Acceptable Use Policy. ${placeholder("confirm whether an indemnity is included, and its scope")}`,
      ],
    },
    {
      id: "changes",
      heading: "Changes to these Terms",
      blocks: [
        `We may update these Terms. We will post the updated version on this page with a new effective date. If a change is material, we will notify account holders by email or in the Service ${placeholder("notice period before material changes take effect")} before it takes effect. If you continue to use the Service after the change takes effect, the updated Terms apply.`,
      ],
    },
    {
      id: "law",
      heading: "Governing law and disputes",
      blocks: [
        `These Terms are governed by the laws of ${placeholder("governing law jurisdiction")}. ${placeholder("dispute-resolution mechanism, venue, and any arbitration or class-action terms")}`,
      ],
    },
    {
      id: "general",
      heading: "General",
      blocks: [
        `These Terms, together with the Privacy Policy and Acceptable Use Policy, are the entire agreement between you and us about the Service. If any provision is found unenforceable, the rest remain in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition or sale of the Service, with notice to you.`,
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [`${ENTITY}`, `${ADDRESS}`, `Email: ${CONTACT_EMAIL}`],
    },
  ],
};
