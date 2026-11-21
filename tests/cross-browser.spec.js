const { test, expect } = require("@playwright/test");

// Runs in chromium, firefox and webkit (see playwright.config.js).
test("phone width: no horizontal overflow, Swedish sample loads without errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/prototype/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBe(0);
  await page.selectOption("#sample-pick", "sv");
  await page.click("#load-sample");
  await expect(page.locator("#status")).not.toBeEmpty();
  expect(errors).toEqual([]);
});
