import { expect, test, type Page } from "@playwright/test";
import { accounts } from "../fixtures/accounts";
import { login, logout } from "../fixtures/auth";

/**
 * Faz 8 kabulü (12 §2 Adım 7; 01 §7): K1 "Öğrenci uyarıları" seed'de Zeynep (hareketsizlik: tek
 * kayıt 5 gün önce) ve Mehmet (plan uyumu düşük: geçen hafta %33) satırlarını türe göre hızlı eylemle
 * gösterir; K2'de öğrencinin kendi satırı; eşik (hareketsizlik 10 gün) değişince Zeynep düşer.
 * Kurum ayarını değiştirdiği için `shared-desktop`; `finally` geri alır.
 */
async function saveInactivityDays(page: Page, value: string) {
  await page.goto("/coach/settings");
  await page.waitForLoadState("networkidle");
  const field = page.getByLabel("Hareketsizlik (gün)");
  await field.fill(value);
  await expect(field).toHaveValue(value);
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.getByText("Ayarlar kaydedildi.")).toBeVisible();
}

test.describe("öğrenci düzeyi uyarılar (kurum ayarı)", () => {
  test.setTimeout(120_000);

  test("K1 satırları ve hızlı eylemler; eşik değişince düşer; K2 satırı", async ({ page }) => {
    await login(page, accounts.owner.identifier);
    await page.goto("/coach/students");
    const section = page.getByRole("region", { name: "Öğrenci uyarıları" });
    const zeynep = section.getByTestId("student-alert-row").filter({ hasText: "Zeynep Arslan" });
    const mehmet = section.getByTestId("student-alert-row").filter({ hasText: "Mehmet Yılmaz" });
    await expect(zeynep).toHaveAttribute("data-kind", "inactive");
    await expect(zeynep).toContainText("5 gündür kayıt yok");
    await expect(zeynep.getByRole("link", { name: "Not yaz" })).toHaveAttribute(
      "href",
      /\/coach\/students\/[0-9a-f-]{36}\/notes\?new=1$/,
    );
    await expect(mehmet).toHaveAttribute("data-kind", "low_plan");
    await expect(mehmet).toContainText("Geçen hafta planın %33'ü tamamlandı");
    await expect(mehmet.getByRole("link", { name: "Planı gözden geçir" })).toBeVisible();
    // K1 tablosu: Ayşe'de birikmiş tekrar sayısı (v_review_queue), diğerlerinde "—".
    await expect(
      page
        .getByTestId("student-row")
        .filter({ hasText: "ayse.k" })
        .filter({ visible: true })
        .getByTestId("overdue-reviews"),
    ).toBeVisible();

    // Hızlı eylem: "Not yaz" → K2 Notlar sekmesi, form odaklı; K2 Genel bakış'ta uyarı satırı.
    await zeynep.getByRole("link", { name: "Not yaz" }).click();
    await expect(page).toHaveURL(/\/notes\?new=1$/);
    await expect(page.getByLabel("Yeni not")).toBeFocused();
    await page.getByRole("link", { name: "Genel bakış" }).click();
    await expect(page.getByRole("region", { name: "Uyarılar" })).toContainText("Hareketsizlik");

    try {
      await saveInactivityDays(page, "10");
      await page.goto("/coach/students");
      await expect(zeynep).toHaveCount(0);
      await expect(mehmet).toHaveCount(1);
    } finally {
      await saveInactivityDays(page, "3");
    }
    await page.goto("/coach/students");
    await expect(zeynep).toHaveCount(1);
    await logout(page);
  });
});
