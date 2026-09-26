#!/usr/bin/env node
/**
 * E2E fixtures (hosted suite). Runs BEFORE the dev server starts (bootstrap
 * chain), while the PGlite file has a single writer. Creates the second
 * Workspace used by the cross-Workspace isolation tests (Initial.md §63) and
 * writes the fixture values tests need to tests/e2e/.runtime/hosted/fixtures.json.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";

async function main() {
  process.env.DATABASE_URL = process.env.DATABASE_URL || "";
  const { initDevDb } = await import("../../src/lib/dev-pglite");
  const prisma = await initDevDb();

  const ownerEmail = "beta-owner@e2e.test";
  const ownerPassword = "correct-horse-beta";

  const { getAuth } = await import("../../src/lib/auth");
  const auth = await getAuth();
  await auth.api.signUpEmail({
    body: { name: "Beta Owner", email: ownerEmail, password: ownerPassword },
    headers: new Headers({ origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" }),
  });
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Beta Workspace",
      memberships: { create: { userId: owner.id, role: "ADMIN" } },
    },
  });

  const product = await prisma.product.create({
    data: {
      workspaceId: workspace.id,
      name: "Beta Tool",
      primaryColor: "#7c3aed",
      widgetPublicKey: `pk_${crypto.randomBytes(24).toString("base64url")}`,
      inboundEmail: "support@beta.test",
      domains: { create: [{ domain: "beta.test" }] },
    },
  });

  const fixtures = {
    beta: {
      workspace: { id: workspace.id, name: workspace.name },
      product: { id: product.id, key: product.widgetPublicKey, inboundEmail: "support@beta.test" },
      owner: { email: ownerEmail, password: ownerPassword },
    },
  };
  const fixturesFile = process.env.E2E_FIXTURES_FILE;
  if (!fixturesFile) throw new Error("E2E_FIXTURES_FILE is required");
  await fs.writeFile(fixturesFile, JSON.stringify(fixtures, null, 2));
  await prisma.$disconnect();
  console.log(`[e2e-seed] Beta workspace ready (${workspace.id})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
