import { expect, test } from "@playwright/test";
import { accounts, uniqueUsername } from "./fixtures/accounts";
import { formAlert, login, logout } from "./fixtures/auth";
import { studentRow } from "./fixtures/students";
import { findConfirmationLink } from "./fixtures/mailpit";

test.describe("veli daveti", () => {
  test("koç kod üretir → veli kayıt olur → e-posta doğrular → daveti kabul eder → onay → çocuğun özeti", async ({
    page,
    baseURL,
  }) => {
    const slug = uniqueUsername("veli");
    const parentEmail = `${slug}@test.pusula.local`;
    const parentPassword = "veli-sifre-12345";

    // Koç: yeni bir öğrenci açar (seed öğrencisinin onay durumu değişmesin) ve davet kodu üretir
    const studentUsername = uniqueUsername("vlk");
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/students/new");
    await page.getByLabel("Ad soyad").fill("Davet Öğrencisi");
    await page.getByLabel("Kullanıcı adı").fill(studentUsername);
    await page.getByLabel("Geçici şifre").fill("gecici-sifre-123");
    await page.getByLabel("Sınav tarihi").fill("2027-06-13");
    await page.getByRole("button", { name: "Öğrenciyi oluştur" }).click();
    await expect(page).toHaveURL(/\/coach\/students$/);
    const row = studentRow(page, studentUsername);
    await row.getByRole("button", { name: "Veli daveti" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Davet kodu üret" }).click();
    const code = (await dialog.locator("code").textContent())?.trim();
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await logout(page);

    // Veli: davet linkiyle kayıt
    await page.goto(`/invite/${code}`);
    await page.getByLabel("Adınız soyadınız").fill("E2E Veli");
    await page.getByLabel("E-posta").fill(parentEmail);
    await page.getByLabel("Şifre").fill(parentPassword);
    await page.getByLabel("Yakınlığınız").selectOption("father");
    await page.getByRole("button", { name: "Kayıt ol" }).click();
    await expect(page).toHaveURL(/\/invite\/check-email$/);

    // Doğrulanmamış e-postayla giriş denemesi aynı genel hatayı verir
    await login(page, parentEmail, parentPassword, { expectSuccess: false });
    await expect(formAlert(page)).toHaveText("Kullanıcı adı veya şifre hatalı.");

    // Mailpit'ten doğrulama bağlantısı → /auth/confirm → /invite/accept
    const link = await findConfirmationLink(parentEmail, baseURL!);
    await page.goto(link);
    await expect(page).toHaveURL(/\/invite\/accept$/);
    await expect(page.getByLabel("Davet kodu")).toHaveValue(code!);
    await expect(page.getByLabel("Adınız soyadınız")).toHaveValue("E2E Veli");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Daveti kabul et" }).click();

    // KVKK onayı zorunlu: /parent onaysız açılmaz
    await expect(page).toHaveURL(/\/consent$/);
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/consent$/);
    await expect(page.getByText("TASLAK — hukuki inceleme gerekli")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Onaylıyorum" }).click();
    // Tek çocuk: doğrudan çocuğun özetine yönlenir
    await expect(page).toHaveURL(/\/parent\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Davet'in bu haftası");

    // Aynı kod ikinci kez kullanılamaz
    await logout(page);
    await login(page, parentEmail, parentPassword);
    await expect(page).toHaveURL(/\/parent\/[0-9a-f-]{36}$/);
    await page.goto(`/invite/${code}`);
    await expect(page).toHaveURL(/\/invite\/accept\?code=/);
    // Hidrasyon bitmeden tıklanırsa form yerel submit ile sayfayı yeniler (yük altında flaky).
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Daveti kabul et" }).click();
    await expect(formAlert(page)).toHaveText("Davet kodu geçersiz veya süresi dolmuş.");
  });

  test("geçersiz kodla kayıt aynı genel mesajı verir, hesap açılmaz", async ({ page }) => {
    await page.goto("/invite/ZZZZZZZZ");
    await page.getByLabel("Adınız soyadınız").fill("Sahte Veli");
    await page.getByLabel("E-posta").fill(`${uniqueUsername("sahte")}@test.pusula.local`);
    await page.getByLabel("Şifre").fill("sahte-sifre-12345");
    await page.getByRole("button", { name: "Kayıt ol" }).click();
    await expect(formAlert(page)).toHaveText("Davet kodu geçersiz veya süresi dolmuş.");
    await expect(page).toHaveURL(/\/invite\/ZZZZZZZZ$/);
  });

  test("öğrenci daveti kabul edemez", async ({ page }) => {
    await login(page, accounts.student.identifier);
    await page.goto("/invite/accept");
    await expect(page).toHaveURL(/\/student\/today$/);
  });
});
