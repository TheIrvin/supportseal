import { expect, test, type BrowserContext, type FrameLocator, type Page } from "@playwright/test";

import { HOST_PAGE, registerAccount, uniqueAccount } from "./helpers";

/**
 * The condensed V1 acceptance flow (docs/FRD.md "Acceptance path", Initial.md
 * §52): register → Workspace → Product A → live widget chat → agent reply →
 * identity/context → attachment → Product B → product switch → note, tag and
 * saved reply → close/reopen. Serial by design; the agent and the widget
 * visitor live in separate long-lived browser contexts.
 */
test.describe.serial("V1 acceptance flow", () => {
  const account = uniqueAccount();
  const productA = { name: "Alpha Chat", colour: "#2563eb", domain: "app.alpha.test" };
  const productB = { name: "Beacon Forms", colour: "#db2777", domain: "forms.beacon.test" };

  let agentPage: Page;
  let customerContext: BrowserContext;
  let customerPage: Page;
  let productAId = "";
  let productAKey = "";
  let productBId = "";
  let productBKey = "";
  let conversationAId = "";

  function widgetFrame(page: Page): FrameLocator {
    return page.frameLocator("#supportseal-widget-host iframe");
  }

  async function openWidget(page: Page, key: string): Promise<FrameLocator> {
    await page.goto(`${HOST_PAGE}&key=${encodeURIComponent(key)}`);
    const host = page.locator("#supportseal-widget-host");
    await expect(host).toBeAttached();
    const launcher = host.locator("button").first();
    await expect(launcher).toBeVisible();
    await launcher.click();
    const frame = widgetFrame(page);
    await expect(frame.locator("#statusline")).toContainText("Online", { timeout: 20_000 });
    return frame;
  }

  test.beforeAll(async ({ browser }) => {
    const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    agentPage = await agentContext.newPage();

    customerContext = await browser.newContext();
    customerPage = await customerContext.newPage();
  });

  test.afterAll(async () => {
    await agentPage?.context().close();
    await customerContext?.close();
  });

  test("register, create Workspace and Product A through onboarding", async () => {
    await registerAccount(agentPage, account);

    await agentPage.locator("#name").fill(account.workspace);
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/product/u);

    await agentPage.locator("#name").fill(productA.name);
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/domain/u);
  });

  test("configure Product A domains and reach the install step", async () => {
    await agentPage.locator("#domain").fill(productA.domain);
    await agentPage.getByRole("button", { name: "Add", exact: true }).click();
    await expect(agentPage.getByRole("button", { name: `Remove ${productA.domain}` })).toBeVisible();
    await agentPage.getByRole("button", { name: "Continue" }).click();
    await expect(agentPage).toHaveURL(/\/onboarding\/install/u);

    const snippet = (await agentPage.locator("pre").first().textContent()) ?? "";
    expect(snippet).toContain("/widget.js");
    const keyMatch = snippet.match(/data-key="(pk_[^"]+)"/u);
    expect(keyMatch).toBeTruthy();
    productAKey = keyMatch![1];
    await expect(agentPage.getByRole("link", { name: "Open test page (new tab)" })).toBeVisible();
  });

  test("Product A appears in settings with its widget key", async () => {
    await agentPage.goto("/settings/products");
    const row = agentPage.getByRole("table").getByRole("link", { name: new RegExp(productA.name, "u") });
    await expect(row).toBeVisible();
    const href = await row.getAttribute("href");
    productAId = href?.match(/\/settings\/products\/([^/?]+)/u)?.[1] ?? "";
    expect(productAId).not.toBe("");

    await agentPage.goto(`/settings/products/${productAId}?tab=widget`);
    await expect(agentPage.getByText(/^pk_\S+$/u)).toHaveText(productAKey);
  });

  test("visitor starts an anonymous chat from a real embedded widget", async () => {
    const frame = await openWidget(customerPage, productAKey);
    await expect(frame.locator("#statusline")).toContainText("Online");
    await frame.locator("#input").fill("Hello! The export button is broken on Safari.");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("export button is broken");
  });

  test("onboarding detects the first message and links to the inbox", async () => {
    await agentPage.goto("/onboarding/install");
    await expect(agentPage.getByText("First message received")).toBeVisible({ timeout: 20_000 });
    await agentPage.getByRole("link", { name: "Open it in your inbox" }).click();
    await expect(agentPage).toHaveURL(/\/inbox\/?$/u);

    const firstRow = agentPage.locator('ul[aria-label="Conversations"] li a').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();
    await expect(agentPage).toHaveURL(/\/inbox\/[^/]+\/?$/u);
    conversationAId = agentPage.url().match(/\/inbox\/([^/?]+)/u)![1];
    await expect(agentPage.getByText(productA.name).first()).toBeVisible();
  });

  test("agent replies and the visitor receives it in near real time", async () => {
    const reply = "Thanks for the report — which Safari version are you on?";
    await agentPage.getByLabel(/^Reply to /u).fill(reply);
    await agentPage.getByRole("button", { name: "Send", exact: true }).click();

    await expect(
      agentPage.getByRole("article").filter({ hasText: reply }).first(),
    ).toBeVisible();
    await expect(agentPage.locator("header").getByText("Pending").first()).toBeVisible();

    const frame = widgetFrame(customerPage);
    await expect(frame.locator("#thread")).toContainText(reply, { timeout: 20_000 });
  });

  test("developer SDK identity and context appear beside the conversation", async () => {
    await customerPage.evaluate(() => {
      const widget = (
        window as unknown as {
          SupportSealWidget?: { identify: (data: unknown) => void; context: (data: unknown) => void };
        }
      ).SupportSealWidget;
      widget?.identify({ userId: "usr_2041", name: "Sam Customer" });
      widget?.context({ plan: "Pro", account: "acme-inc", appVersion: "2.1.0" });
    });

    const panel = agentPage.locator("aside");
    await expect(
      panel.getByText(`Identified by ${productA.name} as user`, { exact: false }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByText(`Context from ${productA.name}`)).toBeVisible();
    await expect(panel.getByText("usr_2041")).toBeVisible();
    await expect(panel.getByText("Pro", { exact: true })).toBeVisible();
    await expect(panel.getByText("acme-inc")).toBeVisible();
  });

  test("visitor uploads an attachment the agent can see", async () => {
    const frame = widgetFrame(customerPage);
    await frame.locator("#fileInput").setInputFiles({
      name: "console.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("TypeError: undefined is not an object (evaluating 'csv.headers')"),
    });
    await expect(frame.getByText("console.txt").first()).toBeVisible();
    await frame.locator("#input").fill("Console log attached.");
    await frame.locator("#send").click();

    await expect(agentPage.getByRole("link", { name: /console\.txt/u }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("visitor volunteers an email for later replies (FR-CHAT-04)", async () => {
    const frame = widgetFrame(customerPage);
    await expect(frame.locator("#captureEmail")).toBeVisible();
    await frame.locator("#captureEmail").fill("sam@customer.test");
    await frame.locator("#captureSave").click();
    await expect(frame.locator("#thread")).toContainText("sam@customer.test", { timeout: 10_000 });

    // The capture updates the contact, not the conversation thread, so the
    // already-open inbox view needs a reload to pick it up.
    await agentPage.reload();
    await expect(agentPage.getByText("sam@customer.test").first()).toBeVisible({ timeout: 20_000 });
  });

  test("create Product B and start a conversation on it", async () => {
    await agentPage.goto("/settings/products");
    await agentPage.locator("#name").fill(productB.name);
    await agentPage.locator("#primaryColor").fill(productB.colour);
    await agentPage.locator("#domains").fill(productB.domain);
    await agentPage.getByRole("button", { name: "Create Product" }).click();
    await expect(agentPage).toHaveURL(/\/settings\/products\/[^/]+\/?(\?|$)/u);
    productBId = agentPage.url().match(/\/settings\/products\/([^/?]+)/u)![1];

    await agentPage.goto(`/settings/products/${productBId}?tab=widget`);
    const widgetKeyText = await agentPage.getByText(/^pk_\S+$/u).textContent();
    productBKey = widgetKeyText?.trim() ?? "";
    expect(productBKey).toMatch(/^pk_/u);

    const frame = await openWidget(customerPage, productBKey);
    await frame.locator("#input").fill("Hi Beacon team, how do I embed the form?");
    await frame.locator("#send").click();
    await expect(frame.locator("#thread")).toContainText("embed the form");
  });

  test("unified inbox lists both Products; filter switches scope and back", async () => {
    // The agent reply moved conversation A to Pending, so cover both tabs.
    await agentPage.goto("/inbox?status=PENDING");
    const list = agentPage.locator('ul[aria-label="Conversations"]');
    await expect(list.getByText(productA.name).first()).toBeVisible();
    await agentPage.getByRole("tab", { name: /Open/u }).click();
    await expect(list.getByText(productB.name).first()).toBeVisible({ timeout: 20_000 });

    await agentPage.goto(`/inbox?product=${productAId}&status=PENDING`);
    await expect(agentPage.getByText("Product scope")).toBeVisible();
    await expect(list.getByText(productA.name).first()).toBeVisible();
    await expect(list.getByText(productB.name)).toHaveCount(0);

    await agentPage.getByLabel("Show all Products").click();
    await expect(agentPage.getByText("All Products")).toBeVisible();
    await expect(list.getByText(productA.name).first()).toBeVisible({ timeout: 20_000 });
  });

  test("internal note is visible to agents but never to the visitor", async () => {
    const note = "Internal: Safari 18.2 export bug, tracked as ENG-412.";
    await agentPage.goto(`/inbox/${conversationAId}`);
    // Retry the tab switch: the first click can land before hydration wires
    // up the composer tabs on a freshly loaded page.
    await expect(async () => {
      if (await agentPage.getByLabel("Internal note").isVisible()) return;
      await agentPage.getByRole("tab", { name: "Note" }).click();
      await expect(agentPage.getByLabel("Internal note")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 15_000 });
    await agentPage.getByLabel("Internal note").fill(note);
    await agentPage.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(
      agentPage.getByRole("article", { name: /Internal note by /u }).filter({ hasText: note }),
    ).toBeVisible();

    const frame = await openWidget(customerPage, productAKey);
    await expect(frame.locator("#thread")).toContainText("export button is broken");
    await expect(frame.locator("#thread")).not.toContainText("ENG-412");
  });

  test("agent tags the conversation", async () => {
    await agentPage.getByLabel("Add tag").fill("safari");
    await agentPage.getByLabel("Add tag").press("Enter");
    await expect(agentPage.getByLabel("Remove tag safari")).toBeVisible({ timeout: 20_000 });

    await agentPage.goto("/inbox?status=PENDING");
    await expect(
      agentPage.locator('ul[aria-label="Conversations"]').getByText("safari").first(),
    ).toBeVisible();
  });

  test("saved reply can be created and inserted into the composer", async () => {
    await agentPage.goto("/saved-replies");
    await agentPage.locator("#name").fill("Safari export fix");
    await agentPage.locator("#body").fill("The Safari export fix ships in 2.2 — please update.");
    await agentPage.getByRole("button", { name: "Save reply" }).click();
    await expect(agentPage.getByRole("cell", { name: "Safari export fix", exact: true })).toBeVisible();

    await agentPage.goto(`/inbox/${conversationAId}`);
    await expect(async () => {
      if (await agentPage.getByRole("button", { name: /Safari export fix/u }).isVisible()) return;
      await agentPage.getByRole("button", { name: "Saved" }).click();
      await expect(agentPage.getByRole("button", { name: /Safari export fix/u })).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 15_000 });
    await agentPage.getByRole("button", { name: /Safari export fix/u }).click();
    await expect(agentPage.getByLabel(/^Reply to /u)).toHaveValue(
      "The Safari export fix ships in 2.2 — please update.",
    );
    await agentPage.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      agentPage
        .getByRole("article")
        .filter({ hasText: "The Safari export fix ships in 2.2" })
        .first(),
    ).toBeVisible();
  });

  test("closing a conversation and getting a visitor message reopens it", async () => {
    await agentPage.goto(`/inbox/${conversationAId}`);
    await expect(async () => {
      if (await agentPage.getByRole("button", { name: "Reopen" }).isVisible()) return;
      await agentPage.getByRole("button", { name: "Close", exact: true }).click();
      await expect(agentPage.getByRole("button", { name: "Reopen" })).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 15_000 });
    await expect(agentPage.locator("header").getByText("Closed").first()).toBeVisible();

    const frame = await openWidget(customerPage, productAKey);
    await frame.locator("#input").fill("One more thing — still broken after updating.");
    await frame.locator("#send").click();

    await expect(
      agentPage.getByText("One more thing — still broken after updating.").first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(agentPage.locator("header").getByText("Open").first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
