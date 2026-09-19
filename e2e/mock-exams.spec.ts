import { expect, test, type Page } from "@playwright/test";
import { accounts, uniqueUsername } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import { deleteE2EMockExams } from "./fixtures/db";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
  studentRow,
} from "./fixtures/students";

/** Seed öğrencisi Ayşe (4 genel deneme → grafik). */
const AYSE_ID = "b0000000-0000-4000-8000-000000000011";

/** Ders satırlarına doğru/yanlış girer (sıra: Türkçe, Mat, Fen, İnkılap, Din, İng). */
async function fillNets(page: Page, rows: [number, number][]) {
  const list = page.getByTestId("subject-entry-row");
  await expect(list).toHaveCount(rows.length);
  for (const [i, [correct, wrong]] of rows.entries()) {
    await list.nth(i).getByLabel("Doğru", { exact: true }).fill(String(correct));
    await list.nth(i).getByLabel("Yanlış", { exact: true }).fill(String(wrong));
  }
}

/**
 * Faz 6 Parça 1 kabulü (10 §2): koç katalogda deneme tanımlar → öğrenci sihirbazda seçer, 6 derste
 * D/Y girer (Boş otomatik), 2 konu işaretler, kaydeder → detayda toplam net şablon kuralıyla →
 * listede satır; ikinci serbest deneme → değişim; koç K2 Denemeler sekmesinde ders tablosu ve konu
 * birikimi, K1 "Son net" dolu; karşılaştırma sayfasında öğrenci satırı; sonucu olan katalog
 * denemesi silinemez; düzenleme (`?edit=1`) neti değiştirir; silme. Katalog kaydı sonda silinir.
 * Katalog kurum tablosu olduğundan spec masaüstü projesinde kalır (benzersiz başlık).
 */
test.describe("denemeler", () => {
  test.setTimeout(240_000);

  test("koç katalog tanımlar, öğrenci girer, koç karşılaştırır ve düzenler", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "masaüstü koç akışı");
    const examTitle = `E2E Deneme ${uniqueUsername("m")}`;
    const student = await createStudentAsOwner(page, { fullName: "E2E Deneme", prefix: "mock" });
    try {
      // Owner katalogda genel deneme tanımlar.
      await page.goto("/coach/exams");
      await page.getByRole("button", { name: "Deneme tanımla" }).click();
      const sheet = page.getByRole("dialog");
      await sheet.getByLabel("Deneme adı").fill(examTitle);
      await sheet.getByLabel("Yayınevi").fill("E2E Yayınları");
      await sheet.getByLabel("Tarih").fill("2026-09-01");
      await sheet.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Deneme tanımlandı.")).toBeVisible();
      const examRow = page.getByTestId("mock-exam-row").filter({ hasText: examTitle });
      await expect(examRow).toContainText("0 öğrenci");

      // Öğrenci: sihirbaz → katalog denemesi → netler → 2 konu → kaydet.
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/exams");
      await expect(
        page.getByRole("heading", { level: 2, name: "Henüz deneme eklemedin" }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Deneme ekle", exact: true }).click();
      await expect(page).toHaveURL(/\/student\/exams\/new$/);
      await page.getByRole("radio", { name: new RegExp(examTitle) }).click();
      await page.getByRole("button", { name: "Devam" }).click();
      const rows = page.getByTestId("subject-entry-row");
      await expect(rows).toHaveCount(6);
      await fillNets(page, [
        [15, 3],
        [12, 3],
        [10, 6],
        [8, 1],
        [7, 0],
        [6, 3],
      ]);
      // Boş otomatik: Türkçe 20 − 15 − 3 = 2; özet toplam 90 soru, net 52,67 (ceza 3).
      await expect(rows.nth(0).getByLabel("Boş (otomatik)", { exact: true })).toHaveValue("2");
      await expect(page.getByTestId("wizard-summary")).toContainText(`Toplam 90 soru · Net 52,67`);
      await page.getByRole("button", { name: "Devam" }).click();
      await page.getByRole("checkbox", { name: "Sözcükte Anlam" }).click();
      await page.getByRole("checkbox", { name: "Üslü İfadeler" }).click();
      await page.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Deneme kaydedildi. Toplam net 52,67.")).toBeVisible();
      await expect(page).toHaveURL(/\/student\/exams\/[0-9a-f-]{36}$/);
      await expect(page.getByTestId("result-total-net")).toHaveText("52,67");
      await expect(page.getByTestId("marked-topics").getByRole("listitem")).toHaveCount(2);

      // Liste: satır + son deneme kartı; katalog denemesi artık "Girildi".
      await page.goto("/student/exams");
      await expect(page.getByTestId("result-row")).toHaveCount(1);
      await expect(page.getByTestId("last-result")).toContainText("52,67");
      await page.goto("/student/exams/new");
      await expect(page.getByRole("radio", { name: new RegExp(examTitle) })).toBeDisabled();

      // İkinci serbest deneme → değişim +8,99; dört denemeden az → kart listesi.
      await page.getByRole("radio", { name: "Başka bir deneme" }).click();
      await page.getByLabel("Deneme adı").fill("E2E Serbest");
      await page.getByRole("button", { name: "Devam" }).click();
      await fillNets(page, [
        [16, 2],
        [14, 3],
        [12, 3],
        [8, 2],
        [8, 0],
        [7, 0],
      ]);
      await page.getByRole("button", { name: "Devam" }).click();
      await page.getByRole("button", { name: "Atla" }).click();
      await expect(page.getByText("Deneme kaydedildi. Toplam net 61,66.")).toBeVisible();
      await expect(page.getByTestId("result-detail")).toContainText("önceki denemeye göre +8,99");
      await page.goto("/student/exams");
      await expect(page.getByTestId("result-row")).toHaveCount(2);
      await expect(page.getByTestId("result-card-list")).toContainText(
        "İki denemede toplam net 8,99 arttı.",
      );
      await expect(page.getByTestId("top-mistake-topics")).toContainText("2 denemenin 1'inde");

      // Koç: K2 Denemeler sekmesi, K1 "Son net", karşılaştırma, silme kısıtı.
      await logout(page);
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/exams`);
      await expect(page.getByTestId("subject-progress-table").getByRole("row")).toHaveCount(7);
      await expect(page.getByTestId("subject-progress-table")).toContainText("+2,00");
      await expect(page.getByTestId("top-mistake-topics").getByRole("listitem")).toHaveCount(2);
      await page.goto(`/coach/students/${student.studentId}`);
      await expect(page.getByTestId("last-mock-tile")).toContainText("61,66");
      await page.goto("/coach/students");
      await expect(studentRow(page, student.username).getByTestId("last-net")).toContainText(
        "61,66",
      );
      await page.goto("/coach/exams");
      await examRow.getByRole("link", { name: examTitle }).click();
      await expect(page.getByRole("heading", { level: 1, name: examTitle })).toBeVisible();
      const comparisonRow = page
        .getByTestId("comparison-row")
        .filter({ hasText: student.fullName });
      await expect(comparisonRow).toContainText("52,67");
      await page.goto("/coach/exams");
      page.once("dialog", (d) => d.accept());
      await examRow.getByRole("button", { name: `${examTitle} sil` }).click();
      await expect(
        page.getByText("Bu denemeyi 1 öğrenci girdi; önce sonuçları sil."),
      ).toBeVisible();

      // Koç düzenler (?edit=1): Türkçe 17 doğru → toplam net değişir; sonra siler.
      await page.goto(`/coach/students/${student.studentId}/exams`);
      await page.getByTestId("result-row").filter({ hasText: examTitle }).getByRole("link").click();
      await page.getByRole("link", { name: "Düzenle" }).click();
      await expect(page).toHaveURL(/edit=1$/);
      await page.getByRole("button", { name: "Devam" }).click();
      await page
        .getByTestId("subject-entry-row")
        .nth(0)
        .getByLabel("Doğru", { exact: true })
        .fill("17");
      await page.getByRole("button", { name: "Devam" }).click();
      await page.getByRole("button", { name: "Kaydet", exact: true }).click();
      await expect(page.getByText("Deneme güncellendi. Toplam net 54,67.")).toBeVisible();
      await expect(page.getByTestId("result-total-net")).toHaveText("54,67");
      await page.getByRole("button", { name: "Sil", exact: true }).click();
      await page.getByRole("button", { name: "Denemeyi sil" }).click();
      await expect(page.getByText("Deneme silindi.")).toBeVisible();
      await expect(page).toHaveURL(/\/exams$/);
      await expect(page.getByTestId("result-row")).toHaveCount(1);
    } finally {
      await deleteStudentAsOwner(page, student.username);
      await deleteE2EMockExams();
    }
  });

  test("seed öğrencisinde dört denemeyle trend grafiği", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await page.goto("/student/exams");
    const figure = page.getByRole("figure", { name: /denemede toplam net/ });
    await expect(figure).toBeVisible();
    await expect(figure.getByRole("row")).toHaveCount(5); // başlık + 4 deneme
    await expect(figure.getByRole("checkbox", { name: "Toplam net" })).toBeChecked();
    await figure.getByRole("checkbox", { name: "Mat", exact: true }).click();
    await expect(figure.getByRole("checkbox", { name: "Mat", exact: true })).toBeChecked();
    await expect(page.getByTestId("last-result")).toContainText("63,33");
    await logout(page);

    await login(page, accounts.coach.identifier);
    await page.goto(`/coach/students/${AYSE_ID}/exams`);
    await expect(page.getByRole("figure", { name: /denemede toplam net/ })).toBeVisible();
    await expect(page.getByTestId("top-mistake-topics")).toContainText("Üslü İfadeler");
  });
});
