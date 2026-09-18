import { expect, test } from "@playwright/test";
import { accounts } from "../fixtures/accounts";
import { login, logout } from "../fixtures/auth";
import { deleteE2ETopics } from "../fixtures/db";

/**
 * Faz 2 kabul (01 yol haritası): koç şablona konu ekleyince tüm öğrencilerde görünür; sonunda
 * silinir. Sistem şablonu paylaşımlı olduğu için (konu sayısını sayan takvim ve hedef testleri
 * etkilenmesin) `shared-desktop` projesi (seri, diğer projelerden önce). Öğrencinin kendi konu
 * durumu testi `topics.spec.ts`'te (iki projede) kalır.
 */
test.describe("şablon konuları", () => {
  test.setTimeout(150_000);

  /** Şablona eklenen konu; test yarıda kalsa da afterEach veritabanından siler. */
  let addedTopic: string | undefined;
  test.afterEach(async () => {
    if (addedTopic) await deleteE2ETopics(addedTopic);
    addedTopic = undefined;
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
    // Dersin sonuna eklenir ("Natural Forces"tan sonra).
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
