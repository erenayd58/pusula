import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;

/** İstanbul'a göre bugün: YYYY-AA-GG anahtarı ve haftanın günü (0 = pazar). */
function todayIstanbul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const key = `${get("year")}-${get("month")}-${get("day")}`;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { key, dow };
}

/**
 * Faz 4 Parça 1 kabulü (08 §2): öğrenci telefonda okul saatlerini girer, koç sekmesinde görür
 * ve düzenler; yazılı istisnası girilen günün müsait süresi 0 olur. Test kendi öğrencisini açar.
 */
test.describe("haftalık program", () => {
  test.setTimeout(150_000);

  test("öğrenci meşguliyet ve istisna ekler, koç görür ve düzenler", async ({ page }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Program", prefix: "sch" });
    const today = todayIstanbul();
    try {
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);

      // "Ben" sayfasından bağlantı (menüde yok, karar A11)
      await page.goto("/student/profile");
      await page.getByRole("link", { name: "Haftalık programım" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Haftalık programım" }),
      ).toBeVisible();
      const availability = page.getByRole("region", { name: "Bu hafta müsait süre" });
      const monday = availability.getByRole("listitem").filter({ hasText: "Pzt" });
      // Boş program: uyanık aralığın tamamı (08:00–22:00 = 14 sa)
      await expect(monday).toContainText("14 sa");

      // Meşguliyet: Pazartesi 08:30–15:00 okul
      await page.getByRole("button", { name: "Meşguliyet ekle" }).click();
      let dialog = page.getByRole("dialog");
      await dialog.getByLabel("Gün").selectOption({ label: "Pazartesi" });
      await dialog.getByLabel("Başlangıç").fill("08:30");
      await dialog.getByLabel("Bitiş").fill("15:00");
      await dialog.getByLabel("Tür").selectOption({ label: "Okul" });
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Meşguliyet eklendi.")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const slots = page.getByRole("region", { name: "Sabit meşguliyetler" });
      await expect(slots.getByText("08:30 – 15:00")).toBeVisible();
      await expect(slots.getByText("Okul", { exact: true })).toBeVisible();
      // 840 − 390 = 450 dk = 7 sa 30 dk (bugün pazartesiyse aşağıdaki istisna sonra sıfırlar)
      await expect(monday).toContainText("7 sa 30 dk");

      // Bitiş < başlangıç reddedilir (zod, form içinde)
      await page.getByRole("button", { name: "Meşguliyet ekle" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Başlangıç").fill("16:00");
      await dialog.getByLabel("Bitiş").fill("15:00");
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(dialog.getByText("Bitiş başlangıçtan sonra olmalı.")).toBeVisible();
      await dialog.getByRole("button", { name: "Vazgeç" }).click();

      // Tüm gün istisna: bugün → o günün müsait süresi 0
      await page.getByRole("button", { name: "İstisna ekle" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Başlık").fill("Yazılı: Fen");
      await dialog.getByLabel("Tarih").fill(today.key);
      await expect(dialog.getByRole("switch", { name: "Tüm gün" })).toBeChecked();
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("İstisna eklendi.")).toBeVisible();
      const exceptions = page.getByRole("region", { name: "Tek seferlik istisnalar" });
      await expect(exceptions.getByText("Yazılı: Fen")).toBeVisible();
      const todayCard = availability
        .getByRole("listitem")
        .filter({ hasText: DAY_SHORT[today.dow] ?? "Pzt" });
      await expect(todayCard).toContainText("Tüm gün meşgul");
      await expect(todayCard).toContainText("Yazılı: Fen");
      await logout(page);

      // Koç: Program sekmesinde görür, bitişi düzenler
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/schedule`);
      const coachSlots = page.getByRole("region", { name: "Sabit meşguliyetler" });
      await expect(coachSlots.getByText("08:30 – 15:00")).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Tek seferlik istisnalar" }).getByText("Yazılı: Fen"),
      ).toBeVisible();
      await coachSlots.getByRole("button", { name: "Düzenle: Pazartesi 08:30 – 15:00" }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Meşguliyeti düzenle" })).toBeVisible();
      await dialog.getByLabel("Bitiş").fill("15:30");
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Meşguliyet güncellendi.")).toBeVisible();
      await expect(coachSlots.getByText("08:30 – 15:30")).toBeVisible();
      if (today.dow !== 1) {
        // 840 − 420 = 420 dk = 7 sa
        await expect(
          page
            .getByRole("region", { name: "Bu hafta müsait süre" })
            .getByRole("listitem")
            .filter({ hasText: "Pzt" }),
        ).toContainText("7 sa");
      }

      // Koç istisnayı siler
      await page
        .getByRole("region", { name: "Tek seferlik istisnalar" })
        .getByRole("button", { name: /^Sil: Yazılı: Fen/ })
        .click();
      await page.getByRole("dialog").getByRole("button", { name: "Sil" }).click();
      await expect(page.getByText("İstisna silindi.")).toBeVisible();
      await expect(page.getByText("Yaklaşan istisna yok.")).toBeVisible();
    } finally {
      if (/\/coach\//.test(page.url())) await logout(page);
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
