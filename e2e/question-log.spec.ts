import { expect, test, type Page } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
  studentRow,
} from "./fixtures/students";

/**
 * Faz 3 kabul (01 yol haritası): öğrenci hızlı kayıt girer → Bugün'deki sayı ve hedef değişir →
 * koç listesinde görünür; kayıt düzenleme ve silme. Test kendi öğrencisini açar ve siler
 * (seed öğrencileri değişmez); global-teardown güvenlik ağıdır.
 */
test.describe("hızlı soru kaydı", () => {
  // Beş oturum değişimi + Turbopack ilk derlemesi; telefonda çıkış Ben sayfası üzerinden.
  test.setTimeout(300_000);

  /** Açılan öğrenci; test düşse de afterEach siler (gövde hatası maskelenmez). */
  let created: { username: string } | undefined;
  test.afterEach(async ({ page }) => {
    if (created) await deleteStudentAsOwner(page, created.username);
    created = undefined;
  });

  test("kayıt → Bugün ve hedef → koç listesi → düzenle ve sil", async ({ page }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Kayıt", prefix: "qlog" });
    created = student;
    {
      // Öğrenci: hedef yokken ilk kayıt
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await expect(page).toHaveURL(/\/student\/today$/);
      await expect(page.getByText("Bugün henüz kayıt yok")).toBeVisible();

      await quickLog(page, { subject: "Mat", correct: 20, wrong: 5 });
      await expect(page.getByText("Kaydedildi.", { exact: true })).toBeVisible();
      const todayLogs = page.getByRole("region", { name: "Bugünkü kayıtlar" });
      await expect(todayLogs.getByText("25 soru", { exact: false }).first()).toBeVisible();
      const goal = page.getByRole("region", { name: "Günün hedefi" });
      await expect(goal.getByText("25", { exact: true })).toBeVisible();

      // Koç hedef koyar
      await logout(page);
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}`);
      await page.getByLabel("Günlük soru hedefi").fill("50");
      await page.getByLabel("Haftalık soru hedefi").fill("200");
      await page.getByRole("button", { name: "Hedefleri kaydet" }).click();
      await expect(page.getByText("Hedefler kaydedildi.")).toBeVisible();

      // Öğrenci: ikinci kayıt → kalan soru toast'ı ve halka
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await quickLog(page, { subject: "Fen", correct: 10, wrong: 0 });
      await expect(page.getByText(/Kaydedildi\. Bugün 15 soru kaldı\./)).toBeVisible();
      await expect(goal.getByText("35", { exact: true })).toBeVisible();
      await expect(goal.getByText(/15 soru kaldı/)).toBeVisible();

      // Koç listesinde bu hafta 35 ve haftalık hedef yüzdesi (%17)
      await logout(page);
      await login(page, accounts.coach.identifier);
      await page.goto("/coach/students");
      const row = studentRow(page, student.username);
      await expect(row).toContainText("bugün");
      await expect(row).toContainText("35");
      await expect(row.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "17");

      // Koç Sorular sekmesi
      await page.goto(`/coach/students/${student.studentId}/questions`);
      await expect(page.getByRole("cell", { name: /2[\s ]kayıt/ })).toBeVisible();
      await expect(
        page
          .getByRole("cell", { name: "Çarpanlar ve Katlar" })
          .or(page.getByRole("cell", { name: "—" }).first()),
      ).toBeVisible();

      // Öğrenci: geçmişte düzenle (Mat 20 → 22 doğru) ve sil
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/logs");
      await expect(page.getByRole("heading", { level: 1, name: "Kayıtlarım" })).toBeVisible();
      await page.getByRole("button", { name: /^Düzenle: Matematik/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Kaydı düzenle" })).toBeVisible();
      await dialog.getByLabel("Doğru", { exact: true }).fill("22");
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Kayıt güncellendi.")).toBeVisible();
      await expect(page.getByText("27 soru · 22 D / 5 Y / 0 B")).toBeVisible(); // NBSP normalize edilir

      await page.getByRole("button", { name: /^Sil: Fen Bilimleri/ }).click();
      await page.getByRole("button", { name: "Kaydı sil" }).click();
      await expect(page.getByText("Kayıt silindi.")).toBeVisible();
      await expect(page.getByText(/^Sil: Fen Bilimleri/)).toHaveCount(0);
      await expect(page.getByText(/Son 60 gün · 1 kayıt/)).toBeVisible();
    }
  });
});

/** (+) düğmesi → sheet: ders çipi, Doğru/Yanlış alanlarına yaz, Kaydet. Bugün sayfasından. */
async function quickLog(page: Page, input: { subject: string; correct: number; wrong: number }) {
  await page.goto("/student/today");
  // Telefonda alt menüdeki (+), masaüstünde raydaki "Kayıt"; ikisi de aynı erişilebilir ad.
  await page.getByRole("button", { name: "Soru kaydı ekle" }).filter({ visible: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Soru kaydı" })).toBeVisible();
  await dialog.getByRole("radio", { name: input.subject }).click();
  await dialog.getByLabel("Doğru", { exact: true }).fill(String(input.correct));
  await dialog.getByLabel("Yanlış", { exact: true }).fill(String(input.wrong));
  await expect(
    dialog.getByText(`Toplam ${input.correct + input.wrong}`, { exact: false }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog).toHaveCount(0);
}

/**
 * Kısa telefon ekranı (390×667) ve sanal klavye açıkken (yerleşim alanı ~420 px; viewport
 * `interactive-widget=resizes-content`): "Kaydet" her zaman görünür alanda, panel taşmaz,
 * yalnızca gövde kayar. Seed öğrencisiyle yalnızca açıp kapatır; veri yazmaz.
 */
test.describe("hızlı kayıt paneli kısa ekranda", () => {
  test.use({ viewport: { width: 390, height: 667 }, hasTouch: true, isMobile: true });

  test("Kaydet yapışık altbilgide görünür kalır", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await page.goto("/student/today");
    await page.getByRole("button", { name: "Soru kaydı ekle" }).filter({ visible: true }).click();
    const dialog = page.getByRole("dialog");
    const save = dialog.getByRole("button", { name: "Kaydet" });
    await expect(save).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole("button", { name: "Vazgeç" })).toBeHidden();

    // Alana odaklanıp yazınca da (gövde kayar) Kaydet yerinde kalır.
    const correct = dialog.getByLabel("Doğru", { exact: true });
    await correct.fill("120");
    await expect(dialog.getByText("Toplam 120")).toBeVisible();
    await expect(save).toBeInViewport({ ratio: 1 });

    // Klavye açık: yerleşim alanı küçülür; panel viewport içinde kalır, Kaydet görünür.
    await page.setViewportSize({ width: 390, height: 420 });
    await expect(save).toBeInViewport({ ratio: 1 });
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(420 + 1);
    const body = dialog.getByTestId("quick-log-body");
    await expect(body).toBeInViewport();
    const scrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(scrollable).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
