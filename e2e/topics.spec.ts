import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

/**
 * Faz 2 kabul (01 yol haritası): öğrenci konu durumunu değiştirebiliyor. Test kendi öğrencisini
 * açar (seed öğrencileri değişmez). Şablona konu ekleme testi paylaşımlı şablonu değiştirdiği için
 * `shared/template-topics.spec.ts`'te.
 */
test.describe("konu haritası", () => {
  // Üç rol arasında geçiş + Turbopack ilk derlemesi: varsayılan 60 sn yetmiyor.
  test.setTimeout(150_000);

  test("öğrenci konuyu tamamlandı yapar, yüzde değişir, koç aynı durumu görür", async ({
    page,
  }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Konu", prefix: "topic" });
    try {
      await logout(page);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/topics");
      await expect(page.getByRole("heading", { level: 1, name: "Konu haritası" })).toBeVisible();

      const dinSection = page.getByRole("region", { name: "Din Kültürü ve Ahlak Bilgisi" });
      await expect(dinSection.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
      await expect(dinSection.getByText("%0")).toBeVisible();

      await dinSection.getByRole("button", { name: "Kader İnancı: Başlanmadı" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Kader İnancı" })).toBeVisible();
      // Radyo girdileri görsel olarak gizli (sr-only); etiketlere tıklanır.
      await dialog.getByText("Tamamlandı", { exact: true }).click();
      await dialog.getByText("4", { exact: true }).click();
      await expect(dialog.getByRole("radio", { name: "Tamamlandı" })).toBeChecked();
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Kaydedildi: Kader İnancı · Tamamlandı.")).toBeVisible();

      // 5 konudan 1'i → %20; hücrenin erişilebilir adı yeni durumu taşır
      await expect(dinSection.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
      await expect(dinSection.getByText("%20")).toBeVisible();
      await expect(
        dinSection.getByRole("button", { name: "Kader İnancı: Tamamlandı" }),
      ).toBeVisible();

      // Sayfa yenilenince veritabanından aynı durum gelir
      await page.reload();
      await expect(
        page
          .getByRole("region", { name: "Din Kültürü ve Ahlak Bilgisi" })
          .getByRole("button", { name: "Kader İnancı: Tamamlandı" }),
      ).toBeVisible();
      await logout(page);

      // Koç: sade haritada aynı durum ve yüzde
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/topics`);
      const coachDin = page.getByRole("region", { name: "Din Kültürü ve Ahlak Bilgisi" });
      await expect(coachDin.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
      await coachDin.getByRole("button", { name: "Kader İnancı: Tamamlandı" }).click();
      await expect(
        page.getByRole("dialog").getByRole("radio", { name: "Tamamlandı" }),
      ).toBeChecked();
      await expect(page.getByRole("dialog").getByRole("radio", { name: /^4:/ })).toBeChecked();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } finally {
      // Koç oturumu açık; silme owner ister.
      if (/\/coach\//.test(page.url())) await logout(page);
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
