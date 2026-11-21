const { test, expect } = require("@playwright/test");

// Runs in chromium, firefox and webkit (see playwright.config.js).
test("phone width: no horizontal overflow, Swedish sample loads without errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/prototype/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const wide = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 6)
      .map((e) => `${e.tagName}.${e.className}#${e.id} ${Math.round(e.getBoundingClientRect().right)}`)
  );
  expect(overflow, `wider than the viewport: ${wide.join(", ")}`).toBe(0);
  await page.selectOption("#sample-pick", "sv");
  await page.click("#load-sample");
  await expect(page.locator("#status")).not.toBeEmpty();
  expect(errors).toEqual([]);
});
