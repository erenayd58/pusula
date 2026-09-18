import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import { createStudentAsOwner, deleteStudentAsOwner } from "./fixtures/students";

/**
 * Faz 4 Parça 4 kabulü (08 §2): öneriler K1'de öğrenciye göre gruplu görünür; "Plana ekle" bu
 * haftanın taslağına ön dolu görev ekler (öneri listeden düşer: bu hafta planlı konu önerilmez);
 * "Şimdi değil" öneriyi gizler; "Önerilen planı hazırla" boş haftada taslak üretir. Yeni
 * öğrencinin hiç kaydı olmadığı için her derste "Başlanmamış" (sıradaki konu) önerisi vardır.
 * Koç ekranları masaüstü görünümde çalışır.
 */
test.describe("öneri motoru", () => {
  test.setTimeout(180_000);

  test("K1 önerileri: Plana ekle taslağa yazar, Şimdi değil gizler", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "masaüstü koç ekranı");
    const student = await createStudentAsOwner(page, { fullName: "E2E Öneri", prefix: "sug" });
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/coach/students");
      const region = page.getByRole("region", { name: "Öneriler" });
      const group = region.getByTestId("suggestion-group").filter({ hasText: student.fullName });
      await expect(group).toHaveCount(1);
      const rows = group.getByTestId("suggestion-row");
      expect(await rows.count()).toBeGreaterThanOrEqual(2);
      await expect(rows.first()).toContainText("Başlanmamış");
      await expect(rows.first()).toContainText("Konu çalışması");

      // Plana ekle: gün seçmeden ("bu hafta içinde") → taslağa yazılır, öneri listeden düşer.
      const firstTitle = await rows
        .first()
        .getByRole("button", { name: /^Plana ekle: / })
        .getAttribute("aria-label");
      const title = firstTitle!.replace("Plana ekle: ", "");
      await rows.first().getByRole("button", { name: "Plana ekle" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Plana ekle" })).toBeVisible();
      await expect(dialog.getByText(title)).toBeVisible();
      await expect(
        dialog.getByRole("group", { name: "Gün" }).getByRole("button", { name: "Bu hafta içinde" }),
      ).toHaveAttribute("aria-pressed", "true");
      await dialog.getByRole("button", { name: "Görevi ekle" }).click();
      await expect(page.getByText("Görev plana eklendi.")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      // Öğrenci başına en fazla 5 öneri: eklenenin yerine sıradaki gelebilir, sayı değil satır izlenir.
      await expect(group.getByRole("button", { name: `Plana ekle: ${title}` })).toHaveCount(0);

      // Şimdi değil: öneri gizlenir.
      const dismissTitle = (await rows
        .first()
        .getByRole("button", { name: /^Şimdi değil: / })
        .getAttribute("aria-label"))!.replace("Şimdi değil: ", "");
      await rows
        .first()
        .getByRole("button", { name: /^Şimdi değil: / })
        .click();
      await expect(page.getByText(/Öneri 14 gün gizlendi\./)).toBeVisible();
      await expect(group.getByRole("button", { name: `Şimdi değil: ${dismissTitle}` })).toHaveCount(
        0,
      );

      // Koç plan ekranında görev taslakta, "bu hafta içinde" sütununda.
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await expect(page.getByText("Taslak", { exact: true }).first()).toBeVisible();
      const anytime = page.getByTestId("day-any");
      await expect(anytime.getByTestId("plan-item")).toHaveCount(1);
      await expect(anytime.getByText(title)).toBeVisible();
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });

  test("boş haftada Önerilen planı hazırla taslak üretir", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "masaüstü koç ekranı");
    const student = await createStudentAsOwner(page, { fullName: "E2E Hazırla", prefix: "prep" });
    try {
      await logout(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await expect(page.getByRole("heading", { name: "Bu hafta için plan yok" })).toBeVisible();
      await page.getByRole("button", { name: "Görev havuzunu aç" }).click();
      const pool = page.getByRole("complementary", { name: "Görev havuzu" });
      await expect(pool.getByRole("heading", { name: /^Öneriler/ })).toBeVisible();

      await page.getByRole("button", { name: "Önerilen planı hazırla" }).click();
      await expect(page.getByText(/görev eklendi/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Bu hafta için plan yok" })).toHaveCount(0);
      await expect(page.getByText("Taslak", { exact: true }).first()).toBeVisible();
      const items = page.getByTestId("plan-item");
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(5);
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
