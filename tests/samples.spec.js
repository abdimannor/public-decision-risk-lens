const { test, expect } = require("@playwright/test");
const fs = require("fs");

async function load(page, value) {
  await page.goto("/prototype/");
  await page.getByLabel("Sample", { exact: true }).selectOption(value);
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  await expect(page.locator("#workspace")).toBeVisible();
}

async function markdown(page) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export Markdown" }).click()]);
  return fs.readFileSync(await download.path(), "utf8");
}

const REAL = {
  sv: { text: "Ett beslut kan fattas av en befattningshavare ensam", number: "SFS 2017:900", url: "https://data.riksdagen.se/dokument/sfs-2017-900.text", issuer: "Sveriges riksdag" },
  eu: { text: "Right to explanation of individual decision-making", number: "CELEX 32024R1689", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689", issuer: "European Parliament and Council" }
};

for (const [id, r] of Object.entries(REAL)) {
  test(`real sample ${id} loads with full source metadata in UI and Markdown`, async ({ page }) => {
    await load(page, id);
    await expect(page.locator("#doc")).toHaveValue(new RegExp(r.text));
    const meta = page.locator("#source-meta");
    await expect(meta).toBeVisible();
    await expect(meta).toContainText(r.number);
    await expect(meta).toContainText(r.issuer);
    await expect(meta.getByRole("link", { name: r.url })).toHaveAttribute("href", r.url);
    const md = await markdown(page);
    for (const s of ["## Source of this sample", "- Title: ", `- Issued by: ${r.issuer}`, "- Date: ", `- Document number: `, r.number, `- Source URL: ${r.url}`, "- Retrieved: ", "- Reuse: ", "Verbatim excerpt"]) expect(md).toContain(s);
  });
}

test("fictional sample is labelled fictional in UI and Markdown", async ({ page }) => {
  await load(page, "fictional");
  await expect(page.locator("#source-meta")).toContainText("Fictional text written for this prototype");
  const md = await markdown(page);
  expect(md).toContain("- Title: Fictional example");
  expect(md).toContain("Fictional text written for this prototype");
});

test("typing in the document drops the sample metadata", async ({ page }) => {
  await load(page, "eu");
  await page.locator("#doc").fill("A new text about profiling.");
  await expect(page.locator("#source-meta")).toBeHidden();
});

test("review summary counts decisions, categories, reviewer rules and absences", async ({ page }) => {
  await page.goto("/prototype/");
  await page.getByLabel("Term or phrase").fill("framework agreement");
  await page.getByRole("button", { name: "Add rule" }).click();
  await load(page, "fictional");
  const sum = page.locator("#summary");
  await expect(sum).toBeVisible();
  await expect(sum.getByRole("heading", { name: "Review summary" })).toBeVisible();
  const total = await page.locator("#flag-groups .flag").count();
  await expect(sum.locator('[data-decision="notReviewed"]')).toHaveText(`not reviewed: ${total}`);
  await page.locator("#flag-groups .flag").first().getByRole("radio", { name: "Accept" }).check();
  await expect(sum.locator('[data-decision="accept"]')).toHaveText("Accept: 1");
  await expect(sum.locator('[data-decision="notReviewed"]')).toHaveText(`not reviewed: ${total - 1}`);
  await expect(sum.locator(".sum-cats")).toContainText("1 accepted");
  await expect(sum.locator(".sum-rules")).toContainText('"framework agreement"');
  await expect(sum).toContainText("Not found in this text");
  await page.getByRole("button", { name: "Svenska" }).click();
  await expect(sum.getByRole("heading", { name: "Sammanfattning av granskningen" })).toBeVisible();
  await expect(sum.locator('[data-decision="accept"]')).toHaveText("Godta: 1");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Print review report" }).evaluate((b) => { window.print = () => {}; b.click(); });
  const report = page.locator("#report .r-summary");
  await expect(report).toContainText("Review summary");
  await expect(report).toContainText("Accept: 1");
  await expect(report).toContainText('"framework agreement"');
});
