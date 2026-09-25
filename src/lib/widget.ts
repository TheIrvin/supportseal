import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  addCustomerMessage,
  getConversationDetail,
} from "@/lib/conversations";

export type WidgetProduct = {
  id: string;
  name: string;
  primaryColor: string;
  widgetPublicKey: string;
  workspaceId: string;
  domains: string[];
};

export async function loadWidgetProduct(widgetKey: string): Promise<WidgetProduct | null> {
  if (!widgetKey.startsWith("pk_")) return null;
  const product = await prisma.product.findFirst({
    where: { widgetPublicKey: widgetKey, archivedAt: null },
    include: { domains: { select: { domain: true } } },
  });
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    primaryColor: product.primaryColor,
    widgetPublicKey: product.widgetPublicKey,
    workspaceId: product.workspaceId,
    domains: product.domains.map((d) => d.domain),
  };
}

/**
 * Domain allowlist matching (FR-CHAT-01, design D7): exact hostname, or a
 * `*.example.com` entry covering subdomains (not the apex). Localhost is a
 * separate development path, allowed while the service itself runs in dev.
 */
export function isOriginAllowed(
  originHostname: string,
  productDomains: string[],
  serviceIsProduction: boolean,
): boolean {
  const hostname = originHostname.trim().toLowerCase();
  if (!hostname) return false;
  if (
    !serviceIsProduction &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1")
  ) {
    return true;
  }
  return productDomains.some((pattern) => {
    const rule = pattern.trim().toLowerCase();
    if (rule === hostname) return true;
    if (rule.startsWith("*.")) {
      const suffix = rule.slice(1); // ".example.com"
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return false;
  });
}

/** Extract the embedding page's hostname from Referer, or an explicit host param. */
export function resolveEmbeddingHostname(headers: Headers, hostParam?: string | null): string | null {
  const referer = headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      // fall through to host param
    }
  }
  if (hostParam) {
    try {
      return new URL(hostParam).hostname;
    } catch {
      return hostParam.trim().toLowerCase() || null;
    }
  }
  return null;
}

/**
 * Widget origin gate (FR-CHAT-01). The declared embedding host (sent by the
 * loader, which runs on the customer's page) must be allowlisted; when a
 * Referer is present it must agree or belong to the service itself. The
 * hardening spike (docs/design/chat-widget.md "Isolation approach") may
 * replace the declared-host trust with signed origin binding.
 */
export function isWidgetOriginAllowed(input: {
  productDomains: string[];
  hostParam: string | null | undefined;
  referer: string | null;
  serviceOrigin: string;
  serviceIsProduction: boolean;
}): boolean {
  let declaredHostname: string | null = null;
  if (input.hostParam) {
    try {
      declaredHostname = new URL(input.hostParam).hostname;
    } catch {
      declaredHostname = input.hostParam.trim().toLowerCase() || null;
    }
  }
  if (!declaredHostname) return false;
  if (!isOriginAllowed(declaredHostname, input.productDomains, input.serviceIsProduction)) {
    return false;
  }

  if (input.referer) {
    try {
      const refererUrl = new URL(input.referer);
      const refererIsService = refererUrl.origin === input.serviceOrigin;
      if (!refererIsService && !isOriginAllowed(refererUrl.hostname, input.productDomains, input.serviceIsProduction)) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

export function hashVisitorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type VisitorSession = {
  visitorId: string;
  productId: string;
  email: string | null;
  name: string | null;
  conversationId: string | null;
};

export async function createVisitorSession(product: WidgetProduct): Promise<{
  token: string;
  session: VisitorSession;
}> {
  const token = randomBytes(32).toString("base64url");
  const visitor = await prisma.chatVisitor.create({
    data: {
      productId: product.id,
      tokenHash: hashVisitorToken(token),
    },
  });
  return {
    token,
    session: {
      visitorId: visitor.id,
      productId: product.id,
      email: null,
      name: null,
      conversationId: null,
    },
  };
}

export async function resolveVisitorSession(
  product: WidgetProduct,
  token: string | undefined,
): Promise<VisitorSession | null> {
  if (!token) return null;
  const visitor = await prisma.chatVisitor.findUnique({
    where: { tokenHash: hashVisitorToken(token) },
  });
  if (!visitor || visitor.productId !== product.id) return null;
  return {
    visitorId: visitor.id,
    productId: visitor.productId,
    email: visitor.email,
    name: visitor.name,
    conversationId: visitor.conversationId,
  };
}

export async function touchVisitor(visitorId: string): Promise<void> {
  await prisma.chatVisitor.update({
    where: { id: visitorId },
    data: { lastSeenAt: new Date() },
  });
}

export async function setVisitorEmail(input: {
  visitor: VisitorSession;
  email: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  await prisma.chatVisitor.update({
    where: { id: input.visitor.visitorId },
    data: { email },
  });
  if (input.visitor.conversationId) {
    // Link the email to the conversation's contact (dedupes within the Workspace).
    const conversation = await prisma.conversation.findUnique({
      where: { id: input.visitor.conversationId },
      select: { id: true, workspaceId: true, contactId: true },
    });
    if (conversation) {
      const existing = await prisma.contact.findFirst({
        where: { workspaceId: conversation.workspaceId, email },
        select: { id: true },
      });
      if (existing) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { contactId: existing.id },
        });
      } else {
        await prisma.contact.update({
          where: { id: conversation.contactId },
          data: { email },
        });
      }
    }
  }
  return { ok: true, email };
}

/**
 * A visitor message. Creates the Conversation (and Workspace contact) on the
 * first message; a closed Conversation reopens (Pete, 2026-09-25). The page
 * URL is recorded automatically by the widget (origin + path only).
 */
export async function visitorSendMessage(input: {
  product: WidgetProduct;
  visitor: VisitorSession;
  body: string;
  pageUrl?: string | null;
}): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const body = input.body.trim().slice(0, 5000);
  if (!body) return { ok: false, error: "Message is empty." };

  let conversationId = input.visitor.conversationId;
  if (conversationId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: input.product.workspaceId },
      select: { id: true },
    });
    if (!existing) conversationId = null;
  }

  if (!conversationId) {
    const contact = await prisma.contact.create({
      data: { workspaceId: input.product.workspaceId, email: input.visitor.email, name: input.visitor.name },
    });
    const conversation = await prisma.conversation.create({
      data: {
        workspaceId: input.product.workspaceId,
        productId: input.product.id,
        contactId: contact.id,
        channel: "CHAT",
      },
    });
    conversationId = conversation.id;
    await prisma.chatVisitor.update({
      where: { id: input.visitor.visitorId },
      data: { conversationId, createdConversationAt: new Date() },
    });
  }
  input.visitor.conversationId = conversationId;

  const message = await addCustomerMessage({
    workspaceId: input.product.workspaceId,
    conversationId,
    body,
    source: { kind: "visitor", visitorId: input.visitor.visitorId },
  });
  if (!message.ok) return message;

  if (input.pageUrl) {
    // Recorded on the visitor record for the context panel (developer-context slice extends this).
    await prisma.chatVisitor.update({
      where: { id: input.visitor.visitorId },
      data: { devContext: { pageUrl: input.pageUrl.slice(0, 300), updatedAt: new Date().toISOString() } },
    });
  }

  await touchVisitor(input.visitor.visitorId);
  return { ok: true, conversationId };
}

export type VisitorMessage = {
  id: string;
  kind: "CUSTOMER" | "AGENT";
  body: string;
  createdAt: string;
};

/** Customer-visible thread for the visitor (notes are never included). */
export async function visitorListMessages(input: {
  product: WidgetProduct;
  visitor: VisitorSession;
}): Promise<{ conversationId: string | null; messages: VisitorMessage[]; status: string }> {
  if (!input.visitor.conversationId) return { conversationId: null, messages: [], status: "OPEN" };
  const detail = await getConversationDetail({
    workspaceId: input.product.workspaceId,
    conversationId: input.visitor.conversationId,
  });
  if (!detail) return { conversationId: null, messages: [], status: "OPEN" };
  await touchVisitor(input.visitor.visitorId);
  return {
    conversationId: detail.id,
    status: detail.status,
    messages: detail.messages
      .filter((m): m is (typeof detail.messages)[number] & { kind: "CUSTOMER" | "AGENT" } => m.kind === "CUSTOMER" || m.kind === "AGENT")
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
  };
}

export async function getAvailabilityForProduct(workspaceId: string): Promise<"LIVE" | "AWAY"> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { availability: true },
  });
  return workspace?.availability ?? "LIVE";
}
