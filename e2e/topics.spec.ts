import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import { deleteE2ETopics } from "./fixtures/db";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

/**
 * Faz 2 kabul (01 yol haritası): öğrenci konu durumunu değiştirebiliyor; koç şablona konu
 * ekleyince tüm öğrencilerde görünüyor. Testler kendi öğrencisini açar (seed öğrencileri
 * değişmez); şablona eklenen konu sonunda silinir (sistem şablonu paylaşımlı).
 */
test.describe("konu haritası", () => {
  // Üç rol arasında geçiş + Turbopack ilk derlemesi: varsayılan 60 sn yetmiyor.
  test.setTimeout(150_000);

  /** Şablona eklenen konu; test yarıda kalsa da afterEach veritabanından siler. */
  let addedTopic: string | undefined;
  test.afterEach(async () => {
    if (addedTopic) await deleteE2ETopics(addedTopic);
    addedTopic = undefined;
  });

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

  test("koç şablona konu ekler, öğrenci haritasında görünür; sonra siler", async ({ page }) => {
    const topicName = `E2E Konu ${Date.now().toString(36)}`;
    addedTopic = topicName;
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/templates");
    const ingSection = page.getByRole("region", { name: "İngilizce" });
    await ingSection.getByLabel("Yeni konu").fill(topicName);
    await ingSection.getByRole("button", { name: "Konu ekle" }).click();
    await expect(page.getByText(`Konu eklendi: ${topicName}.`)).toBeVisible();
    // Dersin sonuna eklenir (paralel testler de ekleyebilir; "Natural Forces"tan sonra olması yeter)
    const row = ingSection.getByRole("listitem").filter({ hasText: topicName });
    await expect(row).toBeVisible();
    const names = await ingSection.getByRole("listitem").allInnerTexts();
    expect(names.findIndex((t) => t.includes(topicName))).toBeGreaterThan(
      names.findIndex((t) => t.includes("Natural Forces")),
    );

    try {
      await logout(page);
      await login(page, accounts.student.identifier);
      await page.goto("/student/topics");
      await expect(
        page
          .getByRole("region", { name: "İngilizce" })
          .getByRole("button", { name: `${topicName}: Başlanmadı` }),
      ).toBeVisible();
      await logout(page);
    } finally {
      if (!/\/coach\//.test(page.url())) {
        if (!/\/login$/.test(page.url())) await logout(page);
        await login(page, accounts.coach.identifier);
      }
      await page.goto("/coach/templates");
      await page
        .getByRole("region", { name: "İngilizce" })
        .getByRole("button", { name: `${topicName}: sil` })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByText("Hiçbir öğrencinin bu konuda ilerleme kaydı yok."),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Konuyu sil" }).click();
      await expect(page.getByText(`Konu silindi: ${topicName}.`)).toBeVisible();
    }
  });
});
