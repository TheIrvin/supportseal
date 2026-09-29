import { placeholder, type LegalDocument } from "@/config/legal";

import {
  ADDRESS,
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  ENTITY,
  NAME,
  SESSION_DAYS,
  SITE,
  VISITOR_COOKIE_DAYS,
} from "./shared";

const HOSTING_LOCATION = `Germany ${placeholder("confirm the Hetzner datacentre location of the production server")}`;

export const privacy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  description: `What personal information the hosted ${NAME} service collects, how it is used and shared, and the choices you have.`,
  effectiveDate: EFFECTIVE_DATE,
  sections: [
    {
      id: "summary",
      heading: "Summary",
      blocks: [
        [
          `We collect the information needed to run your account and to deliver the support conversations you handle in ${NAME}.`,
          `We do not sell personal information, and we do not share it for cross-context behavioural advertising.`,
          `Our marketing pages load no third-party advertising or tracking scripts.`,
          `The Service is hosted by Hetzner in ${HOSTING_LOCATION}.`,
          `This policy covers the hosted Service at ${SITE} only. Self-hosted installations of ${NAME} are run by their operators, who are responsible for their own privacy practices.`,
        ],
      ],
    },
    {
      id: "scope",
      heading: "Who we are and what this policy covers",
      blocks: [
        `The hosted ${NAME} service (the "Service") is operated by ${ENTITY} ("we", "us"). This policy explains how we handle personal information when you visit our website, create an account, or use the Service.`,
        `Our customers use the Service to talk to their own users. For the messages, contact details and other Customer Data those users send, our customer decides what is collected and why, and we process that information on the customer's behalf as their service provider. If you contacted a business that uses ${NAME}, that business's privacy notice applies, and you should send privacy requests to them. We will help our customers respond.`,
      ],
    },
    {
      id: "collect",
      heading: "Information we collect",
      blocks: [
        `Account information. When you sign up or are invited: your name, email address and password. Passwords are stored only as a salted hash (scrypt); we cannot read them. We also store your Workspace and Product names, your role, and the email addresses of people you invite.`,
        `Session and security information. When you sign in we create a session record containing your IP address and browser user-agent string. Sessions expire after ${SESSION_DAYS} days without use. Password-reset links expire after one hour. The chat widget uses visitors' IP addresses briefly, in memory, to rate-limit requests; they are not written to the database.`,
        `Customer Data we process for customers. When people contact a customer through the ${NAME} chat widget or by email, we process on the customer's behalf:`,
        [
          `messages, and any attachments with their file names, types and sizes;`,
          `the person's name and email address, if they provide them;`,
          `the website hostname the chat started on, and the page address (origin and path; query strings and fragments are removed);`,
          `information the customer's own application sends through the ${NAME} developer APIs, such as a user ID, name, email address, plan or other context the customer chooses to send;`,
          `for email, the sender and recipient addresses, subject, message identifiers used for threading, and delivery records;`,
          `internal notes, tags and replies written by the customer's team.`,
        ],
        `Marketing site. ${placeholder("confirm whether Umami analytics is enabled on the marketing pages at launch")} If analytics are enabled, we use a self-hosted instance of Umami that we operate. It records aggregate page-view information, such as the page visited, referrer, browser, operating system, device type and approximate country. Umami does not set cookies, and we do not use it to identify individual visitors.`,
        `Server logs. Our servers and hosting infrastructure record technical logs, which can include IP addresses, request paths, timestamps and, for failed email deliveries, email addresses. ${placeholder("log retention period")}`,
        `Billing information. If you buy a paid plan, our payment processor collects your payment details directly; we do not receive or store full card numbers. We receive a record of your subscription status.`,
        `Communications. If you email us, we keep the correspondence to answer you and to keep a record of the request.`,
      ],
    },
    {
      id: "use",
      heading: "How we use information",
      blocks: [
        [
          `To provide the Service: signing you in, routing chats and email to the right Workspace and Product, storing conversation history, and delivering replies.`,
          `To send service emails, such as password resets, email replies to your customers, bounce notices and usage notifications to Workspace Admins.`,
          `To measure usage against plan allowances and to bill paid plans.`,
          `To keep the Service secure, including isolating each Workspace's data, rate-limiting abuse, and investigating incidents.`,
          `To answer support requests and communicate with you about the Service.`,
          `To comply with legal obligations and enforce our Terms.`,
        ],
        `We do not use personal information for advertising, and we do not sell it.`,
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and similar technologies",
      blocks: [
        `We use only the storage needed for the Service to work. We do not use advertising or cross-site tracking cookies.`,
        {
          caption: "Cookies and browser storage used by the Service",
          head: ["Name", "Purpose", "Duration"],
          rows: [
            [
              "better-auth.session_token (or __Secure-better-auth.session_token)",
              "Keeps you signed in to the dashboard",
              `Up to ${SESSION_DAYS} days without use`,
            ],
            [
              "ss_visitor_<product id>",
              `Keeps a visitor's chat session in the ${NAME} widget on a customer's website (partitioned third-party cookie)`,
              `Up to ${VISITOR_COOKIE_DAYS} days`,
            ],
            [
              "Widget session storage",
              "Fallback for the chat session when the browser blocks the cookie above",
              "Until the browser tab is closed",
            ],
            ["theme (local storage)", "Remembers your light or dark theme choice", "Until you clear it"],
          ],
        },
        `Do Not Track and Global Privacy Control. Because we do not track visitors across websites or sell or share personal information for advertising, there is no such activity for these signals to switch off. We do not change our practices in response to Do Not Track signals.`,
      ],
    },
    {
      id: "share",
      heading: "How we share information",
      blocks: [
        [
          `With service providers (subprocessors) that host and operate parts of the Service for us, under contracts that limit their use of the data. They are listed on our Subprocessors page.`,
          `Within your Workspace: members of a Workspace can see its conversations, contacts, notes and tags.`,
          `When required by law, or to protect the rights, safety or security of our users, the public or us.`,
          `As part of a merger, acquisition or sale of the Service, in which case we will require the recipient to honour this policy.`,
          `With your consent or at your direction.`,
        ],
      ],
    },
    {
      id: "location",
      heading: "Where information is stored",
      blocks: [
        `The Service's database and attachment storage are hosted by Hetzner in ${HOSTING_LOCATION}. Some subprocessors, such as our email provider, may process information in other countries, including the United States; the Subprocessors page lists their locations. ${placeholder("international transfer mechanism, if one is required")}`,
      ],
    },
    {
      id: "retention",
      heading: "How long we keep information",
      blocks: [
        [
          `Account information: while your account exists.`,
          `Customer Data: until the customer deletes it or closes their Workspace. The Service does not yet provide self-serve deletion of conversations, contacts, Workspaces or accounts; we handle deletion on request (see "Your choices and rights").`,
          `Sessions: until they expire (${SESSION_DAYS} days without use) or you sign out.`,
          `After a Workspace or account is closed, we delete its data within ${placeholder("deletion period after closure")}. Database backups are kept for ${placeholder("backup retention period")} and then overwritten.`,
        ],
      ],
    },
    {
      id: "security",
      heading: "Security",
      blocks: [
        `We protect information with measures including encryption in transit (HTTPS), hashed passwords, hashed invitation and chat-visitor tokens, and checks that every request only reaches data in the Workspace it belongs to. No system is perfectly secure, and we cannot guarantee the security of information. If a security incident affects your personal information, we will notify you as required by applicable law.`,
      ],
    },
    {
      id: "rights",
      heading: "Your choices and rights",
      blocks: [
        `You can ask us to access, correct, delete or provide a copy of the personal information we hold about you by emailing ${CONTACT_EMAIL}. We will verify your request before acting on it and respond within ${placeholder("response timeframe")}. You may use an authorised agent; we may ask for proof of their authority. We will not discriminate against you for exercising your rights.`,
        `Depending on where you live, you may have additional rights under local law, including the right to appeal our decision on your request. ${placeholder("jurisdiction-specific rights and appeal process after legal review")}`,
        `If you contacted a business that uses ${NAME}, send your request to that business. If you send it to us, we will forward it to them where we can identify them.`,
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        `The Service is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child has given us personal information, contact us and we will delete it.`,
      ],
    },
    {
      id: "self-hosted",
      heading: "Self-hosted installations",
      blocks: [
        `This policy does not apply to ${NAME} installations run by others using the open-source software. We do not receive, host or have access to the data in those installations. Their operators are responsible for their privacy practices.`,
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        `We will post any changes on this page and update the effective date. If a change is material, we will notify account holders by email or in the Service before it takes effect. We will not apply a material change to information collected before the change without your consent where the law requires it.`,
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [`${ENTITY}`, `${ADDRESS}`, `Email: ${CONTACT_EMAIL}`],
    },
  ],
};
