import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { formAlert, login, logout } from "./fixtures/auth";

test.describe("giriş", () => {
  test("koç e-postayla girer, /coach'a gider, çıkış yapar", async ({ page }) => {
    await login(page, accounts.coach.identifier);
    await expect(page).toHaveURL(/\/coach$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Murat Kaya");
    await logout(page);
  });

  test("öğrenci kullanıcı adıyla girer, /student'a gider", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByText("Öğrenci", { exact: true })).toBeVisible();
  });

  test("yanlış şifrede her durumda aynı genel hata", async ({ page }) => {
    await login(page, accounts.student.identifier, "yanlis-sifre", { expectSuccess: false });
    await expect(formAlert(page)).toHaveText("Kullanıcı adı veya şifre hatalı.");
    await expect(page).toHaveURL(/\/login$/);

    await login(page, "olmayan.kisi", "yanlis-sifre", { expectSuccess: false });
    await expect(formAlert(page)).toHaveText("Kullanıcı adı veya şifre hatalı.");
  });

  test("oturumsuz korumalı sayfa /login'e döner", async ({ page }) => {
    await page.goto("/coach/students");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("öğrenci /coach'a giremez, kendi ana sayfasına döner", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await expect(page).toHaveURL(/\/student$/);
    await page.goto("/coach");
    await expect(page).toHaveURL(/\/student$/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/student$/);
  });
});
