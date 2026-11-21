const { test, expect } = require("@playwright/test");
const { makeDocx } = require("./fixtures/make-docx.js");

const DOC_TEXT = "The agency uses automated decision-making to sort applications.";
const FILES = {
  "beslut.txt": { mimeType: "text/plain", buffer: Buffer.from(`${DOC_TEXT}\n\nApplicants can appeal the decision.`) },
  "beslut.md": { mimeType: "text/markdown", buffer: Buffer.from(`# Decision\n\nThe agency uses **automated decision-making** to sort applications.`) },
  "beslut.html": { mimeType: "text/html", buffer: Buffer.from(`<html><head><style>p{}</style></head><body><h1>Decision</h1><p>The agency uses automated\n decision-making to sort applications.</p><script>document.title="x"</script></body></html>`) },
  "beslut.docx": { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: makeDocx([DOC_TEXT, "Applicants can appeal the decision."]) }
};

for (const [name, f] of Object.entries(FILES)) {
  test(`opens ${name} in the browser and records it as the source`, async ({ page }) => {
    await page.goto("/prototype/");
    await page.locator("#file").setInputFiles({ name, ...f });
    await expect(page.locator("#doc")).toHaveValue(/automated\s+decision-making/);
    await expect(page.locator("#doc")).not.toHaveValue(/<|\*\*|document\.title/);
    await expect(page.locator("#workspace")).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#export-json").click()]);
    const log = JSON.parse(await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
    expect(log.source).toBe(name);
  });
}

test("a file dropped on the text area is read", async ({ page }) => {
  await page.goto("/prototype/");
  const b64 = FILES["beslut.docx"].buffer.toString("base64");
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "dropped.docx"));
    const zone = document.getElementById("drop-zone");
    zone.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
    if (!zone.classList.contains("dragging")) throw new Error("no drag cue");
    zone.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, b64);
  await expect(page.locator("#doc")).toHaveValue(/Applicants can appeal/);
  await expect(page.locator("#drop-zone")).not.toHaveClass(/dragging/);
});

test("unsupported and broken files give clear errors in both languages", async ({ page }) => {
  await page.goto("/prototype/");
  await page.locator("#file").setInputFiles({ name: "old.doc", mimeType: "application/msword", buffer: Buffer.from("x") });
  await expect(page.locator("#status")).toHaveText("old.doc is not a supported file type. Use .txt, .md, .html, .docx or .pdf.");
  await page.locator("#file").setInputFiles({ name: "broken.docx", mimeType: "application/octet-stream", buffer: Buffer.from("PK\u0003\u0004 not really a zip") });
  await expect(page.locator("#status")).toHaveText(/broken\.docx could not be read/);
  await page.getByRole("button", { name: "Switch to Swedish" }).click();
  await page.locator("#file").setInputFiles({ name: "tom.txt", mimeType: "text/plain", buffer: Buffer.from("   ") });
  await expect(page.locator("#status")).toHaveText("tom.txt innehåller ingen läsbar text.");
  await expect(page.locator("#file-hint")).toContainText("Inget laddas upp");
});

test("flag map marks flagged passages by category and jumps on select", async ({ page }) => {
  await page.goto("/prototype/");
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  const map = page.getByRole("navigation", { name: "Flag map" });
  await expect(map).toBeVisible();
  const marks = map.getByRole("button");
  const flagged = await page.locator(".passages li.flagged").count();
  await expect(marks).toHaveCount(flagged);
  const last = marks.last();
  await expect(last.locator("span[data-cat]").first()).toHaveCSS("background-color", /rgb\(/);
  const idx = await last.getAttribute("data-passage");
  await last.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(`#passage-${idx}`)).toBeFocused();
  await expect(page.locator(`#passage-${idx}`)).toHaveClass(/active/);
  await expect(last).toHaveAttribute("aria-label", /: /);
});
