import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD } from "./accounts";

/** Giriş formunu doldurup gönderir; başarı bekleniyorsa /login'den ayrılmasını bekler. */
export async function login(
  page: Page,
  identifier: string,
  password = DEMO_PASSWORD,
  { expectSuccess = true } = {},
) {
  await page.goto("/login");
  await page.getByLabel("Kullanıcı adı veya e-posta").fill(identifier);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  if (expectSuccess) await expect(page).not.toHaveURL(/\/login$/);
}

/** Form hata satırı (Next.js route announcer da role=alert taşıdığı için p ile daraltılır). */
export function formAlert(page: Page) {
  return page.locator("p[role='alert']");
}

/**
 * Çıkış düğmesi kabuğa göre farklı yerde: koç yan menüsü / veli üst barı; öğrencide masaüstü
 * rayı, telefonda yalnızca "Ben" sayfası. Öğrencide her iki görünümde de bulunan Ben sayfasına gidilir.
 */
export async function logout(page: Page) {
  if (/\/student(\/|$)/.test(new URL(page.url()).pathname)) {
    await page.goto("/student/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Ben" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Çıkış yap" }).locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/login$/);
}
