import { test, expect } from "@playwright/test";

test("bilingual homepage, model picker and preferences remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "ChatOOP AI Roundtable" }),
  ).toBeVisible();
  await expect(page.getByText(/All replies are simulated/)).toBeVisible();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator("#topic-input")).toHaveAttribute(
    "aria-label",
    "主题 / 问题",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  expect(overflow).toBe(false);
});

test("automatic discussion produces multi-round evidence and a local export", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("#topic-input")
    .fill("Should a small team run a pilot before a full rollout?");
  await page.locator(".rt-submit-arrow").click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(
    page.getByRole("region", { name: "Roundtable summary" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByText("Statements aligned", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Estimated from model statements/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Markdown", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "chatoop-ai-roundtable.md",
  );
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Roundtable summary" }),
  ).toBeVisible();
});

test("stopping a discussion leaves the interface usable", async ({ page }) => {
  await page.goto("/");
  await page.locator("#topic-input").fill("Discuss pilot risks");
  await page.locator(".rt-submit-arrow").click();
  await page
    .getByRole("button", { name: "Stop", exact: true })
    .click({ timeout: 10000 });
  await page.getByRole("textbox").fill("Continue after stopping");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeEnabled();
});
