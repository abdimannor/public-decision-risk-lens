const { test, expect } = require("@playwright/test");

// A bare mention of automation shows a neutral context tag (en/sv) that is
// not a risk flag and is not counted in the progress meter.
test("bare automation mention shows a context tag, not a flag", async ({ page }) => {
  await page.goto("/prototype/");
  await page.locator("#doc").fill("Decisions on the allowance may be made using an algorithm.\n\nThe applicant can appeal the decision.");
  await page.locator("#analyse").click();
  const tag = page.locator("#passage-1 .context-tag");
  await expect(tag).toHaveText("Mentions automation");
  await expect(page.locator("#passage-2 .context-tag")).toHaveCount(0);
  const flags = page.locator("#flag-groups .flag");
  const total = await flags.count();
  await expect(page.locator("#progress")).toContainText(`Reviewed 0 of ${total}`);
  await expect(page.locator("#flag-groups")).not.toContainText("Mentions automation");
  await page.getByRole("button", { name: "Svenska" }).click();
  await expect(tag).toHaveText("Nämner automatisering");
});
