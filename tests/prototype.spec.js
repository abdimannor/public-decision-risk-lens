const { test, expect, chromium } = require("@playwright/test");
const fs = require("fs");

async function loadSample(page) {
  await page.goto("/prototype/");
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
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

test("keyboard: Tab reaches the decision radios", async ({ page, browserName }) => {
  await loadSample(page);
  await page.locator("#reviewer").focus();
  // WebKit (as Safari by default) moves Tab between text fields only;
  // Option+Tab is its key for every focusable control.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press(tab);
    reached = await page.evaluate(() => document.activeElement?.matches(".flag input[type=radio]") ?? false);
  }
  expect(reached).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".flag").first()).not.toHaveAttribute("data-decision", "");
});

async function makePdf(browser) {
  // page.pdf() exists only in Chromium, so the fixture PDF is always printed
  // there; the upload itself runs in the engine under test.
  const own = browser.browserType().name() === "chromium";
  const printer = own ? browser : await chromium.launch();
  const p = await printer.newPage();
  await p.setContent(`<html><body style="font: 14px sans-serif">
    <p>The municipality introduces a new service for housing support applications.</p>
    <p>Applications are sorted by an algorithm supplied by a third-party supplier.</p>
    <div style="page-break-before: always"></div>
    <p>The system uses automated profiling of applicants by age group to set priority.</p>
  </body></html>`);
  const pdf = await p.pdf({ format: "A4" });
  await p.close();
  if (!own) await printer.close();
  return pdf;
}

test("PDF upload extracts text per page and keeps page numbers", async ({ page, browser }) => {
  const pdf = await makePdf(browser);
  await page.goto("/prototype/");
  await page.locator("#file").setInputFiles({ name: "decision.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator(".passages li")).toHaveCount(3);
  await expect(page.locator(".passages li").nth(2)).toHaveAttribute("data-page", "2");
  await expect(page.locator(".passages li").nth(2)).toContainText("automated profiling");
  await expect(page.locator(".flag .meta", { hasText: "page 2" }).first()).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON" }).click()
  ]);
  const log = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  expect(log.source).toBe("decision.pdf");
  expect(log.flags.some((f) => f.page === 2)).toBe(true);
  expect(log.flags.every((f) => f.page === 1 || f.page === 2)).toBe(true);
});

test("risk map counts flags per category and jumps to a passage", async ({ page }) => {
  await loadSample(page);
  await expect(page.locator("#riskmap-section")).toBeVisible();
  const total = await page.locator(".flag").count();
  const counts = await page.locator(".rm-key").evaluateAll((n) => n.map((k) => Number(k.dataset.count)));
  expect(counts.reduce((a, b) => a + b, 0)).toBe(total);
  const cell = page.locator(".rm-cell.on").last();
  const label = await cell.getAttribute("aria-label");
  const index = label.match(/Passage (\d+)/)[1];
  await cell.click();
  await expect(page.locator(`#passage-${index}`)).toHaveClass(/active/);
  await expect(page.locator(`#passage-${index}`)).toBeFocused();
});

test("print report renders decisions, notes and the advisory notice", async ({ page }) => {
  await loadSample(page);
  const first = page.locator(".flag").first();
  await first.getByLabel("Reject").check();
  await first.locator("textarea").fill("term used in another sense");
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole("button", { name: "Print review report" }).click();
  const report = page.locator("#report");
  await expect(report).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(report).toBeVisible();
  await expect(report).toContainText("Advisory discussion aid");
  await expect(report).toContainText("Decision: reject");
  await expect(report).toContainText("term used in another sense");
  await expect(page.locator("#workspace")).toBeHidden();
  if (process.env.REPORT_PDF) await page.pdf({ path: process.env.REPORT_PDF, format: "A4" });
});

test("reviewer-added rule flags immediately, is marked and exported", async ({ page }) => {
  await loadSample(page);
  const before = await page.locator(".flag").count();
  await page.getByLabel("Term or phrase").fill("home-care");
  await page.getByLabel("Category").selectOption("accountability");
  await page.getByLabel("Review question (optional)").fill("Which unit signs off?");
  await page.getByRole("button", { name: "Add rule" }).click();
  await expect(page.locator('.flag[data-source="reviewer"]').first()).toBeVisible();
  expect(await page.locator(".flag").count()).toBeGreaterThan(before);
  await expect(page.locator('.flag[data-source="reviewer"] .badge').first()).toHaveText("Reviewer-added");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export JSON" }).click()]);
  const log = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  expect(log.flags.some((f) => f.ruleSource === "reviewer-added" && f.reviewerQuestion)).toBe(true);
  expect(log.reviewerRules[0].term).toBe("home-care");
  const [md] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export Markdown" }).click()]);
  expect(fs.readFileSync(await md.path(), "utf8")).toContain("[reviewer-added rule]");
  await page.reload();
  await expect(page.locator("#rule-list li")).toContainText("home-care");
  const [pack] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export rule pack" }).click()]);
  const json = JSON.parse(fs.readFileSync(await pack.path(), "utf8"));
  expect(json.format).toBe("risk-lens-rule-pack");
  await page.getByRole("button", { name: 'Remove rule "home-care"' }).click();
  await expect(page.locator('.flag[data-source="reviewer"]')).toHaveCount(0);
  await page.locator("#rules-import").setInputFiles({ name: "pack.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(json)) });
  await expect(page.locator("#rules-status")).toContainText("Imported 1 new rule");
  await expect(page.locator('.flag[data-source="reviewer"]').first()).toBeVisible();
});

test("compare two versions lists appearing, disappearing and persisting flags", async ({ page }) => {
  await page.goto("/prototype/");
  await page.getByLabel("Version A (earlier)").fill("The agency uses an algorithm, explained online, to rank applications.\n\nThere is no appeal.");
  await page.getByLabel("Version B (revised)").fill("The agency uses an algorithm, explained online, to rank all applications.\n\nData has a retention period of one year.");
  await page.getByRole("button", { name: "Compare versions" }).click();
  await expect(page.locator(".cmp-group.appeared")).toContainText("retention");
  await expect(page.locator(".cmp-group.disappeared")).toContainText("appeal");
  await expect(page.locator(".cmp-group.persisted")).toContainText("algorithm");
});

test("why this flag shows rule, context, category and absence checks", async ({ page }) => {
  await loadSample(page);
  const why = page.locator(".flag .why").first();
  await why.locator("summary").click();
  await expect(why.locator("dt", { hasText: "Rule" })).toBeVisible();
  await expect(why.locator(".ctx mark")).toBeVisible();
  await expect(why).toContainText("Related absence checks");
});
