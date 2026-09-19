import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login } from "./fixtures/auth";

const AYSE_ID = "b0000000-0000-4000-8000-000000000011";

/**
 * Faz 8 kabulü (12 §2 Adım 6; seed Ayşe, veli.ayse `can_view_details = true`): veli Özet'te kartlar
 * sırayla ve "siz" diliyle (plan uyumu, soru/süre, gidişat, son deneme, ders dağılımı, kaynak, video,
 * koçun notu); hafta seçici geçmiş haftaya gider (`?week=`); Notlar sekmesi yalnızca veliye açık
 * notları listeler; Yanlışlar sekmesi detay izniyle görünür ve açılır; bildirim listesi ve zil.
 * Salt okunur; uyarı/kırmızı yok, karşılaştırma yok.
 */
test.describe("veli paneli", () => {
  test("Özet kartları, hafta seçici, Notlar ve Yanlışlar sekmeleri, bildirimler", async ({
    page,
  }) => {
    await login(page, accounts.parent.identifier);
    await expect(page).toHaveURL(new RegExp(`/parent/${AYSE_ID}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ayşe'nin haftası");

    // Kartlar (seed): sıra registry'den.
    const summary = page.getByTestId("parent-summary");
    await expect(page.getByTestId("parent-week")).toContainText("Bu hafta");
    await expect(page.getByTestId("parent-plan")).toContainText("Ayşe bu hafta");
    await expect(page.getByTestId("parent-week-stats")).toContainText("soru çözdü");
    await expect(page.getByTestId("parent-pace")).toContainText("54 konunun 9'u bitti");
    await expect(page.getByTestId("parent-last-result")).toContainText("63,33");
    await expect(page.getByTestId("parent-subject-week")).toContainText(
      "Ders bazında haftalık soru",
    );
    await expect(page.getByTestId("parent-resources")).toContainText(
      "1 kitapta 20 testin 6'sı bitti",
    );
    await expect(page.getByTestId("parent-videos")).toContainText(
      "1 listede 6 videonun 2'si izlendi",
    );
    await expect(page.getByTestId("parent-last-note")).toContainText("Paragraf hızı iyi");
    await expect(summary).not.toContainText("gerisindesin");
    const order = await summary
      .locator("[data-testid^='parent-']")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    expect(order).toEqual([
      "parent-week",
      "parent-plan",
      "parent-week-stats",
      "parent-pace",
      "parent-last-result",
      "parent-subject-week",
      "parent-resources",
      "parent-videos",
      "parent-last-note",
    ]);

    // Geçmiş hafta: URL ?week=, etiket, Ayşe'nin geçen hafta yayınlanmış planı yok.
    await page.getByRole("link", { name: "Önceki hafta" }).click();
    await expect(page).toHaveURL(/\?week=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByTestId("parent-week")).toContainText("Geçmiş hafta");
    await expect(page.getByTestId("parent-plan")).toContainText("yayınlanmış plan yoktu");
    await page.getByRole("link", { name: "Sonraki hafta" }).click();
    await expect(page.getByTestId("parent-week")).toContainText("Bu hafta");

    // Notlar: veliye açık 1 not (student_and_parent); coach_only ve student notları yok.
    await page.getByTestId("parent-last-note").click();
    await expect(page).toHaveURL(new RegExp(`/parent/${AYSE_ID}/notes$`));
    const notes = page.getByTestId("note-item");
    await expect(notes).toHaveCount(1);
    await expect(notes).toContainText("Paragraf hızı iyi");
    await expect(notes).toContainText("Sabit");
    await expect(page.getByTestId("note-list")).not.toContainText("Veli görüşmesi");
    await expect(page.getByTestId("note-list")).not.toContainText("Üslü ifadelerde");

    // Yanlışlar: detay izni var → sekme görünür, sayfa açılır (3 seed kaydı).
    const nav = page.getByRole("navigation", { name: "Veli menüsü" });
    await expect(nav).toContainText("Yanlışlar");
    await nav.getByRole("link", { name: "Yanlışlar" }).click();
    await expect(page).toHaveURL(new RegExp(`/parent/${AYSE_ID}/mistakes$`));
    await expect(page.getByRole("heading", { name: "Ayşe'nin yanlış defteri" })).toBeVisible();
    await expect(page.getByTestId("mistake-card")).toHaveCount(3);

    // Bildirimler: seed haftalık özet + not + duyuru; zil sayısı listedeki okunmamışla aynı.
    const bell = page.getByTestId("notification-bell").filter({ visible: true }).first();
    const unread = Number(await bell.getAttribute("data-unread"));
    expect(unread).toBeGreaterThan(0);
    await bell.click();
    await expect(page).toHaveURL(/\/parent\/notifications$/);
    await expect(
      page.getByTestId("notification-item").filter({ hasText: "Ayşe'nin haftası" }),
    ).toContainText(
      "Ayşe bu hafta 244 soru çözdü ve 6 sa 35 dk çalıştı; planının %75'ini tamamladı",
    );
    await expect(page.locator("[data-testid='notification-item'][data-unread='true']")).toHaveCount(
      unread,
    );
    await expect(page.getByTestId("notification-prefs").getByRole("switch")).toHaveCount(3);
  });
});
