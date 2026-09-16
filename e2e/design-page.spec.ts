import { expect, test, type Locator } from "@playwright/test";

/*
 * /dev/design yalnızca geliştirme sunucusunda açılır (webServer: pnpm dev).
 * Burada yüzey mekanizmasının ölçülebilir kuralları doğrulanır:
 * düğme/giriş yükseklikleri, calm > clay önceliği, portal'a çıkan diyaloğun yüzeyi.
 */
const shadow = (el: Locator) => el.evaluate((n) => getComputedStyle(n).boxShadow);
const height = (el: Locator) => el.evaluate((n) => n.getBoundingClientRect().height);
const radius = (el: Locator) => el.evaluate((n) => getComputedStyle(n).borderRadius);

test.describe("tasarım sistemi sayfası", () => {
  test("açılır ve altı bölümü listeler", async ({ page }) => {
    const response = await page.goto("/dev/design");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pusula tasarım sistemi");
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
  });

  test("clay ve flat düğme/giriş yükseklikleri (48 / 38 px)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Ölçüler fare işaretçisi için.");
    await page.goto("/dev/design");
    expect(await height(page.getByTestId("button-primary-clay"))).toBeCloseTo(48, 0);
    expect(await height(page.getByTestId("button-primary-flat"))).toBeCloseTo(38, 0);
    expect(await height(page.getByTestId("input-clay"))).toBeCloseTo(48, 0);
    expect(await height(page.getByTestId("input-flat"))).toBeCloseTo(38, 0);
  });

  test("dokunmatik cihazda flat düğme en az 44 px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "pointer-coarse emülasyonu gerekir.");
    await page.goto("/dev/design");
    expect(await height(page.getByTestId("button-primary-flat"))).toBeGreaterThanOrEqual(44);
    expect(await height(page.getByTestId("input-flat"))).toBeGreaterThanOrEqual(44);
  });

  test("clay-calm yüzeyinde calm: sınıfı clay: sınıfını yener (clay-sm)", async ({ page }) => {
    await page.goto("/dev/design");
    const calmCard = await shadow(page.getByTestId("calm-card"));
    expect(calmCard).toContain("4px 4px 10px");
    expect(calmCard).not.toContain("8px 8px 20px");
    // Card bileşeni elevation="lg" olsa da veli yüzeyinde clay-sm'e düşer.
    const calmComponent = await shadow(page.getByTestId("calm-card-component"));
    expect(calmComponent).toContain("4px 4px 10px");
    expect(calmComponent).not.toContain("16px 16px 34px");
    // Öğrenci yüzeyinde aynı bileşen clay-lg alır.
    expect(await shadow(page.getByTestId("card-lg-clay"))).toContain("16px 16px 34px");
    // Koç yüzeyinde gölge yok.
    expect(await shadow(page.getByTestId("card-md-flat"))).toBe("none");
  });

  test("diyalog portal'a çıksa da yüzeyini korur", async ({ page }) => {
    await page.goto("/dev/design");

    await page.getByTestId("dialog-trigger-clay").click();
    const clayDialog = page.getByRole("dialog");
    await expect(clayDialog).toHaveAttribute("data-surface", "clay");
    expect(await radius(clayDialog)).toBe("28px");
    await page.keyboard.press("Escape");
    await expect(clayDialog).toBeHidden();

    await page.getByTestId("dialog-trigger-flat").click();
    const flatDialog = page.getByRole("dialog");
    await expect(flatDialog).toHaveAttribute("data-surface", "flat");
    expect(await radius(flatDialog)).toBe("12px");
    await page.getByRole("button", { name: "Kapat" }).click();
    await expect(flatDialog).toBeHidden();
  });

  test("klavye odağı 3 px odak halkası verir", async ({ page }) => {
    await page.goto("/dev/design");
    const button = page.getByTestId("button-primary-clay");
    await button.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const outline = await button.evaluate((n) => {
      const s = getComputedStyle(n);
      return { width: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset };
    });
    expect(outline).toEqual({ width: "3px", style: "solid", offset: "3px" });
  });
});
