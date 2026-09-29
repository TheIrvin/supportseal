import { placeholder, type LegalDocument } from "@/config/legal";

import { CONTACT_EMAIL, EFFECTIVE_DATE, NAME } from "./shared";

export const dataResponsibility: LegalDocument = {
  slug: "data-responsibility",
  title: "Hosted and self-hosted data responsibility",
  description: `Who is responsible for data in the hosted ${NAME} service and in self-hosted installations.`,
  effectiveDate: EFFECTIVE_DATE,
  sections: [
    {
      id: "overview",
      heading: "Two ways to run " + NAME,
      blocks: [
        `You can use ${NAME} as a hosted service that we operate, or run the open-source software on your own infrastructure. The same core support features are available either way, but who is responsible for the data is different.`,
      ],
    },
    {
      id: "hosted",
      heading: "Hosted service",
      blocks: [
        `When you use the hosted Service, we operate the servers, database, attachment storage and email delivery, and we process Customer Data on your behalf as described in our Terms of Service, Privacy Policy and Subprocessors page.`,
        `You remain responsible for your relationship with the people who contact you:`,
        [
          `telling them how their information is handled, for example in your own privacy notice;`,
          `deciding what your applications send through the developer APIs, and keeping sensitive data out of it (see the Acceptable Use Policy);`,
          `choosing which websites may load your widget and which email addresses forward to the Service;`,
          `managing who in your team has access to your Workspace;`,
          `responding to requests from those people about their data. We will help where we can.`,
        ],
      ],
    },
    {
      id: "self-hosted",
      heading: "Self-hosted installations",
      blocks: [
        `When you run ${NAME} yourself, you are the operator. We do not host, receive or have access to any data in your installation. The software sends nothing to us: it has no telemetry, and it does not require our hosted service or our payment processor. Website analytics are off unless you configure them.`,
        `As the operator you are responsible for:`,
        [
          `hosting, securing, backing up and updating the installation;`,
          `your contracts with any providers you connect, such as your email provider;`,
          `your own privacy notices, terms and legal obligations towards your team and the people who contact you;`,
          `complying with the laws that apply to you.`,
        ],
        `The software is licensed under the GNU Affero General Public License version 3. As the licence states, it is provided without warranty. If you modify it and let users interact with it over a network, the licence requires you to offer them the corresponding source code.`,
        `Our Terms of Service, Privacy Policy, Acceptable Use Policy and Subprocessors page apply only to the hosted Service, not to self-hosted installations.`,
      ],
    },
    {
      id: "summary",
      heading: "At a glance",
      blocks: [
        {
          caption: "Responsibilities by hosting mode",
          head: ["Responsibility", "Hosted service", "Self-hosted"],
          rows: [
            ["Servers, database and storage", "Us", "You"],
            ["Security updates and backups", "Us", "You"],
            ["Email provider", "Us (see Subprocessors)", "You"],
            ["Privacy notice to the people who contact you", "You", "You"],
            ["What your applications send to the developer APIs", "You", "You"],
            ["Access to data in the installation", "Us and our subprocessors, to run the Service", "You only"],
          ],
        },
      ],
    },
    {
      id: "contact",
      heading: "Questions",
      blocks: [
        `Questions about the hosted Service: ${CONTACT_EMAIL}. ${placeholder("confirm whether self-hosting questions should go to GitHub issues instead")}`,
      ],
    },
  ],
};
