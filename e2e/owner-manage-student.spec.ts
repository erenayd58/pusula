import { expect, test } from "@playwright/test";
import { accounts, uniqueUsername } from "./fixtures/accounts";
import { formAlert, login, logout } from "./fixtures/auth";

test.describe("owner öğrenci yönetir", () => {
  test("şifre sıfırlama → koç atama → silme", async ({ page }) => {
    const username = uniqueUsername("own");
    const firstPassword = "ilk-sifre-12345";
    const newPassword = "yeni-sifre-12345";

    await login(page, accounts.owner.identifier);
    await page.goto("/coach/students/new");
    await page.getByLabel("Ad soyad").fill("Owner Öğrencisi");
    await page.getByLabel("Kullanıcı adı").fill(username);
    await page.getByLabel("Geçici şifre").fill(firstPassword);
    await page.getByLabel("Sınav tarihi").fill("2027-06-13");
    await page.getByLabel("Koç").selectOption({ label: "Murat Kaya" });
    await page.getByRole("button", { name: "Öğrenciyi oluştur" }).click();
    await expect(page).toHaveURL(/\/coach\/students$/);

    const row = page.getByRole("row").filter({ hasText: username });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Murat Kaya");

    // Şifre sıfırla
    await row.getByRole("button", { name: "Şifre sıfırla" }).click();
    await page.getByRole("dialog").getByLabel("Yeni şifre").fill(newPassword);
    await page.getByRole("button", { name: "Şifreyi sıfırla" }).click();
    await expect(page.getByText("için şifre sıfırlandı")).toBeVisible();

    // Koç ata (kurumda tek koç var; diyalog çalışıyor ve RPC yaşıyor)
    await row.getByRole("button", { name: "Koç ata" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Koç", { exact: true })
      .selectOption({ label: "Murat Kaya" });
    await page.getByRole("button", { name: "Koçu ata" }).click();
    await expect(page.getByText("Koç atandı.")).toBeVisible();

    await logout(page);

    // Yeni şifreyle giriş
    await login(page, username, newPassword);
    await expect(page).toHaveURL(/\/student$/);
    await logout(page);

    // Sil
    await login(page, accounts.owner.identifier);
    await page.goto("/coach/students");
    await row.getByRole("button", { name: "Sil" }).click();
    await page.getByRole("button", { name: "Öğrenciyi sil" }).click();
    await expect(page.getByText("silindi.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: username })).toHaveCount(0);
    await logout(page);

    await login(page, username, newPassword, { expectSuccess: false });
    await expect(formAlert(page)).toHaveText("Kullanıcı adı veya şifre hatalı.");
  });

  test("koç listede silme ve koç atama göremez", async ({ page }) => {
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/students");
    await expect(page.getByRole("button", { name: "Şifre sıfırla" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Sil" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Koç ata" })).toHaveCount(0);
  });
});
