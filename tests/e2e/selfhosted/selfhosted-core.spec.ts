import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { hostPageFor, openWidget, registerAccount, uniqueAccount } from "../helpers";

/**
 * Self-hosted core flows (FR-HOST-01): the default deployment mode runs the
 * same onboarding + chat + inbox workflow, represents exactly one Workspace
 * (registration closes once it exists; the advisory-lock block on a second
 * Workspace is covered by src/lib/__tests__/workspace.test.ts) and never
 * exposes hosted billing.
 */
const APP = "http://localhost:3200";

test.describe.serial("self-hosted mode core flows", () => {
  const account = uniqueAccount();
  const product = { name: "Solo Desk", domain: "solo.desk.test" };

  let agentPage: Page;
  let customerContext: BrowserContext;
  let productKey = "";

  test.beforeAll(async ({ browser }) => {
    const agentContext = await browser.newContext({
      baseURL: APP,
      viewport: { width: 1440, height: 900 },
    });
    agentPage = await agentContext.newPage();
    customerContext = await browser.newContext();
  });

  test.afterAll(async () => {
    await agentPage?.context().close();
    await customerContext?.close();
  });

  test("onboarding works: register, one Workspace, one Product", async () => {
    await registerAccount(agentPage, account);
    await expect(agentPage).toHaveURL(/\/onboarding\/?$/u);

    await agentPage.locator("#name").fill(account.workspace);
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/product/u);

    await agentPage.locator("#name").fill(product.name);
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/domain/u);

    await agentPage.locator("#domain").fill(product.domain);
    await agentPage.getByRole("button", { name: "Add", exact: true }).click();
    await expect(
      agentPage.getByRole("button", { name: `Remove ${product.domain}` }),
    ).toBeVisible();
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/install/u);

    const snippet = (await agentPage.locator("pre").first().textContent()) ?? "";
    productKey = snippet.match(/data-key="(pk_[^"]+)"/u)?.[1] ?? "";
    expect(productKey).toMatch(/^pk_/u);
  });

  test("chat widget and agent reply work end to end", async () => {
    const page = await customerContext.newPage();
    const frame = await openWidget(page, productKey, {
      hostPage: hostPageFor(APP),
      status: "Online",
    });
    await frame.locator("#input").fill("Self-hosted chat message 4c1f");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("Self-hosted chat message 4c1f");
    await page.close();

    await agentPage.goto("/inbox");
    const row = agentPage.locator('ul[aria-label="Conversations"] li a').first();
    await expect(row).toBeVisible();
    await row.click();
    const reply = "Reply from the self-hosted inbox.";
    await agentPage.getByLabel(/^Reply to /u).fill(reply);
    await agentPage.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      agentPage.getByRole("article").filter({ hasText: reply }).first(),
    ).toBeVisible();
  });

  test("registration closes once the Workspace exists", async ({ request, page }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      headers: { "content-type": "application/json", origin: APP },
      data: {
        name: "Latecomer",
        email: "latecomer@e2e.test",
        password: "correct-horse-late",
      },
    });
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({ code: "user-creation-disabled" });

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Registration is closed" })).toBeVisible();
  });

  test("hosted billing is absent", async () => {
    const response = await agentPage.goto("/settings/billing");
    expect(response?.url()).toContain("/settings/team");

    const checkout = await agentPage.request.post("/api/billing/checkout");
    expect(checkout.status()).toBe(404);
    expect(await checkout.json()).toMatchObject({ error: "not_available" });

    await agentPage.goto("/settings/team");
    await expect(agentPage.getByRole("tab", { name: "Billing" })).toHaveCount(0);
  });
});
