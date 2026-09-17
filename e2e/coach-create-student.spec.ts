import { expect, test } from "@playwright/test";
import { accounts, uniqueUsername } from "./fixtures/accounts";
import { formAlert, login, logout } from "./fixtures/auth";
import { studentRow } from "./fixtures/students";

test.describe("koç öğrenci oluşturur", () => {
  test("form → liste → öğrenci kullanıcı adıyla giriş yapar → /student/today", async ({ page }) => {
    const username = uniqueUsername();
    const password = "gecici-sifre-123";

    await login(page, accounts.coach.identifier);
    await page.goto("/coach/students/new");
    await page.getByLabel("Ad soyad").fill("E2E Öğrenci");
    await page.getByLabel("Kullanıcı adı").fill(username);
    await page.getByLabel("Geçici şifre").fill(password);
    await page.getByLabel("Sınav tarihi").fill("2027-06-13");
    await page.getByRole("button", { name: "Öğrenciyi oluştur" }).click();

    await expect(page).toHaveURL(/\/coach\/students$/);
    await expect(studentRow(page, username)).toBeVisible();
    await logout(page);

    await login(page, username, password);
    await expect(page).toHaveURL(/\/student\/today$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
  });

  test("Türkçe karakterli kullanıcı adı otomatik değiştirilmez, kural mesajı gösterilir", async ({
    page,
  }) => {
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/students/new");
    await page.getByLabel("Ad soyad").fill("Ayşe Şahin");
    await page.getByLabel("Kullanıcı adı").fill("ayşe.şahin");
    await page.getByLabel("Geçici şifre").fill("gecici-sifre-123");
    await page.getByLabel("Sınav tarihi").fill("2027-06-13");
    await page.getByRole("button", { name: "Öğrenciyi oluştur" }).click();

    await expect(page.getByLabel("Kullanıcı adı")).toHaveValue("ayşe.şahin");
    await expect(page.getByText("Türkçe karakter kullanılamaz").first()).toBeVisible();
    await expect(page).toHaveURL(/\/coach\/students\/new$/);
  });

  test("dolu kullanıcı adında alan hatası", async ({ page }) => {
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/students/new");
    await page.getByLabel("Ad soyad").fill("Tekrar Ayşe");
    await page.getByLabel("Kullanıcı adı").fill(accounts.student.identifier);
    await page.getByLabel("Geçici şifre").fill("gecici-sifre-123");
    await page.getByLabel("Sınav tarihi").fill("2027-06-13");
    await page.getByRole("button", { name: "Öğrenciyi oluştur" }).click();

    await expect(formAlert(page).first()).toContainText("Bu kullanıcı adı kullanılıyor.");
  });
});
