const { test, expect } = require("@playwright/test");

test("progress meter counts decisions by category and jumps to the next unreviewed flag", async ({ page }) => {
  await page.goto("/prototype/");
  await page.getByRole("button", { name: "Load fictional sample" }).click();
  const flags = page.locator("#flag-groups .flag");
  const total = await flags.count();
  const meter = page.locator("#progress");
  await expect(meter).toContainText(`Reviewed 0 of ${total}`);
  await expect(meter.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await flags.nth(0).getByLabel("Accept").check();
  await expect(meter).toContainText(`Reviewed 1 of ${total}`);
  await expect(meter.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  expect(await meter.locator(".p-cats li").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Next unreviewed" }).click();
  await expect(flags.nth(1)).toBeFocused();
  // Sticky: stays in view while the review column scrolls.
  await flags.nth(total - 1).scrollIntoViewIfNeeded();
  await expect(meter).toBeInViewport();
  for (let i = 1; i < total; i++) await flags.nth(i).getByLabel("Reject").check();
  await expect(meter).toContainText(`Reviewed ${total} of ${total}`);
  await expect(page.getByRole("button", { name: "Next unreviewed" })).toBeDisabled();
});

test("a flag without a reviewer question does not print the text null", async ({ page }) => {
  await page.goto("/prototype/");
  await page.getByRole("button", { name: "Load fictional sample" }).click();
  await expect(page.locator("#flag-groups .flag").first()).not.toContainText("null");
  await expect(page.locator("#progress")).not.toContainText("null");
});
