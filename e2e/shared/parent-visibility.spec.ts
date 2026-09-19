import { expect, test } from "@playwright/test";
import { accounts } from "../fixtures/accounts";
import { login, logout } from "../fixtures/auth";

const AYSE_ID = "b0000000-0000-4000-8000-000000000011";

/**
 * Faz 8 karar E8: koç K2 "Veliler" kartından yanlış defteri görünürlüğünü kapatınca velide
 * "Yanlışlar" sekmesi kaybolur ve rota 404 verir; açınca geri gelir. Seed bağlantısını (veli.ayse,
 * `can_view_details = true`) değiştirdiği için `shared-desktop` (seri); `finally` geri açar.
 */
test.describe("veli görünürlüğü (koç anahtarı)", () => {
  test.setTimeout(120_000);

  test("anahtar kapalıyken Yanlışlar sekmesi yok, açınca var", async ({ page }) => {
    await login(page, accounts.coach.identifier);
    await page.goto(`/coach/students/${AYSE_ID}`);
    const card = page.getByTestId("parent-visibility");
    const toggle = card.getByRole("switch", { name: /Fatma Kılıç/ });
    await expect(card).toContainText("Anne");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    try {
      await toggle.click();
      await expect(page.getByText("Yanlış defteri veliye kapatıldı.")).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await logout(page);

      await login(page, accounts.parent.identifier);
      await expect(page).toHaveURL(new RegExp(`/parent/${AYSE_ID}$`));
      await expect(page.getByRole("navigation", { name: "Veli menüsü" })).not.toContainText(
        "Yanlışlar",
      );
      await page.goto(`/parent/${AYSE_ID}/mistakes`);
      await expect(page.getByRole("heading", { level: 1, name: "Bu sayfa yok" })).toBeVisible();
      await page.goto(`/parent/${AYSE_ID}`);
      await logout(page);
    } finally {
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${AYSE_ID}`);
      const restore = page
        .getByTestId("parent-visibility")
        .getByRole("switch", { name: /Fatma Kılıç/ });
      if ((await restore.getAttribute("aria-checked")) === "false") {
        await restore.click();
        await expect(page.getByText("Veli yanlış defterini görebilir.")).toBeVisible();
      }
      await expect(restore).toHaveAttribute("aria-checked", "true");
    }
    await logout(page);
    await login(page, accounts.parent.identifier);
    await expect(page.getByRole("navigation", { name: "Veli menüsü" })).toContainText("Yanlışlar");
  });
});
