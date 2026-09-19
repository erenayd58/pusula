import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import { deleteE2EPlaylists, deleteE2ETemplates } from "./fixtures/db";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

/**
 * Faz 7 Parça 2 kabulü (11 §2 Parça 2). YouTube API çağrılmaz (CI'da anahtar yok; karar D17):
 * koç elle liste kurar, iki videoyu bağlantı + başlıkla ekler, birini "Çarpanlar ve Katlar"a eşler,
 * öğrenciye atar; öğrenci oynatıcıda `youtube-nocookie` iframe görür, "İzledim" → %50 → not; havuz
 * "Videolar" → plan → yayın → öğrenci "İzle" → oynatıcı → "İzledim" plan görevini de tamamlar; K1'de
 * eşli konu için öneri türü "Video"; koç K2 yüzdesi ve not; owner şablonu kataloglarla kopyalar.
 */
test.describe("videolar", () => {
  test.setTimeout(240_000);

  test("koç liste kurar ve atar; öğrenci izler; plan ve öneri bağı; şablon kopyası", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "koç editörü masaüstünde");
    const stamp = Date.now().toString(36);
    const listTitle = `E2E Liste Mat ${stamp}`;
    const student = await createStudentAsOwner(page, { fullName: "E2E Video", prefix: "vid" });
    try {
      await logout(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);

      // 1. Elle liste + iki video (bağlantı + başlık; anahtar yok).
      await page.goto("/coach/videos/new");
      await page.getByRole("radio", { name: "Elle liste kur" }).click();
      await page.getByLabel("Liste adı").fill(listTitle);
      await page.getByRole("radio", { name: "Mat", exact: true }).click();
      await page.getByRole("button", { name: "Listeyi kur" }).click();
      await expect(page.getByText(/Liste kuruldu\./)).toBeVisible();
      await expect(page).toHaveURL(/\/coach\/videos\/[0-9a-f-]{36}$/);
      for (const [url, title] of [
        ["https://youtu.be/dQw4w9WgXcQ", "E2E Video 1"],
        ["https://www.youtube.com/watch?v=aqz-KE-bpKQ", "E2E Video 2"],
      ] as const) {
        await page.getByRole("button", { name: "Video ekle" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("YouTube bağlantısı").fill(url);
        await dialog.getByLabel("Başlık", { exact: true }).fill(title);
        await dialog.getByRole("button", { name: "Ekle", exact: true }).click();
        await expect(page.getByText(`“${title}” eklendi.`)).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      await expect(page.getByTestId("video-row")).toHaveCount(2);

      // 2. Video 1 → Çarpanlar ve Katlar (çoklu seçim → Konuya eşle).
      await page.getByRole("checkbox", { name: "E2E Video 1 seç" }).click();
      await page.getByLabel("Konu", { exact: true }).selectOption({ label: "Çarpanlar ve Katlar" });
      await page.getByRole("button", { name: "Konuya eşle" }).click();
      await expect(page.getByText(/1\svideo “Çarpanlar ve Katlar” konusuna eşlendi/)).toBeVisible();
      await expect(page.getByTestId("video-row").first()).toContainText("Çarpanlar ve Katlar");

      // 3. Atama.
      await page.getByRole("button", { name: "Öğrenciye ata" }).click();
      let dialog = page.getByRole("dialog");
      await dialog.getByRole("checkbox", { name: student.fullName }).click();
      await dialog.getByRole("button", { name: /1\söğrenciye ata/ }).click();
      await expect(page.getByText("1 öğrenciye atandı.")).toBeVisible();

      // 4. K1 önerisi: Mat'ın başlanmamış ilk konusu (Çarpanlar ve Katlar) → "Video" görevi.
      await page.goto("/coach/students");
      const group = page
        .getByRole("region", { name: "Öneriler" })
        .getByTestId("suggestion-group")
        .filter({ hasText: student.fullName });
      const videoRow = group
        .getByTestId("suggestion-row")
        .filter({ hasText: "Çarpanlar ve Katlar" });
      await expect(videoRow).toContainText("Başlanmamış · Video");
      await expect(
        videoRow.getByRole("button", { name: "Plana ekle: Video: E2E Video 1" }),
      ).toBeVisible();

      // 5. Havuz "Videolar": Video 2'yi bu haftaya ekle, yayınla.
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await page.getByRole("button", { name: "Görev havuzunu aç" }).click();
      const pool = page.getByRole("complementary", { name: "Görev havuzu" });
      await expect(pool.getByRole("heading", { name: "Videolar" })).toBeVisible();
      await pool.getByRole("button", { name: "Güne ekle: Video: E2E Video 2" }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Tür")).toHaveValue("video");
      await dialog.getByRole("button", { name: "Görevi ekle" }).click();
      await expect(page.getByText("Görev eklendi.").last()).toBeVisible();
      await page.getByRole("button", { name: "Planı yayınla" }).click();
      await expect(page.getByText("Plan yayınlandı.")).toBeVisible();
      await logout(page);

      // 6. Öğrenci: liste %0 → oynatıcı (iframe nocookie) → İzledim → %50 → not.
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/videos");
      const card = page.getByTestId("playlist-card").filter({ hasText: listTitle });
      await expect(card.getByTestId("playlist-progress")).toContainText("%0 · 0 / 2 video");
      await card.getByRole("link").click();
      await expect(page).toHaveURL(/\/student\/videos\/[0-9a-f-]{36}$/);
      await expect(page.getByTestId("video-player").locator("iframe")).toHaveAttribute(
        "src",
        /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
      );
      await page.getByRole("button", { name: "İzledim", exact: true }).click();
      await expect(page.getByText("İzlendi olarak işaretlendi.")).toBeVisible();
      await expect(page.getByTestId("playlist-progress")).toContainText("%50 · 1 / 2 video");
      await expect(
        page.getByTestId("video-item").filter({ hasText: "E2E Video 1" }),
      ).toHaveAttribute("data-done", "true");
      await page.getByLabel("Not (isteğe bağlı)").fill("Asal çarpanlar kısmını tekrar izle");
      await page.getByRole("button", { name: "Notu kaydet" }).click();
      await expect(page.getByText("Not kaydedildi.")).toBeVisible();

      // 7. Plan görevi: "İzle" → oynatıcı ?v= → İzledim → plan görevi tamamlandı.
      await page.goto("/student/plan");
      await page.getByRole("button", { name: "Görev detayı: Video: E2E Video 2" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("link", { name: "İzle" }).click();
      await expect(page).toHaveURL(/\/student\/videos\/[0-9a-f-]{36}\?v=[0-9a-f-]{36}$/);
      await expect(page.getByTestId("video-player")).toContainText("E2E Video 2");
      await page.getByRole("button", { name: "İzledim", exact: true }).click();
      await expect(page.getByText(/plan görevin de tamamlandı/)).toBeVisible();
      await expect(page.getByTestId("playlist-progress")).toContainText("%100 · 2 / 2 video");
      await page.goto("/student/plan");
      await expect(
        page.getByRole("checkbox", { name: "Tamamlandı: Video: E2E Video 2" }),
      ).toBeVisible();
      await logout(page);

      // 8. Koç K2: yüzde ve not; owner şablonu kataloglarla kopyalar.
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/videos`);
      const table = page.getByTestId("video-progress-table");
      await expect(
        table.locator("li").filter({ hasText: listTitle }).getByTestId("playlist-progress").first(),
      ).toContainText("%100 · 2 / 2 video");
      await table.locator("li").filter({ hasText: listTitle }).locator("summary").click();
      await expect(table).toContainText("Not: Asal çarpanlar kısmını tekrar izle");
      await logout(page);

      await login(page, accounts.owner.identifier);
      await page.goto("/coach/templates");
      await page.getByRole("button", { name: "Şablonu kopyala" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Yeni şablon adı").fill(`E2E Şablon ${stamp}`);
      await dialog.getByLabel("Sezon").fill("2027-2028");
      await dialog.getByRole("button", { name: "Kopyala", exact: true }).click();
      await expect(page.getByText(/Şablon kopyalandı/)).toBeVisible();
      await expect(page).toHaveURL(/\/coach\/templates\?template=[0-9a-f-]{36}$/);
      await expect(page.getByTestId("template-select")).toHaveValue(/[0-9a-f-]{36}/);
      await expect(page.getByText(`E2E Şablon ${stamp} · konu ekle`)).toBeVisible();
      // Kopya katalog: liste bağlantısız kopya ("Elle") olarak katalogda.
      await page.goto("/coach/videos");
      await expect(page.getByTestId("playlist-row").filter({ hasText: listTitle })).toHaveCount(2);
    } finally {
      await deleteStudentAsOwner(page, student.username);
      await deleteE2ETemplates();
      await deleteE2EPlaylists();
    }
  });
});
