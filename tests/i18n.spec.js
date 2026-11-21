const { test, expect } = require("@playwright/test");
const fs = require("fs");

test.describe("Swedish browser", () => {
  test.use({ locale: "sv-SE" });

  test("defaults to Swedish and translates the interface", async ({ page }) => {
    await page.goto("/prototype/");
    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
    await expect(page.locator(".banner")).toContainText("Rådgivande diskussionsstöd");
    const toggle = page.getByRole("button", { name: "Byt till engelska" });
    await expect(toggle).toHaveAttribute("title", "Byt till engelska");
    await expect(toggle.locator(".ctl-code")).toHaveText("EN");
    await expect(toggle.locator(".ctl-code")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: "Läs in exempel", exact: true }).click();
    await expect(page.locator("#flag-groups summary").first()).toContainText(/Transparens|Ansvarsskyldighet|Diskriminering|Integritet|Mänsklig kontroll|Säkerhet|Missbruk|Möjlighet/);
    await expect(page.locator("#status")).toContainText("flaggor");
    await expect(page.locator(".flag").first().getByLabel("Godta")).toBeVisible();
  });

  test("Swedish Markdown and JSON exports use Swedish headings", async ({ page }) => {
    await page.goto("/prototype/");
    await page.getByRole("button", { name: "Läs in exempel", exact: true }).click();
    await page.locator(".flag").first().getByLabel("Godta").check();
    const [md] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportera Markdown" }).click()]);
    const text = fs.readFileSync(await md.path(), "utf8");
    expect(text).toContain("# Granskningslogg");
    expect(text).toContain("## Flaggor");
    expect(text).toContain("Beslut: godta");
    expect(text).toContain("Rådgivande diskussionsstöd");
    expect(text).not.toContain("## Flags");
    const [js] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportera JSON" }).click()]);
    const log = JSON.parse(fs.readFileSync(await js.path(), "utf8"));
    expect(log.language).toBe("sv");
    expect(log.notice).toMatch(/^Rådgivande/);
    expect(log.flags.some((f) => f.decision === "accept")).toBe(true);
  });
});

test("switching language re-renders, keeps decisions and is remembered", async ({ page }) => {
  await page.goto("/prototype/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  await page.locator(".flag").first().getByLabel("Reject").check();
  await page.getByRole("button", { name: "Switch to Swedish" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "sv");
  await expect(page.getByRole("button", { name: "Analysera texten" })).toBeVisible();
  await expect(page.locator(".flag").first().getByLabel("Avvisa")).toBeChecked();
  await expect(page.locator("#rule-cat option").first()).toHaveText("Transparens");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "sv");
  await expect(page).toHaveTitle(/prototyp/);
  await page.getByRole("button", { name: "Byt till engelska" }).click();
  await expect(page.getByRole("button", { name: "Analyse text" })).toBeVisible();
  await expect(page.locator(".flag").first().getByLabel("Reject")).toBeChecked();
});

test.describe("quiet language control", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("is one 34px globe button naming the other language, and motion stays on", async ({ page }) => {
    await page.goto("/prototype/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    const toggle = page.getByRole("button", { name: "Switch to Swedish" });
    await expect(toggle).toHaveAttribute("title", "Switch to Swedish");
    await expect(toggle.locator(".ctl-code")).toHaveText("SV");
    await expect(toggle.locator(".ctl-code")).toHaveAttribute("lang", "sv");
    const box = await toggle.boundingBox();
    expect(Math.round(box.height)).toBe(34);
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
    await expect(page.getByRole("button", { name: "Byt till engelska" }).locator(".ctl-code")).toHaveText("EN");
  });
});
