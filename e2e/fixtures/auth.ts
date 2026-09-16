import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD } from "./accounts";

export async function login(page: Page, identifier: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Kullanıcı adı veya e-posta").fill(identifier);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

/** Form hata satırı (Next.js route announcer da role=alert taşıdığı için p ile daraltılır). */
export function formAlert(page: Page) {
  return page.locator("p[role='alert']");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Çıkış yap" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
}
