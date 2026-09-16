import { expect, test } from "@playwright/test";

test("ana sayfa açılır ve Türkçe dil etiketi taşır", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByRole("heading", { level: 1, name: "Pusula" })).toBeVisible();
});

test("olmayan sayfa Türkçe 404 ekranı gösterir", async ({ page }) => {
  const response = await page.goto("/boyle-bir-sayfa-yok");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Bu sayfa yok" })).toBeVisible();
});
