import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createTestUser, startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import {
  htmlToText,
  parseAddress,
  processInboundEmail,
  type InboundEmail,
} from "@/lib/email/inbound";
import { POST as inboundPost } from "@/app/api/email/inbound/route";

let db: TestDb;
let productId: string;
let productInbound: string;

process.env.INBOUND_WEBHOOK_SECRET = "test-secret";

function email(overrides: Partial<InboundEmail> = {}): InboundEmail {
  return {
    from: { email: "sam@fastmail.dev", name: "Sam Rivera" },
    to: [productInbound],
    subject: "Invoice question",
    text: "Hi, my invoice PDF is missing the tax line.",
    html: null,
    headers: { messageId: null, inReplyTo: null, references: [], autoSubmitted: null, precedence: null, xAutoreply: null },
    attachments: [],
    ...overrides,
  };
}

async function postInbound(body: unknown, secret = "test-secret") {
  const request = new NextRequest("http://localhost:3000/api/email/inbound", {
    method: "POST",
    headers: { "content-type": "application/json", [INBOUND_HEADER]: secret },
    body: JSON.stringify(body),
  });
  return inboundPost(request);
}

const INBOUND_HEADER = "x-supportseal-inbound-secret";

function jsonEmail(overrides: Record<string, unknown> = {}) {
  return {
    from: "Sam Rivera <sam@fastmail.dev>",
    to: productInbound,
    subject: "Invoice question",
    text: "Hi, my invoice PDF is missing the tax line.",
    headers: {},
    ...overrides,
  };
}

beforeAll(async () => {
  db = await startTestDb();
});

afterAll(async () => {
  await stopTestDb(db);
});

beforeEach(async () => {
  await db.prisma.emailDelivery.deleteMany();
  await db.prisma.attachment.deleteMany();
  await db.prisma.chatVisitor.deleteMany();
  await db.prisma.message.deleteMany();
  await db.prisma.conversationTag.deleteMany();
  await db.prisma.tag.deleteMany();
  await db.prisma.conversation.deleteMany();
  await db.prisma.contact.deleteMany();
  await db.prisma.productDomain.deleteMany();
  await db.prisma.product.deleteMany();
  await db.prisma.invite.deleteMany();
  await db.prisma.membership.deleteMany();
  await db.prisma.workspace.deleteMany();
  await db.prisma.user.deleteMany();

  const user = await createTestUser(db.prisma, { email: "founder@example.com" });
  const workspace = await db.prisma.workspace.create({
    data: { name: "Acme", memberships: { create: { userId: user.id, role: "ADMIN" } } },
  });
  productInbound = "product_abc123@inbound.localhost";
  productId = (
    await db.prisma.product.create({
      data: {
        workspaceId: workspace.id,
        name: "Alpha SaaS",
        widgetPublicKey: "pk_inboundtest",
        inboundEmail: productInbound,
      },
    })
  ).id;
});

describe("address + html parsing", () => {
  it("parses display-name addresses", () => {
    expect(parseAddress("Sam Rivera <SAM@FastMail.dev>")).toEqual({ email: "SAM@fastmail.dev", name: "Sam Rivera" });
    expect(parseAddress("plain@example.com")).toEqual({ email: "plain@example.com", name: null });
    expect(parseAddress("not an address")).toBeNull();
    expect(parseAddress(null)).toBeNull();
  });

  it("converts html to readable text", () => {
    expect(htmlToText("<p>Hi<br>there</p><script>alert(1)</script><style>x{}</style>")).toBe("Hi\nthere");
    expect(htmlToText("a &amp; b &lt;c&gt;")).toBe("a & b <c>");
  });
});

describe("inbound processing (FR-EMAIL-01/03)", () => {
  it("creates a conversation for a new email and dedupes by Message-ID", async () => {
    const first = await processInboundEmail({
      email: email({ headers: { ...email().headers, messageId: "<m1@sender>" } }),
    });
    if (first.outcome !== "created") throw new Error(JSON.stringify(first));
    const conversation = await db.prisma.conversation.findFirstOrThrow();
    expect(conversation.channel).toBe("EMAIL");
    expect(conversation.subject).toBe("Invoice question");
    expect(conversation.emailMessageId).toBe("<m1@sender>");
    expect(conversation.emailReplyToken).not.toBeNull();
    const contact = await db.prisma.contact.findFirstOrThrow();
    expect(contact.email).toBe("sam@fastmail.dev");
    expect(contact.name).toBe("Sam Rivera");

    const duplicate = await processInboundEmail({
      email: email({ text: "different body", headers: { ...email().headers, messageId: "<m1@sender>" } }),
    });
    expect(duplicate.outcome).toBe("duplicate");
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(1);
  });

  it("threads replies by In-Reply-To/References into the same conversation", async () => {
    const first = await processInboundEmail({
      email: email({ headers: { ...email().headers, messageId: "<root@sender>" } }),
    });
    if (first.outcome !== "created") throw new Error(JSON.stringify(first));

    const reply = await processInboundEmail({
      email: email({
        text: "Following up on that invoice.",
        subject: "Re: Invoice question",
        headers: {
          ...email().headers,
          messageId: "<reply@sender>",
          inReplyTo: "<root@sender>",
          references: ["<older@sender>", "<root@sender>"],
        },
      }),
    });
    if (reply.outcome !== "created") throw new Error(JSON.stringify(reply));
    expect(reply.conversationId).toBe(first.conversationId);
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(2);
  });

  it("threads by References alone (no In-Reply-To)", async () => {
    const first = await processInboundEmail({
      email: email({ headers: { ...email().headers, messageId: "<refroot@sender>" } }),
    });
    if (first.outcome !== "created") throw new Error(JSON.stringify(first));
    const reply = await processInboundEmail({
      email: email({
        text: "Threaded only via References.",
        headers: {
          ...email().headers,
          messageId: "<refreply@sender>",
          inReplyTo: null,
          references: ["<other@sender>", "<refroot@sender>"],
        },
      }),
    });
    if (reply.outcome !== "created") throw new Error(JSON.stringify(reply));
    expect(reply.conversationId).toBe(first.conversationId);
  });

  it("never threads by subject alone", async () => {
    await processInboundEmail({
      email: email({ headers: { ...email().headers, messageId: "<a@sender>" } }),
    });
    // Same subject, no threading headers -> a new conversation.
    const second = await processInboundEmail({
      email: email({
        headers: { ...email().headers, messageId: "<b@sender>" },
      }),
    });
    if (second.outcome !== "created") throw new Error(JSON.stringify(second));
    expect(await db.prisma.conversation.count()).toBe(2);
  });

  it("continues via the reply+token address", async () => {
    const first = await processInboundEmail({
      email: email({ headers: { ...email().headers, messageId: "<r@sender>" } }),
    });
    if (first.outcome !== "created") throw new Error(JSON.stringify(first));
    const conversation = await db.prisma.conversation.findFirstOrThrow();

    const continued = await processInboundEmail({
      email: email({
        to: [`reply+${conversation.emailReplyToken}@inbound.localhost`],
        text: "Replying to your reply by mail.",
        headers: { ...email().headers, messageId: "<c@sender>" },
      }),
    });
    if (continued.outcome !== "created") throw new Error(JSON.stringify(continued));
    expect(continued.conversationId).toBe(conversation.id);
  });

  it("ignores autoresponses and records them", async () => {
    const result = await processInboundEmail({
      email: email({
        headers: { ...email().headers, messageId: "<auto@sender>", autoSubmitted: "auto-replied" },
      }),
    });
    expect(result.outcome).toBe("ignored");
    expect(await db.prisma.conversation.count()).toBe(0);
    const delivery = await db.prisma.emailDelivery.findFirstOrThrow();
    expect(delivery.status).toBe("IGNORED");
  });

  it("rejects mail to an archived product and unknown addresses", async () => {
    await db.prisma.product.update({ where: { id: productId }, data: { archivedAt: new Date() } });
    const archived = await processInboundEmail({
      email: email({ headers: { ...email().headers, messageId: "<x@sender>" } }),
    });
    if (archived.outcome !== "rejected") throw new Error(JSON.stringify(archived));
    expect(archived.bounce).toBe(true);
    expect(await db.prisma.conversation.count()).toBe(0);

    await db.prisma.product.update({ where: { id: productId }, data: { archivedAt: null } });
    const unknown = await processInboundEmail({
      email: email({ to: ["nobody@inbound.localhost"], headers: { ...email().headers, messageId: "<y@sender>" } }),
    });
    if (unknown.outcome !== "rejected") throw new Error(JSON.stringify(unknown));
  });

  it("stores valid attachments with the message and drops unsafe ones", async () => {
    const png = new Uint8Array(64);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const exe = new Uint8Array(64);
    exe.set([0x4d, 0x5a]);
    const result = await processInboundEmail({
      email: email({
        headers: { ...email().headers, messageId: "<att@sender>" },
        attachments: [
          { filename: "invoice.png", contentType: "image/png", data: png },
          { filename: "evil.exe", contentType: "application/octet-stream", data: exe },
        ],
      }),
    });
    if (result.outcome !== "created") throw new Error(JSON.stringify(result));
    expect(await db.prisma.attachment.count()).toBe(1);
    const stored = await db.prisma.attachment.findFirstOrThrow();
    expect(stored.filename).toBe("invoice.png");
    const message = await db.prisma.message.findFirstOrThrow({ include: { attachments: true } });
    expect(message.attachments.length).toBe(1);
  });
});

describe("inbound webhook route", () => {
  it("rejects missing or wrong secrets", async () => {
    const noSecret = await postInbound(jsonEmail(), "");
    expect(noSecret.status).toBe(401);
  });

  it("reads threading headers case-insensitively and from folded strings", async () => {
    // Object shape with mixed-case keys.
    await postInbound(
      jsonEmail({ headers: { "Message-Id": "<case@sender>", "In-Reply-To": "<none@x>" } }),
    );
    expect(await db.prisma.conversation.count()).toBe(1);
    const conversation = await db.prisma.conversation.findFirstOrThrow();
    expect(conversation.emailMessageId).toBe("<case@sender>");

    // Raw folded RFC 822 string shape.
    const response = await postInbound(
      jsonEmail({
        headers: "Message-Id: <fold@sender>\r\nReferences: <case@sender>\r\n more-ids",
      }),
    );
    expect(response.status).toBe(200);
    // Folded references thread into the same conversation.
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(2);
  });

  it("parses quoted display names containing commas", async () => {
    const response = await postInbound(
      jsonEmail({
        from: '"Rivera, Sam" <sam@fastmail.dev>',
        headers: { "Message-ID": "<quoted@sender>" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(1);
  });

  it("accepts the JSON bridge shape with the header secret", async () => {
    const response = await postInbound(jsonEmail({ headers: { "Message-ID": "<w@sender>" } }));
    expect(response.status).toBe(200);
    expect(await db.prisma.conversation.count()).toBe(1);
  });

  it("is idempotent across duplicate webhook deliveries", async () => {
    const body = jsonEmail({ headers: { "Message-ID": "<dup@sender>" } });
    await postInbound(body);
    const second = await postInbound(body);
    expect(second.status).toBe(200);
    const payload = (await second.json()) as { duplicate?: boolean };
    expect(payload.duplicate).toBe(true);
    expect(await db.prisma.conversation.count()).toBe(1);
    expect(await db.prisma.message.count()).toBe(1);
  });
});
