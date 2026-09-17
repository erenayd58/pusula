import { expect, type Page } from "@playwright/test";
import { accounts, uniqueUsername } from "./accounts";
import { login, logout } from "./auth";

export const E2E_STUDENT_PASSWORD = "gecici-sifre-123";

/**
 * Öğrenci listesinde satır: ≥ md tablo satırı, telefonda kart; ikisi de DOM'da olduğu için
 * (biri CSS ile gizli) yalnızca görünen alınır. İki proje (masaüstü + mobil) aynı seçiciyi kullanır.
 */
export function studentRow(page: Page, username: string) {
  return page.getByTestId("student-row").filter({ hasText: username }).filter({ visible: true });
}

/**
 * Owner arayüzden yeni öğrenci oluşturur (koç: Murat Kaya) ve listedeki satırdan kimliğini okur.
 * Testler seed öğrencilerini değiştirmemek için kendi öğrencisini açar; `deleteStudentAsOwner`
 * ile temizler. Çağıran oturumsuz sayfa bekler; çıkışta owner oturumu açıktır.
 */
export async function createStudentAsOwner(
  page: Page,
  { fullName = "E2E Kabuk", prefix = "shell" }: { fullName?: string; prefix?: string } = {},
): Promise<{ username: string; studentId: string; fullName: string }> {
  const username = uniqueUsername(prefix);
  await login(page, accounts.owner.identifier);
  await page.goto("/coach/students/new");
  await page.getByLabel("Ad soyad").fill(fullName);
  await page.getByLabel("Kullanıcı adı").fill(username);
  await page.getByLabel("Geçici şifre").fill(E2E_STUDENT_PASSWORD);
  await page.getByLabel("Sınav tarihi").fill("2027-06-13");
  await page.getByLabel("Koç").selectOption({ label: "Murat Kaya" });
  await page.getByRole("button", { name: "Öğrenciyi oluştur" }).click();
  await expect(page).toHaveURL(/\/coach\/students$/);

  const row = studentRow(page, username);
  const href = await row.getByRole("link", { name: fullName }).getAttribute("href");
  const studentId = href?.split("/").pop();
  expect(studentId).toMatch(/^[0-9a-f-]{36}$/);
  return { username, studentId: studentId!, fullName };
}

/** Owner olarak (gerekirse yeniden giriş yaparak) öğrenciyi siler; temizlik için. */
export async function deleteStudentAsOwner(page: Page, username: string) {
  // Oturum koç ya da öğrenci olabilir (Sil yalnızca owner'da): hangi sayfada olursak olalım
  // önce rolün ana sayfasına git (404 gibi kabuksuz sayfada çıkış düğmesi yok), çıkış, owner girişi.
  await page.goto("/");
  // Yönlendirme zinciri bitmeden (/ → /student → /student/today) yeni gezinme başlatma (ERR_ABORTED).
  await page.waitForURL(/\/(login|coach\/students|student\/today|parent)(\/|$)/);
  if (!/\/login$/.test(page.url())) {
    if (!(await page.getByText(accounts.owner.name).first().isVisible().catch(() => false))) {
      await logout(page);
      await login(page, accounts.owner.identifier);
    }
  } else {
    await login(page, accounts.owner.identifier);
  }
  await page.goto("/coach/students");
  const row = studentRow(page, username);
  await row.getByRole("button", { name: "Sil" }).click();
  await page.getByRole("button", { name: "Öğrenciyi sil" }).click();
  await expect(page.getByText("silindi.")).toBeVisible();
}
