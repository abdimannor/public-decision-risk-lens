const { test, expect } = require("@playwright/test");

test("evaluation page loads without errors and passes axe", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const res = await page.goto("/prototype/evaluation.html");
  expect(res.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("How well does it work?");
  await expect(page.locator("#sv h2")).toContainText("Hur bra fungerar det?");
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
  const violations = result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});
