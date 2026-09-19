import { expect, test, type Page } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

/** Görünen zil (öğrencide telefonda üst bar, masaüstünde ray; ikisi de DOM'da). */
function bell(page: Page) {
  return page.getByTestId("notification-bell").filter({ visible: true }).first();
}

/**
 * Faz 8 kabulü (12 §2): koç plan yayınlar → öğrencinin zilinde 1 → liste → satır tıklanır (okundu,
 * plan sayfasına gider) → zil 0. Tercih: "Koç notu" kapalıyken koçun öğrenciye açık notu bildirim
 * üretmez, açınca üretir. Duyuru yalnızca seçilen öğrenciye. "Tümünü okundu işaretle". Testin
 * öğrencisi kendi hesabıdır (seed sayıları değişmez); duyuru "Seçtiklerim" ile yalnızca ona gider.
 */
test.describe("bildirimler", () => {
  test.setTimeout(180_000);

  test("plan yayını → zil; okundu; tercih; duyuru", async ({ page }, testInfo) => {
    // İki proje (masaüstü + mobil) aynı anda koşar; duyuru formundaki onay kutusu ada göre seçildiği
    // için ad projeye göre tekil.
    const student = await createStudentAsOwner(page, {
      fullName: `E2E Bildirim ${testInfo.project.name === "mobile-chromium" ? "Mobil" : "Masaüstü"}`,
      prefix: "ntf",
    });
    const projectViewport = testInfo.project.use.viewport ?? { width: 1280, height: 720 };
    try {
      // Koç: boş haftaya mesaj yazar (taslak açılır) ve yayınlar → öğrenciye plan_published.
      await logout(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await page.getByLabel("Haftalık mesaj (öğrenci görür)").fill("Hoş geldin, hafif başlıyoruz.");
      await page.getByRole("button", { name: "Mesajı kaydet" }).click();
      await expect(page.getByText("Haftalık mesaj kaydedildi.")).toBeVisible();
      await page.getByRole("button", { name: "İlk görevi ekle" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Tür").selectOption({ label: "Serbest" });
      await dialog.getByLabel("Başlık").fill("Kitap oku");
      await dialog.getByRole("button", { name: "Görevi ekle" }).click();
      await expect(page.getByText("Görev eklendi.").last()).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Planı yayınla" }).click();
      await expect(page.getByText("Plan yayınlandı.")).toBeVisible();
      await logout(page);

      // Öğrenci: zil 1 → liste → satır → plan sayfası; okundu.
      await page.setViewportSize(projectViewport);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/today");
      await expect(bell(page)).toHaveAttribute("data-unread", "1");
      await bell(page).click();
      await expect(page).toHaveURL(/\/student\/notifications$/);
      const item = page.getByTestId("notification-item");
      await expect(item).toHaveCount(1);
      await expect(item).toHaveAttribute("data-unread", "true");
      await expect(item).toContainText("Haftalık planın hazır");
      await expect(item).toContainText("1 görev · koçundan mesaj var");
      await item.getByRole("link").click();
      await expect(page).toHaveURL(/\/student\/plan\?week=\d{4}-\d{2}-\d{2}$/);
      await page.goto("/student/notifications");
      await expect(page.getByTestId("notification-item")).toHaveAttribute("data-unread", "false");
      await expect(bell(page)).toHaveAttribute("data-unread", "0");
      await expect(page.getByText("Hepsi okundu")).toBeVisible();

      // Tercih: "Koç notu" kapat.
      const prefs = page.getByTestId("notification-prefs");
      await prefs.getByRole("switch", { name: "Koç notu" }).click();
      await expect(prefs.getByRole("switch", { name: "Koç notu" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
      await logout(page);

      // Koç: öğrenciye açık not → tercih kapalı, bildirim yok; duyuru (yalnızca bu öğrenci) → 1.
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/notes?new=1`);
      await page.getByLabel("Yeni not").fill("Sessiz not: tercih kapalı.");
      await page.getByRole("radio", { name: "Öğrenci", exact: true }).click();
      await page.getByRole("button", { name: "Notu kaydet" }).click();
      await expect(page.getByText("Not kaydedildi.")).toBeVisible();
      await expect(page.getByTestId("note-item")).toHaveCount(1);
      await expect(page.getByTestId("note-item")).toContainText("Öğrenci");

      await page.goto("/coach/announcements");
      const title = `E2E duyuru ${student.username}`;
      await page.getByLabel("Başlık").fill(title);
      await page.getByLabel("Metin").fill("Yalnızca test öğrencisine.");
      await page.getByRole("radio", { name: "Seçtiklerim" }).click();
      await page.getByRole("checkbox", { name: student.fullName }).check();
      await page.getByRole("button", { name: "Duyuruyu gönder" }).click();
      await expect(page.getByText("Duyuru gönderildi.")).toBeVisible();
      const announcement = page.getByTestId("announcement-item").filter({ hasText: title });
      await expect(announcement).toContainText("öğrenciler · 1 öğrenci");
      await logout(page);

      // Öğrenci: yalnızca duyuru geldi; tercihi aç; tümünü okundu işaretle.
      await page.setViewportSize(projectViewport);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/notifications");
      await expect(bell(page)).toHaveAttribute("data-unread", "1");
      const items = page.getByTestId("notification-item");
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText(title);
      await expect(page.getByTestId("notification-list")).not.toContainText("Koçun not yazdı");
      await page
        .getByTestId("notification-prefs")
        .getByRole("switch", { name: "Koç notu" })
        .click();
      await expect(
        page.getByTestId("notification-prefs").getByRole("switch", { name: "Koç notu" }),
      ).toHaveAttribute("aria-checked", "true");
      await page.getByRole("button", { name: "Tümünü okundu işaretle" }).click();
      await expect(page.getByText("Hepsi okundu")).toBeVisible();
      await expect(bell(page)).toHaveAttribute("data-unread", "0");
      await logout(page);

      // Koç: tercih açıkken ikinci not → bildirim gelir; öğrenci Notlar sayfasında iki notu görür.
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/notes`);
      await page.getByLabel("Yeni not").fill("Bu hafta paragrafa ağırlık.");
      await page.getByRole("radio", { name: "Öğrenci", exact: true }).click();
      await page.getByRole("button", { name: "Notu kaydet" }).click();
      await expect(page.getByText("Not kaydedildi.")).toBeVisible();
      await logout(page);

      await page.setViewportSize(projectViewport);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/notifications");
      await expect(bell(page)).toHaveAttribute("data-unread", "1");
      await expect(page.getByTestId("notification-item").first()).toContainText("Koçun not yazdı");
      await page.getByTestId("notification-item").first().getByRole("link").click();
      await expect(page).toHaveURL(/\/student\/notes$/);
      await expect(page.getByTestId("note-item")).toHaveCount(2);
      await expect(page.getByTestId("note-list")).toContainText("Bu hafta paragrafa ağırlık.");
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
