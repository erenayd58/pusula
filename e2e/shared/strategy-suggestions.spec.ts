import { expect, test, type Page } from "@playwright/test";
import { accounts } from "../fixtures/accounts";
import { login, logout } from "../fixtures/auth";
import { createStudentAsOwner, deleteStudentAsOwner } from "../fixtures/students";

/**
 * Faz 5 Parça 3 kabulü (09 §2): owner dönemleri bugünü kapsayan tek "Deneme ve eksik kapatma"
 * dönemine (yeni %0 / zayıf %0 / bakım %100) çekip öğrenci başına öneriyi 2'ye indirince seed
 * öğrencisinin (Ayşe: bu hafta planlı olmayan iki "Tekrar zamanı" uyarısı, gerisi "Başlanmamış";
 * zayıf uyarısı yok) K2 önerilerinde "Başlanmamış" / "Okulun gerisinde"
 * türü kalmaz ve K1/K2 başlığında dönem adı ve karışım görünür; varsayılanlara dönünce
 * "Başlanmamış" geri gelir. Takvimin gerisindeki seed öğrencisinde (Mehmet) satırda strateji notu
 * ("hedef tarihi 3 hafta geçti"). "Önerilen planı hazırla" sonucu aynı gün sütununda aynı
 * dersten iki görev yok (ders çeşitliliği; asıl kural birim testte). Kurum geneli ayar
 * değiştiği için `shared-desktop` projesi (seri, diğer projelerden önce); ayar `finally` içinde
 * varsayılanlara döndürülür.
 */
const NBSP = "\u00a0";
const AYSE = "b0000000-0000-4000-8000-000000000011";
const MEHMET = "b0000000-0000-4000-8000-000000000012";

async function deleteAllPeriods(page: Page) {
  const rows = page.getByLabel(/^\d\. dönem adı$/);
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: "1. dönemi sil" }).click();
  }
  await expect(page.getByText("Sezon dönemleri tanımlı değil")).toBeVisible();
}

async function saveSettings(page: Page) {
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.getByText("Ayarlar kaydedildi.")).toBeVisible();
}

test.describe("strateji farkındalığı", () => {
  test.setTimeout(180_000);

  test("dönem karışımı önerileri değiştirir; başlıkta dönem adı, satırda strateji notu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, accounts.owner.identifier);
    await page.goto("/coach/settings");
    await page.waitForLoadState("networkidle");

    // Tek dönem: bugünü kapsayan "Deneme ve eksik kapatma" (yeni %0, zayıf %0: seed öğrencisinin
    // zayıf uyarısı yok, kota bakımla dolsun); öğrenci başına 2 öneri.
    await deleteAllPeriods(page);
    await page.getByRole("button", { name: "Satır ekle" }).click();
    await page.getByLabel("1. dönem adı").fill("Deneme ve eksik kapatma");
    await page.getByLabel("1. dönem başlangıcı").fill("2026-09-01");
    await page.getByLabel("1. dönem bitişi").fill("2027-06-13");
    await page.getByLabel("1. dönem yeni konu yüzdesi").fill("0");
    await page.getByLabel("1. dönem zayıf konu yüzdesi").fill("0");
    await page.getByLabel("1. dönem bakım yüzdesi").fill("100");
    await page.getByLabel("Öğrenci başına en fazla öneri").fill("2");
    await saveSettings(page);

    try {
      // K1: başlık altında dönem satırı.
      await page.goto("/coach/students");
      const k1 = page.getByRole("region", { name: "Öneriler" });
      await expect(k1.getByTestId("suggestion-period")).toHaveText(
        "Dönem: Deneme ve eksik kapatma · karışım yeni %0 / zayıf %0 / bakım %100",
      );

      // K2 Ayşe: bakım kotası iki "Tekrar zamanı" uyarısıyla dolar; yeni konu önerilmez.
      await page.goto(`/coach/students/${AYSE}`);
      const k2 = page.getByRole("region", { name: "Öneriler" });
      await expect(k2.getByTestId("suggestion-period")).toContainText("Deneme ve eksik kapatma");
      const rows = k2.getByTestId("suggestion-row");
      await expect(rows).toHaveCount(2);
      await expect(rows.filter({ hasText: "Başlanmamış" })).toHaveCount(0);
      await expect(rows.filter({ hasText: "Okulun gerisinde" })).toHaveCount(0);
    } finally {
      // Varsayılanlara dön: LGS 2027 üç dönemi (seed ile aynı) ve öğrenci başına 5 öneri.
      await page.goto("/coach/settings");
      await page.waitForLoadState("networkidle");
      await deleteAllPeriods(page);
      await page.getByRole("button", { name: "Varsayılanları öner" }).click();
      await expect(page.getByLabel("1. dönem adı")).toHaveValue("Yeni konu öğrenme");
      await page.getByLabel("Öğrenci başına en fazla öneri").fill("5");
      await saveSettings(page);
    }

    // Geri alınca yeni konu önerisi gelir; dönem adı değişir.
    await page.goto(`/coach/students/${AYSE}`);
    const restored = page.getByRole("region", { name: "Öneriler" });
    await expect(restored.getByTestId("suggestion-period")).toContainText("Yeni konu öğrenme");
    await expect(
      restored.getByTestId("suggestion-row").filter({ hasText: "Başlanmamış" }),
    ).not.toHaveCount(0);

    // Takvimin gerisindeki öğrenci (Mehmet): hedef tarihi geçmiş konunun satırında strateji notu.
    await page.goto(`/coach/students/${MEHMET}`);
    const mehmet = page.getByRole("region", { name: "Öneriler" });
    await expect(mehmet.getByTestId("suggestion-strategy-note").first()).toHaveText(
      new RegExp(`^hedef tarihi \\d+${NBSP}hafta geçti$`),
    );
  });

  test("Önerilen planı hazırla: aynı gün sütununda aynı dersten iki görev yok", async ({
    page,
  }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Strateji", prefix: "str" });
    try {
      await logout(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await expect(page.getByRole("heading", { name: "Bu hafta için plan yok" })).toBeVisible();
      await page.getByRole("button", { name: "Önerilen planı hazırla" }).click();
      await expect(page.getByText(/görev eklendi/)).toBeVisible();
      await expect(page.getByText("Taslak", { exact: true }).first()).toBeVisible();

      const items = page.getByTestId("plan-item");
      expect(await items.count()).toBeGreaterThanOrEqual(2);
      for (const day of [1, 2, 3, 4, 5, 6, 7]) {
        const column = page.getByTestId(`day-${day}`);
        const cards = column.getByTestId("plan-item");
        const subjects: string[] = [];
        for (let i = 0; i < (await cards.count()); i++) {
          // Görev alt satırı "Mat · 40 dk": ders kısa adı ilk parça.
          const meta = await cards.nth(i).locator("span.text-micro-lg").first().innerText();
          subjects.push(meta.split(" · ")[0]!);
        }
        expect(new Set(subjects).size).toBe(subjects.length);
      }
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
