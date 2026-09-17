import { expect, test } from "@playwright/test";
import { createStudentAsOwner, deleteStudentAsOwner } from "./fixtures/students";

/** lib/format sayı–birim ve gün–ay arasına bölünmeyen boşluk koyar. */
const NBSP = "\u00a0";

test.describe("kâğıt onayı", () => {
  test("onaysız öğrencide rozet bekleniyor → koç kâğıt onayı kaydeder → rozet var", async ({
    page,
  }) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Onay", prefix: "onay" });
    try {
      await page.goto(`/coach/students/${student.studentId}`);
      await expect(page.getByText("Veli onayı bekleniyor")).toBeVisible();

      await page.getByRole("button", { name: "Kâğıt onayı kaydet" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Onay tarihi")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
      await dialog.getByLabel("Onay tarihi").fill("2026-09-10");
      await dialog.getByLabel("Belge sürümü").fill("aydinlatma-v1-kagit");
      await dialog.getByRole("button", { name: "Onayı kaydet" }).click();

      await expect(page.getByText("Kâğıt onayı kaydedildi.")).toBeVisible();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Veli onayı var")).toBeVisible();
      await expect(page.getByRole("button", { name: "Kâğıt onayı kaydet" })).toHaveCount(0);
      await expect(page.getByText("Veli onayı var")).toHaveAttribute(
        "title",
        new RegExp(`Kâğıt onayı · 10${NBSP}Eylül${NBSP}2026 · aydinlatma-v1-kagit`),
      );
    } finally {
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
