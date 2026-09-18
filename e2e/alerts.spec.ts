import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login } from "./fixtures/auth";

/**
 * Faz 4 Parça 3 kabulü (08 §2): öğrenci Bugün'de en fazla bir nötr kart (iki projede). Koç
 * listesi + eşik değişimi testi kurum ayarını değiştirdiği için `shared/alert-thresholds.spec.ts`'te.
 */
test.describe("konu uyarıları", () => {
  test.setTimeout(120_000);

  test("öğrenci Bugün'de en fazla bir nötr konu kartı görür", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await page.goto("/student/today");
    const nudge = page.getByTestId("topic-nudge");
    await expect(nudge).toHaveCount(1);
    // Kart hangi türden olursa olsun nötr dil (eşik testi ayrı fazda koşar, burada değişmez).
    await expect(nudge).toContainText(
      /konusunu tekrar etme zamanı\.|konusuna bir göz atma zamanı\.|bir süredir bekliyor\.|Sırada .+ var\./,
    );
    await nudge.click();
    await expect(page).toHaveURL(/\/student\/topics$/);
  });
});
