import { expect, test } from "@playwright/test";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

test.describe("modül aç/kapat", () => {
  test("kapatılan modül öğrenci menüsünden kalkar ve adresi açılmaz; bağımlılar birlikte kapanır", async ({
    page,
  }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Modül", prefix: "mod" });
    try {
      await page.goto(`/coach/students/${student.studentId}/modules`);
      const examsSwitch = page.getByRole("switch", { name: "Denemeler modülü" });
      await expect(examsSwitch).toHaveAttribute("aria-checked", "true");
      await examsSwitch.click();
      await expect(page.getByText("Denemeler kapatıldı.")).toBeVisible();
      await expect(examsSwitch).toHaveAttribute("aria-checked", "false");

      // Sekme de kayboldu (registry filtreli)
      const tabs = page.getByRole("navigation", { name: "Öğrenci sekmeleri" });
      await expect(tabs.getByRole("link", { name: "Denemeler" })).toHaveCount(0);
      await expect(tabs.getByRole("link", { name: "Konular" })).toBeVisible();

      // Bağımlılık: Konular kapanınca Soru Takibi, Plan vb. birlikte kapanır
      await page.getByRole("switch", { name: "Konular modülü" }).click();
      await expect(page.getByText(/Konular kapatıldı; birlikte .*Soru Takibi/)).toBeVisible();
      await expect(page.getByRole("switch", { name: "Soru Takibi modülü" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
      // Çekirdek kilitli
      await expect(page.getByRole("switch", { name: "Çekirdek modülü" })).toBeDisabled();
      await logout(page);

      // Öğrenci: menüde Denemeler ve Konular yok, adresleri 404
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await expect(page).toHaveURL(/\/student\/today$/);
      const nav = page.getByRole("navigation", { name: "Ana menü" }).locator("visible=true");
      await expect(nav.getByRole("link", { name: "Bugün" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Denemeler" })).toHaveCount(0);
      await expect(nav.getByRole("link", { name: "Konular" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Soru kaydı ekle" })).toHaveCount(0);

      await page.goto("/student/exams");
      await expect(page.getByRole("heading", { level: 1, name: "Bu sayfa yok" })).toBeVisible();
      await page.goto("/student/topics");
      await expect(page.getByRole("heading", { level: 1, name: "Bu sayfa yok" })).toBeVisible();
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
