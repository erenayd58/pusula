import { expect, test, type Page } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";

/**
 * Faz 4 Parça 3 kabulü (08 §2): seed öğrencisinde (Ayşe) en az bir uyarı üretilir ve koç
 * listesinde görünür; eşik değiştirilince (ayar formu, owner) sonuç değişir; öğrenci Bugün'de en
 * fazla bir nötr kart. Seed'deki "Sözcükte Anlam" 20 gün önce oturmuş, son kaydı 12 gün önce →
 * varsayılan tekrar günleriyle (7, 15, 30) "Tekrar zamanı"; tekrar günü 90 yapılınca uyarı düşer.
 */
const SEED_TOPIC = "Sözcükte Anlam";

async function saveReviewDays(page: Page, value: string) {
  await page.goto("/coach/settings");
  // Hidrasyon bitmeden yazılırsa react-hook-form varsayılanı üstüne bindirir ("7,15,30907,15,30").
  await page.waitForLoadState("networkidle");
  const field = page.getByLabel("Tekrar günleri");
  await field.fill(value);
  await expect(field).toHaveValue(value);
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.getByText("Ayarlar kaydedildi.")).toBeVisible();
}

test.describe("konu uyarıları", () => {
  test.setTimeout(120_000);

  test("koç listesinde uyarı görünür, eşik değişince düşer; koç ayarları salt okunur", async ({
    page,
  }, testInfo) => {
    // Ayar kurum geneli tek satır: iki proje aynı anda değiştirmesin (yalnızca masaüstü).
    test.skip(testInfo.project.name !== "desktop-chromium", "masaüstü koç ekranı");
    await login(page, accounts.owner.identifier);
    await page.goto("/coach/students");
    const attention = page.getByRole("region", { name: "Dikkat gerektirenler" });
    const seedRow = attention
      .getByTestId("attention-row")
      .filter({ hasText: "Ayşe Kılıç" })
      .filter({ hasText: SEED_TOPIC });
    await expect(seedRow).toHaveCount(1);
    await expect(seedRow).toContainText("Tekrar zamanı");
    await expect(seedRow.getByRole("link", { name: "Öğrenciyi aç" })).toBeVisible();

    // Konular sekmesinde "Bakım gerektirenler" listesinde aynı konu.
    await seedRow.getByRole("link", { name: "Öğrenciyi aç" }).click();
    await expect(page).toHaveURL(/\/coach\/students\/[^/]+\/topics$/);
    const maintenance = page.getByRole("region", { name: "Bakım gerektirenler" });
    await expect(maintenance).toContainText(SEED_TOPIC);
    await expect(page.getByRole("region", { name: "Zayıf konular" })).toBeVisible();

    // Öğrenci kartı varsayılan eşikle: seed konusu (en gecikmiş tekrar).
    await logout(page);
    await login(page, accounts.student.identifier);
    await page.goto("/student/today");
    await expect(page.getByTestId("topic-nudge")).toContainText(
      `${SEED_TOPIC} konusunu tekrar etme zamanı.`,
    );
    await logout(page);
    await login(page, accounts.owner.identifier);

    try {
      // Eşik değişir: tekrar günü 90 → seed konusu artık tekrar zamanı değil.
      await saveReviewDays(page, "90");
      await page.goto("/coach/students");
      await expect(seedRow).toHaveCount(0);
    } finally {
      await saveReviewDays(page, "7, 15, 30");
    }
    await page.goto("/coach/students");
    await expect(seedRow).toHaveCount(1);

    // Koç (owner değil) ayarları salt okunur görür.
    await logout(page);
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/settings");
    await expect(page.getByLabel("Tekrar günleri")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Ayarları kaydet" })).toHaveCount(0);
  });

  test("öğrenci Bugün'de en fazla bir nötr konu kartı görür", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await page.goto("/student/today");
    const nudge = page.getByTestId("topic-nudge");
    await expect(nudge).toHaveCount(1);
    // Masaüstü testi o sırada eşiği değiştirmiş olabilir; kart hangi türden olursa olsun nötr dil.
    await expect(nudge).toContainText(
      /konusunu tekrar etme zamanı\.|konusuna bir göz atma zamanı\.|bir süredir bekliyor\.|Sırada .+ var\./,
    );
    await nudge.click();
    await expect(page).toHaveURL(/\/student\/topics$/);
  });
});
