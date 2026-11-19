const { test, expect } = require("@playwright/test");
const fs = require("fs");

async function loadSample(page) {
  await page.goto("/prototype/");
  await page.getByRole("button", { name: "Load fictional sample" }).click();
  await expect(page.locator("#workspace")).toBeVisible();
}

test("workspace is hidden before analysis", async ({ page }) => {
  await page.goto("/prototype/");
  await expect(page.locator("#workspace")).toBeHidden();
  await expect(page.getByRole("button", { name: "Clear review" })).toBeHidden();
});

test("sample produces flags", async ({ page }) => {
  await loadSample(page);
  expect(await page.locator(".flag").count()).toBeGreaterThan(0);
  await expect(page.locator("#status")).toContainText("flags");
});

test("decision survives a reload and Clear review removes it", async ({ page }) => {
  await loadSample(page);
  const first = page.locator(".flag").first();
  await first.getByLabel("Accept").check();
  await first.locator("textarea").fill("checked against annex");
  await expect(first).toHaveAttribute("data-decision", "accept");
  await page.reload();
  const again = page.locator(".flag").first();
  await expect(again).toHaveAttribute("data-decision", "accept");
  await expect(again.getByLabel("Accept")).toBeChecked();
  await expect(again.locator("textarea")).toHaveValue("checked against annex");
  await expect(page.locator("#status")).toContainText("Reviewed 1 of");
  await page.getByRole("button", { name: "Clear review" }).click();
  await expect(page.locator("#workspace")).toBeHidden();
  await page.reload();
  await expect(page.locator("#workspace")).toBeHidden();
  await expect(page.locator("#doc")).toHaveValue("");
});

test("Markdown export contains passage text and decision", async ({ page }) => {
  await loadSample(page);
  const first = page.locator(".flag").first();
  await first.getByLabel("Accept").check();
  const passage = (await page.locator(".passages li.flagged").first().innerText()).trim();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Markdown" }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^review-log-.*\.md$/);
  const md = fs.readFileSync(await download.path(), "utf8");
  expect(md).toContain("# Review log");
  expect(md).toContain(passage.split("\n")[0].slice(0, 60));
  expect(md).toContain("Decision: accept");
});

test("JSON export is valid", async ({ page }) => {
  await loadSample(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON" }).click()
  ]);
  const log = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  expect(log.flags.length).toBeGreaterThan(0);
});

test("file upload analyses the file", async ({ page }) => {
  await page.goto("/prototype/");
  await page.locator("#file").setInputFiles({ name: "doc.txt", mimeType: "text/plain", buffer: Buffer.from("The system uses automated profiling of applicants.\n\nA second paragraph.") });
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator(".passages li")).toHaveCount(2);
});

test("keyboard: Tab reaches the decision radios", async ({ page }) => {
  await loadSample(page);
  await page.locator("#reviewer").focus();
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.matches(".flag input[type=radio]") ?? false);
  }
  expect(reached).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".flag").first()).not.toHaveAttribute("data-decision", "");
});
