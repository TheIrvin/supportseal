import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  diagHostPageFor,
  enableDiagnostics,
  hostPageFor,
  openWidget,
  registerAccount,
  uniqueAccount,
} from "../helpers";

/**
 * Self-hosted diagnostics parity (DX-18): the same flow works in self-hosted
 * mode, and every diagnostics-related request goes to the installation
 * itself — never to any other host.
 */
const APP = "http://localhost:3200";
const CANARIES = ["CANARY_COOKIE", "CANARY_STORAGE", "CANARY_SESSION", "CANARY_PASSWORD", "CANARY_AUTH", "CANARY_BODY", "CANARY_LOG"];

test.describe.serial("self-hosted diagnostics parity", () => {
  const account = uniqueAccount();
  const product = { name: "Solo Desk", domain: "solo.desk.test" };

  let agentPage: Page;
  let customerContext: BrowserContext;
  let productKey = "";
  let productId = "";

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

  test("onboarding creates the workspace and product", async () => {
    await registerAccount(agentPage, account);
    await agentPage.locator("#name").fill(account.workspace);
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/product/u);

    await agentPage.locator("#name").fill(product.name);
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/domain/u);

    await agentPage.locator("#domain").fill(product.domain);
    await agentPage.getByRole("button", { name: "Add", exact: true }).click();
    await expect(agentPage.getByRole("button", { name: `Remove ${product.domain}` })).toBeVisible();
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/install/u);

    const snippet = (await agentPage.locator("pre").first().textContent()) ?? "";
    productKey = snippet.match(/data-key="(pk_[^"]+)"/u)?.[1] ?? "";
    expect(productKey).toMatch(/^pk_/u);
  });

  test("chat works before diagnostics are enabled (off by default)", async () => {
    const page = await customerContext.newPage();
    const collectorRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("widget-diagnostics.js")) collectorRequests.push(request.url());
    });
    const frame = await openWidget(page, productKey, {
      hostPage: hostPageFor(APP),
      status: "Online",
    });
    await frame.locator("#input").fill("Self-hosted before diagnostics 71bd");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("Self-hosted before diagnostics 71bd");
    expect(collectorRequests).toEqual([]);
    await page.close();
  });

  test("DX-18: enable, capture and send with canaries; requests stay on the installation", async () => {
    // Enable through the settings UI once the product id is known.
    const list = await agentPage.goto("/settings/products");
    expect(list?.ok()).toBe(true);
    await agentPage.locator("ul a, li a").filter({ hasText: product.name }).first().click();
    await expect(agentPage).toHaveURL(/\/settings\/products\/[^/]+/u);
    productId = agentPage.url().match(/\/settings\/products\/([^/?]+)/u)?.[1] ?? "";
    await enableDiagnostics(agentPage, productId);
    await expect(agentPage.getByText(/Your privacy notice must tell your visitors/u)).toBeVisible();

    const page = await customerContext.newPage();
    const widgetHosts = new Set<string>();
    const otherHosts = new Set<string>();
    page.on("request", (request) => {
      const url = new URL(request.url());
      const isWidgetSurface =
        url.pathname.startsWith("/api/widget") ||
        url.pathname === "/widget.js" ||
        url.pathname === "/widget-diagnostics.js" ||
        url.pathname === "/widget";
      if (isWidgetSurface) {
        widgetHosts.add(url.origin);
      } else if (url.origin !== "http://localhost:3101" && !url.origin.startsWith("http://localhost:3200")) {
        otherHosts.add(url.origin);
      }
    });
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/widget/messages") && request.method() === "POST") {
        posts.push(request.postData() ?? "");
      }
    });

    await page.goto(`${diagHostPageFor(APP)}&key=${encodeURIComponent(productKey)}`);
    await page.waitForFunction(() => Boolean((window as { __ssDiag?: unknown }).__ssDiag), null, {
      timeout: 15_000,
    });
    await page.evaluate(() => (window as { __triggerDiag?: () => void }).__triggerDiag?.());
    await page.waitForFunction(
      () =>
        (window as unknown as Record<string, unknown>).__fetchStatus === 500 &&
        (window as unknown as Record<string, unknown>).__xhrStatus === 500 &&
        (window as unknown as Record<string, unknown>).__unreachableFailed === true &&
        (window as unknown as Record<string, unknown>).__threw === true,
    );
    await page.waitForTimeout(150);

    const frame = page.frameLocator("#supportseal-widget-host iframe");
    await page.locator("#supportseal-widget-host button").first().click();
    await expect(frame.locator("#statusline")).toContainText("Online");
    await expect(frame.locator("#diagNotice")).toContainText(/Technical details from this page/u);
    await frame.locator("#input").fill("Self-hosted diagnostics message 5ce9");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("Self-hosted diagnostics message 5ce9");

    expect(posts).toHaveLength(1);
    for (const canary of CANARIES) {
      expect(posts[0], `canary leaked: ${canary}`).not.toContain(canary);
    }
    const payload = JSON.parse(posts[0]) as { diagnostics?: { events: Array<{ kind: string }> } };
    expect(payload.diagnostics?.events?.map((event) => event.kind)).toContain("js_error");

    // DX-18: every widget/diagnostics request targeted the installation.
    expect([...widgetHosts]).toEqual([APP]);
    expect([...otherHosts]).toEqual([]);
    await page.close();
  });

  test("agent sees the diagnostics chip", async () => {
    await agentPage.goto("/inbox");
    const row = agentPage
      .locator("ul[aria-label='Conversations'] li a")
      .filter({ hasText: "Self-hosted diagnostics message 5ce9" });
    await expect(row).toBeVisible();
    await row.click();
    const chip = agentPage.getByRole("button", { name: /^Diagnostics for this message:/u });
    await expect(chip).toBeVisible();
    await chip.click();
    const sheet = agentPage.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Browser");
    await expect(sheet).toContainText("Values that look like secrets, emails or tokens were removed.");
  });
});
