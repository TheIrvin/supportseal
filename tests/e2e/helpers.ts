import fs from "node:fs";

import { expect, type Page } from "@playwright/test";

export const APP_ORIGIN = process.env.E2E_APP_URL || "http://localhost:3100";
export const SUPPORT_ORIGIN = "http://localhost:3101";
export const HOST_PAGE = `${SUPPORT_ORIGIN}/?app=${encodeURIComponent(APP_ORIGIN)}`;

export type Fixtures = {
  beta: {
    workspace: { id: string; name: string };
    product: { id: string; key: string; inboundEmail: string };
    owner: { email: string; password: string };
  };
};

export function loadFixtures(): Fixtures {
  return JSON.parse(
    fs.readFileSync(new URL("./.runtime/hosted/fixtures.json", import.meta.url), "utf8"),
  ) as Fixtures;
}

export const INBOUND_SECRET = "e2e-shared-secret-0123456789abcdef";

export type CapturedEmail = {
  from: string;
  to: string[];
  subject: string;
  replyTo: string;
  messageId: string;
  inReplyTo: string;
  references: string;
  body: string;
};

export async function resetCapturedEmails(): Promise<void> {
  const response = await fetch(`${SUPPORT_ORIGIN}/_smtp/reset`, { method: "POST" });
  if (!response.ok) throw new Error("smtp capture reset failed");
}

export async function capturedEmails(): Promise<CapturedEmail[]> {
  const response = await fetch(`${SUPPORT_ORIGIN}/_smtp`);
  if (!response.ok) throw new Error("smtp capture read failed");
  const data = (await response.json()) as { messages: CapturedEmail[] };
  return data.messages;
}

/** Poll the SMTP capture until an email matching the predicate arrives. */
export async function waitForEmail(
  predicate: (email: CapturedEmail) => boolean,
  timeoutMs = 15_000,
): Promise<CapturedEmail> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const emails = await capturedEmails();
    const match = emails.find(predicate);
    if (match) return match;
    if (Date.now() > deadline) {
      throw new Error(
        `no captured email matched within ${timeoutMs}ms (captured: ${JSON.stringify(emails.map((e) => e.subject))})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** Submit an inbound email through the provider webhook (FR-EMAIL-01). */
export async function postInboundEmail(
  payload: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${APP_ORIGIN}/api/email/inbound`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-supportseal-inbound-secret": INBOUND_SECRET,
    },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: (await response.json().catch(() => ({}))) as Record<string, unknown> };
}

/** Unique-enough account values so every run starts from a clean slate. */
export function uniqueAccount() {
  const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    nonce,
    name: `E2E Owner ${nonce}`,
    email: `owner-${nonce}@e2e.test`,
    password: "correct-horse-owner",
    workspace: `E2E Workspace ${nonce}`,
  };
}

export async function registerAccount(
  page: Page,
  account: ReturnType<typeof uniqueAccount>,
): Promise<void> {
  await page.goto("/register");
  await page.locator("#name").fill(account.name);
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/onboarding/u);
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox/u);
}

/**
 * Register an account and complete onboarding up to the install step for one
 * Product; returns that Product's public widget key.
 */
export async function onboardWorkspaceWithProduct(
  page: Page,
  account: ReturnType<typeof uniqueAccount>,
  product: { name: string; domain: string },
): Promise<string> {
  await registerAccount(page, account);
  await page.locator("#name").fill(account.workspace);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/onboarding\/product/u);

  await page.locator("#name").fill(product.name);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/onboarding\/domain/u);

  await page.locator("#domain").fill(product.domain);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: `Remove ${product.domain}` })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/onboarding\/install/u);

  const snippet = (await page.locator("pre").first().textContent()) ?? "";
  const key = snippet.match(/data-key="(pk_[^"]+)"/u)?.[1] ?? "";
  expect(key).toMatch(/^pk_/u);
  return key;
}
