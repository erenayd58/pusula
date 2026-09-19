import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login } from "./fixtures/auth";

/** Üç rol girişte kendi kabuğunu görür: yüzey (data-surface) ve registry'den üretilen menü. */
test.describe("uygulama kabukları", () => {
  test("öğrenci: clay yüzey, alt/yan menü Bugün · Konular · Denemeler · Ben, hızlı kayıt düğmesi", async ({
    page,
  }, testInfo) => {
    await login(page, accounts.student.identifier);
    await expect(page).toHaveURL(/\/student\/today$/);
    await expect(page.locator("[data-surface='clay']")).toHaveCount(1);

    const nav = page.getByRole("navigation", { name: "Ana menü" }).locator("visible=true");
    for (const label of ["Bugün", "Konular", "Denemeler", "Ben"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Bugün" })).toHaveAttribute("aria-current", "page");
    // (+) hızlı kayıt sheet'ini açar (Faz 3); Esc kapatır.
    await page.getByRole("button", { name: "Soru kaydı ekle" }).filter({ visible: true }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Soru kaydı" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await nav.getByRole("link", { name: "Konular" }).click();
    await expect(page).toHaveURL(/\/student\/topics$/);
    // Faz 2: Konular gerçek sayfa (konu haritası); Faz 6a: Denemeler gerçek sayfa (seed: son deneme kartı).
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Konu haritası");
    await nav.getByRole("link", { name: "Denemeler" }).click();
    await expect(page).toHaveURL(/\/student\/exams$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Denemeler");
    await expect(page.getByTestId("last-result")).toBeVisible();

    // Ben: ad, kullanıcı adı ve çıkış. Telefonda üst barda çıkış yok; masaüstünde ray + Ben.
    await nav.getByRole("link", { name: "Ben" }).click();
    await expect(page).toHaveURL(/\/student\/profile$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ben");
    await expect(page.getByText("Ayşe Kılıç")).toBeVisible();
    await expect(page.getByText("ayse.k")).toBeVisible();
    const logoutButtons = page.getByRole("button", { name: "Çıkış yap" }).locator("visible=true");
    await expect(logoutButtons).toHaveCount(testInfo.project.name === "mobile-chromium" ? 1 : 2);
    await logoutButtons.last().click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("koç: flat yüzey, yan menü registry'den, öğrenci detayında sekmeler", async ({ page }) => {
    await login(page, accounts.coach.identifier);
    await expect(page).toHaveURL(/\/coach\/students$/);
    await expect(page.locator("[data-surface='flat']")).toHaveCount(1);

    // Telefonda menü hamburger arkasında; açıkken aynı öğeler görünür.
    const trigger = page.getByRole("button", { name: "Menüyü aç" });
    const mobile = await trigger.isVisible();
    if (mobile) {
      await trigger.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    const nav = page.getByRole("navigation", { name: "Ana menü" }).locator("visible=true");
    for (const label of ["Öğrenciler", "Planlar", "Şablonlar", "Denemeler", "Ayarlar"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Öğrenciler" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    if (mobile) {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    }

    await page.getByRole("link", { name: "Ayşe Kılıç" }).click();
    await expect(page).toHaveURL(/\/coach\/students\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayşe Kılıç");
    const tabs = page.getByRole("navigation", { name: "Öğrenci sekmeleri" });
    for (const label of ["Genel bakış", "Konular", "Sorular", "Plan", "Denemeler", "Modüller"]) {
      await expect(tabs.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(page.getByText("Veli onayı var")).toBeVisible();
  });

  test("veli: sakin clay yüzey, tek çocuk doğrudan açılır, alt menü Özet · Denemeler · Notlar", async ({
    page,
  }) => {
    await login(page, accounts.parent.identifier);
    await expect(page).toHaveURL(/\/parent\/[0-9a-f-]{36}$/);
    await expect(page.locator("[data-surface='clay-calm']")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ayşe");

    const nav = page.getByRole("navigation", { name: "Veli menüsü" });
    for (const label of ["Özet", "Denemeler", "Notlar"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await nav.getByRole("link", { name: "Notlar" }).click();
    await expect(page).toHaveURL(/\/parent\/[0-9a-f-]{36}\/notes$/);
    await expect(page.getByText("Notlar: bu bölüm yakında")).toBeVisible();

    // Başka bir velinin çocuğu RLS ile görünmez → 404
    await page.goto("/parent/b0000000-0000-4000-8000-000000000012");
    await expect(page.getByRole("heading", { level: 1, name: "Bu sayfa yok" })).toBeVisible();
  });
});
