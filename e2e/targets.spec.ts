import { expect, test } from "@playwright/test";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
  studentRow,
} from "./fixtures/students";

/** Sistem şablonunun ünite konusu; topics.spec aynı anda geçici konu ekleyebilir (≥). */
const UNIT_TOPIC_COUNT = 54;

/** "… 12 sa boş var." cümlesinden boş süreyi dakika olarak çıkarır (NBSP'li birimler). */
function availableMinutes(text: string): number {
  const head = text.replace(/\u00a0/g, " ").split(" boş var")[0] ?? "";
  const m = /(?:(\d+) sa)?\s*(?:(\d+) dk)?$/.exec(head);
  if (!m || (m[1] === undefined && m[2] === undefined)) {
    throw new Error(`boş süre okunamadı: ${text}`);
  }
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

/**
 * Faz 5 Parça 2 kabulü (09 §2): koç Hedef sekmesinde toplam soru girer → dağılım dolu →
 * "Takvimi oluştur ve kaydet" → konu listesi tarihli → gerçekçilik cümlesi görünür → Program
 * sekmesinde meşguliyet ekleyince cümledeki boş saat düşer → öğrenci Bugün'de gidişat cümlesi ve
 * çubuk → K1 "Takvim" sütunu ve K2 tablo dolu → haftalık hedef önerisi "Uygula" → hedef formu ve
 * halka yeni değeri gösterir. Test kendi öğrencisini açar ve siler; masaüstü projesi (koç akışı).
 */
test.describe("hedef ve geri planlama", () => {
  test.setTimeout(180_000);

  test("koç hedef kurar, program değişince gerçekçilik değişir, öğrenci gidişatı görür", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "masaüstü koç akışı");
    const student = await createStudentAsOwner(page, { fullName: "E2E Hedef", prefix: "target" });
    try {
      // Hedef sekmesi: toplam soru → dağılım; gerçekçilik cümlesi canlı.
      await page.goto(`/coach/students/${student.studentId}/target`);
      await expect(page.getByRole("heading", { name: "Sınava kadar hedef" })).toBeVisible();
      await expect(page.getByLabel("Konuları bitirme tarihi")).toHaveValue("2027-04-18");
      await page.getByLabel("Toplam soru").fill("9000");
      await expect(page.getByLabel("Türkçe", { exact: true })).toHaveValue("2000");
      await expect(page.getByLabel("İngilizce", { exact: true })).toHaveValue("1000");
      const feasibility = page.getByTestId("feasibility");
      await expect(feasibility).toContainText(/boş var\.$/);
      const before = availableMinutes((await feasibility.textContent()) ?? "");

      // Takvimi oluştur → önizleme → kaydet → 54 konu tarihli.
      await page.getByRole("button", { name: "Takvimi oluştur ve kaydet" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Konu takvimi önizlemesi" })).toBeVisible();
      const previewRows = dialog.getByRole("list", { name: "Önizleme" }).getByRole("listitem");
      await expect(previewRows.nth(UNIT_TOPIC_COUNT - 1)).toBeVisible();
      const topicCount = await previewRows.count();
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(
        page.getByText(new RegExp(`Hedef kaydedildi: ${topicCount}\\s+konu takvime yerleşti\\.`)),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const dateInputs = page.locator("ol > li input[type='date']");
      await expect(dateInputs).toHaveCount(topicCount);
      const values = await dateInputs.evaluateAll((els) =>
        els.map((el) => (el as HTMLInputElement).value),
      );
      expect(values.filter(Boolean)).toHaveLength(topicCount);
      await expect(page.getByText(/^Hedef: /).first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Takvimi yeniden oluştur ve kaydet" }),
      ).toBeVisible();

      // Program sekmesinde meşguliyet → boş saat düşer.
      await page.goto(`/coach/students/${student.studentId}/schedule`);
      await expect(page.getByText("Uyanık aralık:")).toContainText("(kurum varsayılanı)");
      await page.getByRole("button", { name: "Meşguliyet ekle" }).click();
      const slot = page.getByRole("dialog");
      await slot.getByLabel("Gün").selectOption({ label: "Salı" });
      await slot.getByLabel("Başlangıç").fill("08:30");
      await slot.getByLabel("Bitiş").fill("15:00");
      await slot.getByLabel("Tür").selectOption({ label: "Okul" });
      await slot.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Meşguliyet eklendi.")).toBeVisible();
      await page.goto(`/coach/students/${student.studentId}/target`);
      const after = availableMinutes((await page.getByTestId("feasibility").textContent()) ?? "");
      expect(after).toBeLessThan(before);

      // Haftalık hedef önerisi → Uygula → Genel bakış formunda yeni değer.
      await page.getByRole("button", { name: "Haftalık hedefi buna göre öner" }).click();
      const suggestion = page.getByTestId("weekly-goal-suggestion");
      await expect(suggestion).toContainText(
        /Önerilen haftalık hedef: \d[\d.]*\s+soru \(şu an yok\)/,
      );
      const suggested = Number(
        /hedef: ([\d.]+)/
          .exec(((await suggestion.textContent()) ?? "").replace(/\u00a0/g, " "))![1]!
          .replace(/\./g, ""),
      );
      await page.getByRole("button", { name: "Uygula" }).click();
      await expect(page.getByText(/Haftalık hedef .+ olarak kaydedildi\./)).toBeVisible();
      await page.goto(`/coach/students/${student.studentId}`);
      await expect(page.getByLabel("Haftalık soru hedefi")).toHaveValue(String(suggested));

      // K2 Genel bakış: özet kutusu ve ders tablosu.
      const tile = page.getByTestId("pace-tile");
      await expect(tile).toContainText(/\d+\s+konunun 0'ı/);
      await expect(tile).toContainText("takvimle uyumlu");
      const table = page.getByTestId("subject-pace-table");
      await expect(table.getByRole("row")).toHaveCount(7);
      await expect(table).toContainText("2.000");

      // K1: "Takvim" sütunu.
      await page.goto("/coach/students");
      await expect(studentRow(page, student.username).getByTestId("pace-label")).toHaveText(
        "Uyumlu",
      );

      // Öğrenci Bugün: gidişat cümlesi + ince çubuk; uyarı rengi yok (metin nötr).
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/today");
      const card = page.getByTestId("topic-pace-card");
      await expect(card).toContainText(/\d+\s+konunun 0'ı bitti · takvimle uyumlusun/);
      await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
      await expect(card.getByTestId("progress-marker")).toHaveCount(1);
      await expect(page.getByRole("region", { name: "Günün hedefi" })).toContainText(
        "haftalık hedefin %0",
      );
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
