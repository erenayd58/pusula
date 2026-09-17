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

/** Kabuklarda çıkış düğmesi birden fazla yerde olabilir (ray + telefon üst barı); görünen olana basılır. */
export async function logout(page: Page) {
  await page.getByRole("button", { name: "Çıkış yap" }).locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/login$/);
}
