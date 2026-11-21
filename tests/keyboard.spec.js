const { test, expect } = require("@playwright/test");

test("j/k move between flags, a/r/c decide, n opens the note, ? shows the sheet", async ({ page }) => {
  await page.goto("/prototype/");
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  const flags = page.locator("#flag-groups .flag");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("j");
  await expect(flags.nth(0)).toBeFocused();
  await page.keyboard.press("j");
  await expect(flags.nth(1)).toBeFocused();
  await page.keyboard.press("k");
  await expect(flags.nth(0)).toBeFocused();
  await page.keyboard.press("a");
  await expect(flags.nth(0)).toHaveAttribute("data-decision", "accept");
  await page.keyboard.press("j");
  await page.keyboard.press("r");
  await expect(flags.nth(1)).toHaveAttribute("data-decision", "reject");
  await page.keyboard.press("c");
  await expect(flags.nth(1)).toHaveAttribute("data-decision", "contextualise");
  await page.keyboard.press("n");
  const note = flags.nth(1).locator("textarea");
  await expect(note).toBeFocused();
  // Typing in the note must not trigger shortcuts.
  await page.keyboard.type("a j r note");
  await expect(note).toHaveValue("a j r note");
  await expect(flags.nth(1)).toHaveAttribute("data-decision", "contextualise");
  await page.keyboard.press("Escape");
  await expect(flags.nth(1)).toBeFocused();
  // Focus is visible on the current flag.
  const outline = await flags.nth(1).evaluate((n) => getComputedStyle(n).outlineStyle);
  expect(outline).toBe("solid");
  await page.keyboard.press("?");
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  // Text inputs: reviewer field swallows the keys.
  await page.locator("#reviewer").fill("");
  await page.locator("#reviewer").press("j");
  await expect(page.locator("#reviewer")).toHaveValue("j");
  await expect(page.locator("#reviewer")).toBeFocused();
});
