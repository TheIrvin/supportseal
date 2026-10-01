import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { WorkspaceContext } from "@/lib/workspace";

export type ProductWithDomains = {
  id: string;
  workspaceId: string;
  name: string;
  primaryColor: string;
  widgetPublicKey: string;
  inboundEmail: string | null;
  inboundEmailVerified: Date | null;
  archivedAt: Date | null;
  diagnosticsEnabledAt: Date | null;
  createdAt: Date;
  domains: { id: string; domain: string }[];
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/u;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;

export function generateWidgetPublicKey(): string {
  return `pk_${randomBytes(24).toString("base64url")}`;
}

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** Normalize a visitor-facing domain: lowercase, strip scheme/path/port.
 * Allows one leading `*.` (wildcard subdomains, design D7). */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  let wildcard = false;
  if (value.startsWith("*.")) {
    wildcard = true;
    value = value.slice(2);
  }
  if (value.includes("://")) {
    try {
      value = new URL(input.trim()).hostname;
    } catch {
      return null;
    }
  }
  value = value.replace(/^[./]+/u, "").split("/")[0].split(":")[0].replace(/\.+$/u, "");
  if (value === "localhost" || HOSTNAME.test(value)) return wildcard ? `*.${value}` : value;
  return null;
}

function assertAdmin(ctx: WorkspaceContext): void {
  if (ctx.role !== "ADMIN") {
    throw new ProductActionError("Only Workspace admins can manage Products.");
  }
}

export class ProductActionError extends Error {}

function toProductWithDomains(product: {
  id: string;
  workspaceId: string;
  name: string;
  primaryColor: string;
  widgetPublicKey: string;
  inboundEmail: string | null;
  inboundEmailVerified: Date | null;
  archivedAt: Date | null;
  diagnosticsEnabledAt: Date | null;
  createdAt: Date;
  domains: { id: string; domain: string }[];
}): ProductWithDomains {
  return { ...product };
}

export async function listProducts(workspaceId: string): Promise<ProductWithDomains[]> {
  const products = await prisma.product.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: { domains: { orderBy: { createdAt: "asc" } } },
  });
  return products.map(toProductWithDomains);
}

export async function listActiveProducts(workspaceId: string): Promise<ProductWithDomains[]> {
  const products = await prisma.product.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { domains: { orderBy: { createdAt: "asc" } } },
  });
  return products.map(toProductWithDomains);
}

/**
 * Load a Product after proving Workspace ownership. Cross-Workspace IDs fail
 * (FR-SEC-01): the caller must hold a Workspace context and the Product must
 * belong to it.
 */
export async function getProductForWorkspace(
  workspaceId: string,
  productId: string,
): Promise<ProductWithDomains | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, workspaceId },
    include: { domains: { orderBy: { createdAt: "asc" } } },
  });
  return product ? toProductWithDomains(product) : null;
}

/** Resolve a Product by its public widget key (public path, no secrets). */
export async function getActiveProductByWidgetKey(
  widgetPublicKey: string,
): Promise<ProductWithDomains | null> {
  const product = await prisma.product.findFirst({
    where: { widgetPublicKey, archivedAt: null },
    include: { domains: true },
  });
  return product ? toProductWithDomains(product) : null;
}

export async function createProduct(input: {
  ctx: WorkspaceContext;
  name: string;
  primaryColor?: string;
  domains?: string[];
}): Promise<{ ok: true; product: ProductWithDomains } | { ok: false; error: string }> {
  try {
    assertAdmin(input.ctx);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const name = input.name.trim();
  if (name.length < 1 || name.length > 60) {
    return { ok: false, error: "Product name must be between 1 and 60 characters." };
  }
  const primaryColor = (input.primaryColor ?? "#2563eb").trim().toLowerCase();
  if (!isValidHexColor(primaryColor)) {
    return { ok: false, error: "Primary colour must be a hex value like #7367f0." };
  }

  const normalizedDomains: string[] = [];
  for (const raw of input.domains ?? []) {
    const domain = normalizeDomain(raw);
    if (!domain) {
      return { ok: false, error: `"${raw}" is not a valid domain.` };
    }
    if (!normalizedDomains.includes(domain)) normalizedDomains.push(domain);
  }

  const product = await prisma.product.create({
    data: {
      workspaceId: input.ctx.workspace.id,
      name,
      primaryColor,
      widgetPublicKey: generateWidgetPublicKey(),
      domains: { create: normalizedDomains.map((domain) => ({ domain })) },
    },
    include: { domains: true },
  });
  return { ok: true, product: toProductWithDomains(product) };
}

export async function updateProduct(input: {
  ctx: WorkspaceContext;
  productId: string;
  name?: string;
  primaryColor?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertAdmin(input.ctx);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const data: { name?: string; primaryColor?: string } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 60) {
      return { ok: false, error: "Product name must be between 1 and 60 characters." };
    }
    data.name = name;
  }
  if (input.primaryColor !== undefined) {
    const primaryColor = input.primaryColor.trim().toLowerCase();
    if (!isValidHexColor(primaryColor)) {
      return { ok: false, error: "Primary colour must be a hex value like #7367f0." };
    }
    data.primaryColor = primaryColor;
  }

  const updated = await prisma.product.updateMany({
    where: { id: input.productId, workspaceId: input.ctx.workspace.id },
    data,
  });
  if (updated.count === 0) return { ok: false, error: "Product not found." };
  return { ok: true };
}

export async function addProductDomain(input: {
  ctx: WorkspaceContext;
  productId: string;
  domain: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertAdmin(input.ctx);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const domain = normalizeDomain(input.domain);
  if (!domain) return { ok: false, error: `"${input.domain}" is not a valid domain.` };

  const product = await getProductForWorkspace(input.ctx.workspace.id, input.productId);
  if (!product) return { ok: false, error: "Product not found." };

  try {
    await prisma.productDomain.create({ data: { productId: product.id, domain } });
  } catch {
    return { ok: false, error: "That domain is already configured for this Product." };
  }
  return { ok: true };
}

export async function removeProductDomain(input: {
  ctx: WorkspaceContext;
  productId: string;
  domainId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertAdmin(input.ctx);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const removed = await prisma.productDomain.deleteMany({
    where: { id: input.domainId, productId: input.productId, product: { workspaceId: input.ctx.workspace.id } },
  });
  if (removed.count === 0) return { ok: false, error: "Domain not found." };
  return { ok: true };
}

/** Archive: blocks new interactions, preserves history (FR-PROD-01). */
export async function archiveProduct(input: {
  ctx: WorkspaceContext;
  productId: string;
  archived: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertAdmin(input.ctx);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const updated = await prisma.product.updateMany({
    where: { id: input.productId, workspaceId: input.ctx.workspace.id },
    data: { archivedAt: input.archived ? new Date() : null },
  });
  if (updated.count === 0) return { ok: false, error: "Product not found." };
  return { ok: true };
}

/**
 * Browser diagnostics switch (docs/design/diagnostics.md "Enabling it"):
 * Admin-only per Product, off by default. The timestamp records when
 * disclosure duties began; disabling keeps existing snapshots until they
 * expire.
 */
export async function setProductDiagnostics(input: {
  ctx: WorkspaceContext;
  productId: string;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertAdmin(input.ctx);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  if (input.enabled) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, workspaceId: input.ctx.workspace.id },
      select: { archivedAt: true },
    });
    if (!product) return { ok: false, error: "Product not found." };
    if (product.archivedAt) {
      return { ok: false, error: "This Product is archived; unarchive it first." };
    }
  }

  const updated = await prisma.product.updateMany({
    where: { id: input.productId, workspaceId: input.ctx.workspace.id },
    data: input.enabled
      ? { diagnosticsEnabledAt: new Date(), diagnosticsEnabledById: input.ctx.user.id }
      : { diagnosticsEnabledAt: null, diagnosticsEnabledById: null },
  });
  if (updated.count === 0) return { ok: false, error: "Product not found." };
  return { ok: true };
}

/** Who enabled diagnostics and when, for "Enabled by {Admin} on {date}". */
export async function getDiagnosticsEnabler(input: {
  workspaceId: string;
  productId: string;
}): Promise<{ name: string; at: Date } | null> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, workspaceId: input.workspaceId },
    select: { diagnosticsEnabledAt: true, diagnosticsEnabledBy: { select: { name: true } } },
  });
  if (!product?.diagnosticsEnabledAt) return null;
  return { name: product.diagnosticsEnabledBy?.name ?? "an admin", at: product.diagnosticsEnabledAt };
}
