import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import { listMistakeImages } from "./fixtures/db";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

const AYSE_ID = "b0000000-0000-4000-8000-000000000011";
const FIXTURE_IMAGE = "e2e/fixtures/soru.jpg";

/**
 * Faz 6 Parça 2 kabulü (10 §2 Parça 2): öğrenci fotoğraflı yanlış ekler (sıkıştırma + doğrudan
 * yükleme + `{org}/{student}/` yolu), listede küçük görsel, "Çözdüm" ve filtreler, fotoğrafsız ikinci
 * kayıtta not alanı ipuçlu; koç sekmesinde dağılım ve konu sayısı; öğrenci kaydı silince nesne yok;
 * owner öğrenciyi silince klasör boş. Veli: Denemeler sekmesi ve Özet kartı "siz" diliyle; defter
 * rotası yok. Uyarı bağlama seed'den okunur (mock_weak K2 zayıf listesinde, K1 notu, hücre satırı).
 */
test.describe("yanlış defteri", () => {
  test.setTimeout(240_000);

  test("öğrenci fotoğraflı ve fotoğrafsız yanlış ekler, çözer, siler; koç dağılımı görür", async ({
    page,
  }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Defter", prefix: "mist" });
    try {
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/mistakes");
      await expect(page.getByRole("heading", { level: 2, name: "Defterin boş" })).toBeVisible();

      // 1. Fotoğraflı kayıt: fotoğraf seçilince not alanı "Not ekle" bölümüne iner.
      await page.getByRole("link", { name: "Yanlış ekle", exact: true }).click();
      await expect(page).toHaveURL(/\/student\/mistakes\/new$/);
      await expect(page.getByPlaceholder("Soruyu kısaca yaz ya da fotoğraf ekle")).toBeVisible();
      await page.getByLabel("Fotoğraf seç").setInputFiles(FIXTURE_IMAGE);
      await expect(page.getByTestId("mistake-photo-preview")).toBeVisible();
      await expect(page.getByPlaceholder("Soruyu kısaca yaz ya da fotoğraf ekle")).toHaveCount(0);
      await expect(page.getByText("Not ekle")).toBeVisible();
      await page.getByRole("radio", { name: "Mat", exact: true }).click();
      await page.getByLabel("Konu (isteğe bağlı)").selectOption({ label: "Üslü İfadeler" });
      await page.getByRole("radio", { name: "İşlem hatası" }).click();
      await page.getByRole("button", { name: "Deftere ekle" }).click();
      await expect(page.getByText("Yanlış deftere eklendi.")).toBeVisible();
      await expect(page).toHaveURL(/\/student\/mistakes$/);
      const cards = page.getByTestId("mistake-card");
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText("Üslü İfadeler");
      await expect(cards.first()).toContainText("İşlem hatası");
      await expect(cards.first().locator("img")).toHaveAttribute("src", /mistake-images/);
      // Depo: nesne öğrencinin klasöründe, 2 MB altında (fixture ~40 KB; sıkıştırma webp).
      const objects = await listMistakeImages(student.studentId);
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatch(/\.(webp|jpg)$/);

      // 2. Çözdüm → fosforlu "Çözüldü"; filtreler.
      await cards.first().getByRole("button", { name: "Çözdüm" }).click();
      await expect(page.getByText("Çözdün, harika!")).toBeVisible();
      await expect(cards.first()).toHaveAttribute("data-status", "solved");
      await page.getByRole("link", { name: "Çözüldü", exact: true }).click();
      await expect(page).toHaveURL(/status=solved/);
      await expect(page.getByTestId("mistake-card")).toHaveCount(1);
      await page.getByRole("link", { name: "Açık", exact: true }).click();
      await expect(page.getByText("Bu filtrede kayıt yok.")).toBeVisible();

      // 3. Fotoğrafsız ikinci kayıt: not alanı açık ve ipuçlu; sadece ders + not.
      await page.goto("/student/mistakes/new");
      const note = page.getByPlaceholder("Soruyu kısaca yaz ya da fotoğraf ekle");
      await expect(note).toBeVisible();
      await expect(page.getByText("İkisi de zorunlu değil")).toBeVisible();
      await note.fill("Paragrafın ana fikrini yanlış seçtim");
      await page.getByRole("radio", { name: "Türkçe", exact: true }).click();
      await page.getByRole("button", { name: "Deftere ekle" }).click();
      await expect(page.getByText("Yanlış deftere eklendi.")).toBeVisible();
      await expect(page.getByTestId("mistake-card")).toHaveCount(2);
      await expect(page.getByTestId("mistake-card").first()).toContainText(
        "Paragrafın ana fikrini yanlış seçtim",
      );
      await expect(page.getByTestId("mistake-card").first()).toContainText("Bilmiyorum");

      // 4. Koç sekmesi: dağılım (2 kayıt) + konu listesi + salt okunur liste.
      await logout(page);
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/mistakes`);
      const distribution = page.getByTestId("reason-distribution");
      await expect(distribution).toContainText("İşlem hatası");
      await expect(distribution).toContainText("Bilmiyorum");
      await expect(distribution).toContainText(/2 kayıt/);
      await expect(page.getByTestId("topic-mistake-list")).toContainText("Üslü İfadeler");
      await expect(page.getByTestId("mistake-card")).toHaveCount(2);
      await expect(page.getByRole("button", { name: "Çözdüm" })).toHaveCount(0);

      // 5. Öğrenci fotoğraflı kaydı siler → depo nesnesi yok.
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/mistakes?status=solved");
      await page.getByTestId("mistake-card").first().getByRole("link").click();
      await expect(page).toHaveURL(/\/student\/mistakes\/[0-9a-f-]{36}$/);
      await expect(page.getByTestId("mistake-image")).toBeVisible();
      await page.getByRole("button", { name: "Sil", exact: true }).click();
      await page.getByRole("button", { name: "Kaydı sil" }).click();
      await expect(page.getByText("Kayıt silindi.")).toBeVisible();
      await expect(page).toHaveURL(/\/student\/mistakes$/);
      await expect(page.getByTestId("mistake-card")).toHaveCount(1);
      expect(await listMistakeImages(student.studentId)).toHaveLength(0);

      // 6. Yeni fotoğraflı kayıt bırakılır; owner öğrenciyi silince klasör temizlenir (KVKK).
      await page.goto("/student/mistakes/new");
      await page.getByLabel("Fotoğraf seç").setInputFiles(FIXTURE_IMAGE);
      await expect(page.getByTestId("mistake-photo-preview")).toBeVisible();
      await page.getByRole("radio", { name: "Fen", exact: true }).click();
      await page.getByRole("button", { name: "Deftere ekle" }).click();
      await expect(page.getByText("Yanlış deftere eklendi.")).toBeVisible();
      expect(await listMistakeImages(student.studentId)).toHaveLength(1);
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
    expect(await listMistakeImages(student.studentId)).toHaveLength(0);
  });

  test("veli Özet kartı ve Denemeler sekmesi; Yanlışlar sekmesi (detay izni)", async ({ page }) => {
    await login(page, accounts.parent.identifier);
    await expect(page).toHaveURL(new RegExp(`/parent/${AYSE_ID}$`));
    const card = page.getByTestId("parent-last-result");
    await expect(card).toContainText("Son deneme neti");
    await expect(card).toContainText("63,33");
    await expect(card).toContainText("önceki denemeye göre +7,66");
    await expect(card).toContainText("Ayşe");
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/parent/${AYSE_ID}/exams$`));
    const exams = page.getByTestId("parent-exams");
    await expect(exams).toContainText("Ayşe'nin deneme netleri");
    await expect(page.getByTestId("last-result")).toContainText("63,33");
    await expect(page.getByRole("figure", { name: /denemede toplam net/ })).toBeVisible();
    await expect(page.getByTestId("result-row")).toHaveCount(4);
    // Satırlar bağlantısız (detay rotası yok), sıralama/karşılaştırma yok.
    await expect(page.getByTestId("result-row").first().getByRole("link")).toHaveCount(0);
    // Faz 8 (E8): veli.ayse `can_view_details = true` → "Yanlışlar" sekmesi ve salt okunur liste
    // (parent-summary.spec); anahtar kapalı durumu shared/parent-visibility.spec'te.
    await expect(page.getByRole("navigation", { name: "Veli menüsü" })).toContainText("Yanlışlar");
  });

  test("seed: mock_weak K2 zayıf listesinde, K1 öneri notunda ve hücre detayında", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "masaüstü koç ekranı");
    await login(page, accounts.coach.identifier);
    // K2 Konular: Üslü İfadeler tamamlandı işaretli ama son 3 denemenin 2'sinde yanlış.
    await page.goto(`/coach/students/${AYSE_ID}/topics`);
    const weak = page.getByRole("region", { name: "Zayıf konular" });
    await expect(weak).toContainText("Üslü İfadeler");
    await expect(weak).toContainText(/Tamamlandı işaretli ama son 3 denemenin 2'sinde yanlış/);
    await expect(weak).toContainText("Denemede tekrarlayan yanlış");
    // K1: öneri satırlarında dersin deneme yanlışı notu.
    await page.goto("/coach/students");
    await expect(page.getByTestId("suggestion-strategy-note").first()).toBeVisible();
    await expect(page.getByText(/son 3 denemede \d+ yanlış/).first()).toBeVisible();
    // Koç hücre detayında "Deneme:" satırı.
    await page.goto(`/coach/students/${AYSE_ID}/topics`);
    await page.getByRole("button", { name: /^Üslü İfadeler:/ }).click();
    await expect(page.getByRole("dialog").getByTestId("topic-mock")).toHaveText(
      /Deneme: 3 denemenin 2'sinde yanlış/,
    );
  });
});
