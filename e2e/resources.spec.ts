import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import { deleteE2EResources } from "./fixtures/db";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

/**
 * Faz 7 Parça 1 kabulü (11 §2 Parça 1): koç kitabı tek partide tanımlar (Test 1–10 × 20 soru),
 * Test 1–3'ü konuya eşler, öğrenciye atar; öğrenci testi işaretleyince hızlı kayıt ders/konu ön dolu
 * ve Boş otomatik açılır, kayıt teste bağlanır, yüzde güncellenir; koç K2'de yüzdeyi görür. Havuz
 * "Kaynaklar" kategorisinden plan görevi → yayın → öğrenci hızlı kayıtla tamamlar → test bitti.
 * Öğrenci kendi kaynağını ekler (benzer ad önerisi), koç kataloğunda "Öğrenci ekledi" → "Katalogda
 * tut" → "Kaldır". Kurum kataloğu paylaşımlı olduğu için benzersiz adlar; teardown "E2E Kaynak%".
 */
test.describe("kaynaklar", () => {
  test.setTimeout(240_000);

  test("koç kitap tanımlar, eşler, atar; öğrenci test kaydeder; plan bağı; öğrenci kaynağı", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "koç editörü masaüstünde");
    const stamp = Date.now().toString(36);
    const bookTitle = `E2E Kaynak Mat ${stamp}`;
    const ownTitle = `E2E Kaynak Fen ${stamp}`;
    const student = await createStudentAsOwner(page, { fullName: "E2E Kaynak", prefix: "res" });
    try {
      await logout(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);

      // 1. Koç: kitap + tek partide 10 test (sayfa 10'dan 4'er).
      await page.goto("/coach/resources/new");
      await page.getByLabel("Kitap adı").fill(bookTitle);
      await page.getByLabel("Yayınevi (isteğe bağlı)").fill("E2E Yayınları");
      await page.getByRole("radio", { name: "Soru bankası" }).click();
      await page.getByRole("radio", { name: "Mat", exact: true }).click();
      const batch = page.getByTestId("section-batch").first();
      await batch.getByLabel("Başlangıç").fill("1");
      await batch.getByLabel("Bitiş").fill("10");
      await batch.getByLabel("Soru / test").fill("20");
      await batch.getByLabel("İlk sayfa (isteğe bağlı)").fill("10");
      await batch.getByLabel("Sayfa / test").fill("4");
      await expect(batch.getByText(/10\stest · 200\ssoru · s\. 10–49/)).toBeVisible();
      await page.getByRole("button", { name: "Kaynağı kaydet" }).click();
      await expect(page.getByText(/Kaynak kaydedildi: 10\stest/)).toBeVisible();
      await expect(page).toHaveURL(/\/coach\/resources\/[0-9a-f-]{36}$/);
      const resourceUrl = page.url();
      await expect(page.getByRole("heading", { level: 1, name: bookTitle })).toBeVisible();
      await expect(page.getByTestId("section-row")).toHaveCount(10);
      await expect(page.getByTestId("section-row").nth(1)).toContainText("14–17");

      // 2. Test 1–3 → Üslü İfadeler (çoklu seçim + "Konuya eşle").
      for (const n of [1, 2, 3]) {
        await page.getByRole("checkbox", { name: `Test ${n} seç` }).click();
      }
      await expect(page.getByTestId("section-bulk-bar")).toContainText("3 test seçili");
      await page.getByLabel("Konu", { exact: true }).selectOption({ label: "Üslü İfadeler" });
      await page.getByRole("button", { name: "Konuya eşle" }).click();
      await expect(page.getByText(/3\stest “Üslü İfadeler” konusuna eşlendi/)).toBeVisible();
      await expect(page.getByTestId("section-row").nth(2)).toContainText("Üslü İfadeler");
      await expect(page.getByTestId("section-row").nth(3)).not.toContainText("Üslü İfadeler");

      // 3. Atama: öğrenciye tek tıkla.
      await page.getByRole("button", { name: "Öğrenciye ata" }).click();
      let dialog = page.getByRole("dialog");
      await dialog.getByRole("checkbox", { name: student.fullName }).click();
      await dialog.getByRole("button", { name: /1\söğrenciye ata/ }).click();
      await expect(page.getByText("1 öğrenciye atandı.")).toBeVisible();
      await expect(page.getByTestId("assigned-students")).toContainText(student.fullName);

      // 4. Havuz "Kaynaklar": Test 5'i bu haftaya ekle, yayınla.
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await page.getByRole("button", { name: "Görev havuzunu aç" }).click();
      const pool = page.getByRole("complementary", { name: "Görev havuzu" });
      await expect(pool.getByRole("heading", { name: "Kaynaklar" })).toBeVisible();
      await pool
        .getByRole("button", { name: `Güne ekle: ${bookTitle} · Test 5 · 20 soru` })
        .click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Tür")).toHaveValue("section");
      await expect(dialog.getByLabel("Soru sayısı")).toHaveValue("20");
      await dialog.getByRole("button", { name: "Görevi ekle" }).click();
      await expect(page.getByText("Görev eklendi.").last()).toBeVisible();
      await page.getByRole("button", { name: "Planı yayınla" }).click();
      await expect(page.getByText("Plan yayınlandı.")).toBeVisible();
      await logout(page);

      // 5. Öğrenci: liste %0 → Test 2 → hızlı kayıt (Mat, Üslü, Boş otomatik) → %10.
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/resources");
      const card = page.getByTestId("resource-card").filter({ hasText: bookTitle });
      await expect(card.getByTestId("resource-progress")).toContainText("%0 · 0 / 10 test");
      await card.getByRole("link").click();
      await expect(page).toHaveURL(/\/student\/resources\/[0-9a-f-]{36}$/);
      await page.getByRole("button", { name: "Test 2 kaydet" }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Testi kaydet" })).toBeVisible();
      await expect(dialog.getByText(`${bookTitle} · Test 2 · 20 soru`)).toBeVisible();
      await expect(dialog.getByRole("radio", { name: "Mat" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(dialog.getByLabel("Konu (isteğe bağlı)")).toHaveValue(/.+/);
      await dialog.getByLabel("Doğru", { exact: true }).fill("18");
      await dialog.getByLabel("Yanlış", { exact: true }).fill("2");
      await expect(dialog.getByLabel("Boş (otomatik)", { exact: true })).toHaveValue("0");
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText(/Test 2 kaydedildi\./)).toBeVisible();
      await expect(
        page.getByTestId("section-item").filter({ hasText: "Test 2" }).first(),
      ).toHaveAttribute("data-done", "true");
      await expect(page.getByTestId("resource-progress")).toContainText("%10 · 1 / 10 test");

      // 6. Plan görevi (Test 5): Bugün kartından hızlı kayıtla tamamla → test bitti.
      await page.goto("/student/plan");
      await page
        .getByRole("checkbox", { name: `Tamamla: ${bookTitle} · Test 5 · 20 soru` })
        .click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Görevi tamamla" })).toBeVisible();
      await dialog.getByLabel("Doğru", { exact: true }).fill("15");
      await dialog.getByLabel("Yanlış", { exact: true }).fill("5");
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText(/Görev tamamlandı\./)).toBeVisible();
      await page.goto(resourceUrl.replace("/coach/resources/", "/student/resources/"));
      await expect(
        page.getByTestId("section-item").filter({ hasText: "Test 5" }).first(),
      ).toHaveAttribute("data-done", "true");
      await expect(page.getByTestId("resource-progress")).toContainText("%20 · 2 / 10 test");
      await page.goto("/student/logs");
      await expect(page.getByText(`${bookTitle} · Test 5`).first()).toBeVisible();

      // 7. Öğrenci kendi kaynağını ekler: benzer ad önerisi, yine de yeni kitap.
      await page.goto("/student/resources/new");
      await page.getByLabel("Kitap adı").fill("E2E Kaynak");
      await expect(page.getByTestId("resource-suggestions")).toContainText(bookTitle);
      await page.getByLabel("Kitap adı").fill(ownTitle);
      await page.getByRole("radio", { name: "Fasikül" }).click();
      await page.getByRole("radio", { name: "Fen", exact: true }).click();
      const ownBatch = page.getByTestId("section-batch").first();
      await ownBatch.getByLabel("Bitiş").fill("5");
      await ownBatch.getByLabel("Soru / test").fill("15");
      await page.getByRole("button", { name: "Kaynağı kaydet" }).click();
      await expect(page.getByText(/Kaynak kaydedildi: 5\stest\. Listene eklendi\./)).toBeVisible();
      await expect(page.getByRole("link", { name: "Düzenle" })).toBeVisible();
      await page.goto("/student/resources");
      await expect(page.getByTestId("resource-card").filter({ hasText: ownTitle })).toContainText(
        "Sen ekledin",
      );
      await logout(page);

      // 8. Koç: K2 yüzdesi; katalogda "Öğrenci ekledi" → Katalogda tut → Kaldır.
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/resources`);
      const table = page.getByTestId("resource-progress-table");
      await expect(table).toContainText(bookTitle);
      await expect(
        table.locator("li").filter({ hasText: bookTitle }).getByTestId("resource-progress").first(),
      ).toContainText("%20 · 2 / 10 test");
      await expect(table).toContainText("Öğrenci ekledi");
      await page.goto("/coach/resources");
      const ownRow = page.getByTestId("student-added-row").filter({ hasText: ownTitle });
      await expect(ownRow).toContainText(student.fullName);
      await ownRow.getByRole("button", { name: `${ownTitle} katalogda tut` }).click();
      await expect(page.getByText(/kataloğa alındı\./)).toBeVisible();
      await expect(page.getByTestId("student-added-row").filter({ hasText: ownTitle })).toHaveCount(
        0,
      );
      await expect(page.getByTestId("resource-row").filter({ hasText: ownTitle })).toHaveCount(1);
      // Kaldır: satır menüsü yok, detaydan.
      await page
        .getByTestId("resource-row")
        .filter({ hasText: ownTitle })
        .getByRole("link")
        .first()
        .click();
      await expect(page.getByRole("heading", { level: 1, name: ownTitle })).toBeVisible();
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Kaldır", exact: true }).click();
      await expect(page.getByText("Kaynak kaldırıldı.")).toBeVisible();
      await expect(page).toHaveURL(/\/coach\/resources$/);
      await expect(page.getByTestId("resource-row").filter({ hasText: ownTitle })).toHaveCount(0);
    } finally {
      await deleteStudentAsOwner(page, student.username);
      await deleteE2EResources();
    }
  });
});
