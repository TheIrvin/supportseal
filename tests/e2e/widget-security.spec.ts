import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { HOST_PAGE, loadFixtures } from "./helpers";

/**
 * Widget-facing security behaviours: invalid keys, origin allowlist
 * enforcement (FR-CHAT-01), visitor session scoping (FR-CHAT-02), developer
 * context rendered as untrusted data (FR-CTX-02), and archived Products
 * refusing new chats (FR-PROD-01).
 */
test.describe("widget security", () => {
  const fixtures = loadFixtures();
  const betaKey = fixtures.beta.product.key;

  let customerContext: BrowserContext;
  let ownerPage: Page;

  test.beforeAll(async ({ browser }) => {
    customerContext = await browser.newContext();
    const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    ownerPage = await ownerContext.newPage();
    await ownerPage.goto("/login");
    await ownerPage.locator("#email").fill(fixtures.beta.owner.email);
    await ownerPage.locator("#password").fill(fixtures.beta.owner.password);
    await ownerPage.getByRole("button", { name: "Sign in" }).click();
    await expect(ownerPage).toHaveURL(/\/inbox/u);
  });

  test.afterAll(async () => {
    await customerContext?.close();
    await ownerPage?.context().close();
  });

  test("an invalid widget key cannot start or read anything", async ({ request }) => {
    const config = await request.get(
      `/api/widget/config?key=pk_definitely-not-a-real-key&host=${encodeURIComponent("http://localhost:3101")}`,
    );
    expect(config.status()).toBe(404);
    expect(await config.json()).toMatchObject({ error: "not_found" });

    const session = await request.post(
      `/api/widget/session?key=pk_definitely-not-a-real-key&host=${encodeURIComponent("http://localhost:3101")}`,
    );
    expect(session.status()).toBe(404);
  });

  test("a non-allowlisted origin is refused even with a valid key", async ({ request }) => {
    const response = await request.get(
      `/api/widget/config?key=${encodeURIComponent(betaKey)}&host=${encodeURIComponent("https://evil.example.com")}`,
    );
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ error: "origin_not_allowed" });
  });

  test("one visitor cannot read another visitor's conversation", async ({ request }) => {
    const victimPage = await customerContext.newPage();
    await victimPage.goto(`${HOST_PAGE}&key=${encodeURIComponent(betaKey)}`);
    await victimPage.locator("#supportseal-widget-host button").first().click();
    const frame = victimPage.frameLocator("#supportseal-widget-host iframe");
    await expect(frame.locator("#statusline")).toContainText("Online", { timeout: 20_000 });
    await frame.locator("#input").fill("Victim secret message 8f3a");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("Victim secret message 8f3a");
    await victimPage.close();

    // A second visitor on the same Product gets their own empty session; the
    // guessed-ID variant is the same API with a foreign token.
    const session = await request.post(
      `/api/widget/session?key=${encodeURIComponent(betaKey)}&host=${encodeURIComponent("http://localhost:3101")}`,
    );
    expect(session.status(), await session.text()).toBe(200);
    const sessionBody = (await session.json()) as { token?: string; error?: string };
    expect(sessionBody.error).toBeUndefined();
    const thread = await request.get(
      `/api/widget/messages?key=${encodeURIComponent(betaKey)}&host=${encodeURIComponent("http://localhost:3101")}`,
      { headers: { "x-ss-visitor-token": sessionBody.token ?? "" } },
    );
    expect(thread.status()).toBe(200);
    const body = (await thread.json()) as {
      thread?: { conversationId: string | null; messages: Array<{ body: string }> };
      error?: string;
    };
    expect(body.thread?.conversationId).toBeNull();
    expect(JSON.stringify(body.thread?.messages ?? [])).not.toContain("Victim secret message");
  });

  test("developer context is rendered as untrusted data (FR-CTX-02)", async () => {
    const page = await customerContext.newPage();
    await page.goto(`${HOST_PAGE}&key=${encodeURIComponent(betaKey)}`);
    await page.locator("#supportseal-widget-host button").first().click();
    const frame = page.frameLocator("#supportseal-widget-host iframe");
    await expect(frame.locator("#statusline")).toContainText("Online", { timeout: 20_000 });
    await frame.locator("#input").fill("Context injection probe");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("Context injection probe");
    await page.evaluate(() => {
      const widget = (
        window as unknown as { SupportSealWidget?: { context: (data: unknown) => void } }
      ).SupportSealWidget;
      widget?.context({ plan: '<img src=x onerror="window.__ssXss=1">' });
    });
    await page.waitForTimeout(1_000);
    await page.close();

    await ownerPage.goto("/inbox");
    const row = ownerPage.locator('ul[aria-label="Conversations"] li a').first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(
      ownerPage.getByText('<img src=x onerror="window.__ssXss=1">').first(),
    ).toBeVisible({ timeout: 20_000 });
    const xssFired = await ownerPage.evaluate(() =>
      (window as unknown as { __ssXss?: boolean }).__ssXss === true,
    );
    expect(xssFired).toBe(false);
  });

  test("archiving a Product blocks new widget chats until unarchived", async ({ request }) => {
    await ownerPage.goto(`/settings/products/${fixtures.beta.product.id}`);
    await ownerPage.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(ownerPage.getByText("Archived", { exact: true }).first()).toBeVisible();

    const blocked = await request.post(
      `/api/widget/session?key=${encodeURIComponent(betaKey)}&host=${encodeURIComponent("http://localhost:3101")}`,
    );
    expect(blocked.status()).toBe(404);

    await ownerPage.getByRole("button", { name: "Unarchive", exact: true }).click();
    await expect(ownerPage.getByText("Archived", { exact: true })).toHaveCount(0);
    await expect(ownerPage.getByRole("button", { name: "Archive", exact: true })).toBeVisible();
    const restored = await request.post(
      `/api/widget/session?key=${encodeURIComponent(betaKey)}&host=${encodeURIComponent("http://localhost:3101")}`,
    );
    expect(restored.status()).toBe(200);
  });
});
