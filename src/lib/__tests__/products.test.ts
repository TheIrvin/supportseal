import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestUser, startTestDb, stopTestDb, type TestDb } from "@/test/integration-db";
import { createWorkspace, type WorkspaceContext } from "@/lib/workspace";
import {
  addProductDomain,
  archiveProduct,
  createProduct,
  getActiveProductByWidgetKey,
  getProductForWorkspace,
  listProducts,
  normalizeDomain,
  removeProductDomain,
  updateProduct,
} from "@/lib/products";

let db: TestDb;

async function seedTwoWorkspaces() {
  const alphaUser = await createTestUser(db.prisma, { email: "alpha@example.com" });
  const betaUser = await createTestUser(db.prisma, { email: "beta@example.com" });
  process.env.HOSTED_MODE = "1";
  const alpha = await createWorkspace({ userId: alphaUser.id, name: "Alpha" });
  const beta = await createWorkspace({ userId: betaUser.id, name: "Beta" });
  process.env.HOSTED_MODE = "";
  if (!alpha.ok || !beta.ok) throw new Error("seed failed");

  const ctx = (workspaceId: string): WorkspaceContext => ({
    user: { id: alphaUser.id, name: "Alpha", email: "alpha@example.com" },
    workspace: { id: workspaceId, name: "Alpha" },
    role: "ADMIN",
  });
  const betaCtx = (workspaceId: string): WorkspaceContext => ({
    user: { id: betaUser.id, name: "Beta", email: "beta@example.com" },
    workspace: { id: workspaceId, name: "Beta" },
    role: "ADMIN",
  });
  return { alphaCtx: ctx(alpha.workspaceId), betaCtx: betaCtx(beta.workspaceId), alpha, beta };
}

beforeAll(async () => {
  db = await startTestDb();
});

afterAll(async () => {
  await stopTestDb(db);
});

beforeEach(async () => {
  await db.prisma.productDomain.deleteMany();
  await db.prisma.product.deleteMany();
  await db.prisma.invite.deleteMany();
  await db.prisma.membership.deleteMany();
  await db.prisma.workspace.deleteMany();
  await db.prisma.user.deleteMany();
});

describe("normalizeDomain", () => {
  it("accepts hostnames, localhost, URLs and rejects junk", () => {
    expect(normalizeDomain("Example.COM")).toBe("example.com");
    expect(normalizeDomain("https://app.example.com/pricing")).toBe("app.example.com");
    expect(normalizeDomain("localhost")).toBe("localhost");
    expect(normalizeDomain("localhost:3000")).toBe("localhost");
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("http://")).toBeNull();
  });
});

describe("products", () => {
  it("creates a product with a public widget key and domains", async () => {
    const { alphaCtx } = await seedTwoWorkspaces();
    const result = await createProduct({
      ctx: alphaCtx,
      name: "Alpha SaaS",
      primaryColor: "#28c76f",
      domains: ["app.alpha.com", "https://docs.alpha.com", "app.alpha.com"],
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.product.name).toBe("Alpha SaaS");
    expect(result.product.widgetPublicKey).toMatch(/^pk_/u);
    expect(result.product.domains.map((d) => d.domain)).toEqual([
      "app.alpha.com",
      "docs.alpha.com",
    ]);

    const byKey = await getActiveProductByWidgetKey(result.product.widgetPublicKey);
    expect(byKey?.name).toBe("Alpha SaaS");
  });

  it("validates name, colour and domains", async () => {
    const { alphaCtx } = await seedTwoWorkspaces();
    expect((await createProduct({ ctx: alphaCtx, name: "" })).ok).toBe(false);
    expect((await createProduct({ ctx: alphaCtx, name: "X", primaryColor: "red" })).ok).toBe(false);
    expect((await createProduct({ ctx: alphaCtx, name: "X", domains: ["bad domain"] })).ok).toBe(
      false,
    );
  });

  it("never returns another Workspace's product (FR-SEC-01)", async () => {
    const { alphaCtx, betaCtx } = await seedTwoWorkspaces();
    const created = await createProduct({ ctx: alphaCtx, name: "Alpha Tool" });
    if (!created.ok) throw new Error(created.error);

    expect(await getProductForWorkspace(betaCtx.workspace.id, created.product.id)).toBeNull();
    expect((await listProducts(betaCtx.workspace.id)).length).toBe(0);
    expect(
      (
        await updateProduct({ ctx: betaCtx, productId: created.product.id, name: "Hacked" })
      ).ok,
    ).toBe(false);
    expect(
      (
        await addProductDomain({ ctx: betaCtx, productId: created.product.id, domain: "evil.com" })
      ).ok,
    ).toBe(false);
    expect(
      (await archiveProduct({ ctx: betaCtx, productId: created.product.id, archived: true })).ok,
    ).toBe(false);

    const unchanged = await getProductForWorkspace(alphaCtx.workspace.id, created.product.id);
    expect(unchanged?.name).toBe("Alpha Tool");
  });

  it("blocks agent mutations and archives without deleting history", async () => {
    const { alphaCtx } = await seedTwoWorkspaces();
    const agentCtx: WorkspaceContext = { ...alphaCtx, role: "AGENT" };
    expect((await createProduct({ ctx: agentCtx, name: "Nope" })).ok).toBe(false);

    const created = await createProduct({ ctx: alphaCtx, name: "Archivable" });
    if (!created.ok) throw new Error(created.error);

    expect((await updateProduct({ ctx: alphaCtx, productId: created.product.id, name: "Renamed" })).ok).toBe(true);
    expect((await archiveProduct({ ctx: alphaCtx, productId: created.product.id, archived: true })).ok).toBe(true);

    const archived = await getProductForWorkspace(alphaCtx.workspace.id, created.product.id);
    expect(archived?.archivedAt).not.toBeNull();
    expect(await getActiveProductByWidgetKey(created.product.widgetPublicKey)).toBeNull();
    expect((await listProducts(alphaCtx.workspace.id)).length).toBe(1);
  });

  it("manages domains per product with dedupe and removal", async () => {
    const { alphaCtx } = await seedTwoWorkspaces();
    const created = await createProduct({ ctx: alphaCtx, name: "Domains", domains: ["a.com"] });
    if (!created.ok) throw new Error(created.error);

    expect(
      (await addProductDomain({ ctx: alphaCtx, productId: created.product.id, domain: "a.com" })).ok,
    ).toBe(false);
    expect(
      (
        await addProductDomain({
          ctx: alphaCtx,
          productId: created.product.id,
          domain: "https://b.com/x",
        })
      ).ok,
    ).toBe(true);

    const product = await getProductForWorkspace(alphaCtx.workspace.id, created.product.id);
    expect(product?.domains.map((d) => d.domain).sort()).toEqual(["a.com", "b.com"]);

    const bDomain = product!.domains.find((d) => d.domain === "b.com")!;
    expect(
      (await removeProductDomain({ ctx: alphaCtx, productId: created.product.id, domainId: bDomain.id })).ok,
    ).toBe(true);
    const after = await getProductForWorkspace(alphaCtx.workspace.id, created.product.id);
    expect(after?.domains.length).toBe(1);
  });
});
