import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  HOST_PAGE,
  onboardWorkspaceWithProduct,
  postInboundEmail,
  resetCapturedEmails,
  uniqueAccount,
  waitForEmail,
  type CapturedEmail,
} from "./helpers";

/**
 * Away mode and email continuation (FR-CHAT-04, FR-EMAIL-02): with support
 * Away the widget requires an email, the agent replies asynchronously, the
 * reply is delivered through the managed SMTP sender, and the customer's
 * emailed answer continues the SAME conversation via the reply+token path
 * (FR-EMAIL-01 threading evidence, never the subject).
 */
test.describe.serial("away mode and email continuation", () => {
  const account = uniqueAccount();
  const productName = "Away Desk";
  const visitorEmail = "pat@away.test";

  let agentPage: Page;
  let customerContext: BrowserContext;
  let customerPage: Page;
  let productKey = "";
  let outbound: CapturedEmail;

  test.beforeAll(async ({ browser }) => {
    const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    agentPage = await agentContext.newPage();
    customerContext = await browser.newContext();
  });

  test.afterAll(async () => {
    await agentPage?.context().close();
    await customerContext?.close();
  });

  test("owner switches support availability to Away", async () => {
    productKey = await onboardWorkspaceWithProduct(agentPage, account, {
      name: productName,
      domain: "away.desk.test",
    });

    await agentPage.goto("/inbox");
    await expect(agentPage.getByLabel("Support availability: Live")).toBeVisible();
    await agentPage.getByLabel("Support availability: Live").click();
    await agentPage.getByRole("menuitemcheckbox", { name: /Away — visitors leave a message/u }).click();
    await expect(agentPage.getByLabel("Support availability: Away")).toBeVisible();
  });

  test("widget in away mode requires an email before submission", async ({ page }) => {
    await page.goto(`${HOST_PAGE}&key=${encodeURIComponent(productKey)}`);
    await page.locator("#supportseal-widget-host button").first().click();
    const frame = page.frameLocator("#supportseal-widget-host iframe");

    await expect(frame.locator("#statusline")).toContainText("Away");
    await expect(frame.locator("#away")).toBeVisible();
    await expect(frame.locator("#input")).toBeHidden();

    await frame.locator("#message").fill("Message without an email should be rejected.");
    await frame.locator("#awaySend").click();
    await expect(frame.locator("#awayHint")).toContainText("Enter a valid email address");
  });

  test("visitor submits the away form and the agent sees the conversation", async () => {
    await resetCapturedEmails();
    customerPage = await customerContext.newPage();
    await customerPage.goto(`${HOST_PAGE}&key=${encodeURIComponent(productKey)}`);
    await customerPage.locator("#supportseal-widget-host button").first().click();
    const frame = customerPage.frameLocator("#supportseal-widget-host iframe");

    await frame.locator("#email").fill(visitorEmail);
    await frame.locator("#message").fill("My March invoice is missing the GST line.");
    await frame.locator("#awaySend").click();
    await expect(frame.locator("#thread")).toContainText("missing the GST line");

    await agentPage.goto("/inbox");
    const row = agentPage.locator('ul[aria-label="Conversations"] li a').first();
    await expect(row).toContainText(visitorEmail);
    await row.click();
    await expect(agentPage.getByText("missing the GST line").first()).toBeVisible();
  });

  test("agent reply after the visitor left is delivered by email", async () => {
    test.setTimeout(150_000);
    // Reply routing keeps a chat visitor "connected" for 60s after their
    // last activity (src/lib/email/routing.ts); close their page and wait
    // past that window so the reply routes to email.
    await customerPage.close();

    const reply = "We regenerated the March invoice — the GST line is back. Mind checking?";
    await new Promise((resolve) => setTimeout(resolve, 61_000));
    await agentPage.getByLabel(/^Reply to /u).fill(reply);
    await agentPage.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      agentPage.getByRole("article").filter({ hasText: reply }).first(),
    ).toBeVisible();

    outbound = await waitForEmail((email) => email.to.includes(visitorEmail));
    expect(outbound.subject).toContain(productName);
    expect(outbound.replyTo).toMatch(/reply\+[0-9a-f]+@inbound\.localhost/u);
    expect(outbound.from).toContain("no-reply@inbound.localhost");
    expect(outbound.body).toContain("GST line is back");
    expect(outbound.messageId).toMatch(/<.*@.*>/u);
  });

  test("customer email reply continues the same conversation", async () => {
    test.skip(!outbound, "no outbound email captured");

    const result = await postInboundEmail({
      from: visitorEmail,
      to: outbound.replyTo,
      subject: `Re: ${outbound.subject}`,
      text: "Confirmed fixed, thanks!",
      headers: {
        "Message-ID": "<customer-reply-1@mailer.test>",
        "In-Reply-To": outbound.messageId,
        References: outbound.messageId,
      },
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true });

    await expect(
      agentPage.getByText("Confirmed fixed, thanks!").first(),
    ).toBeVisible({ timeout: 20_000 });

    // One continued thread, not a duplicate conversation (FR-USE-01 counts a
    // Conversation once): the search finds exactly the original row.
    await agentPage.goto("/inbox?q=GST");
    await expect(
      agentPage.locator('ul[aria-label="Conversations"] li a'),
    ).toHaveCount(1);
  });
});
