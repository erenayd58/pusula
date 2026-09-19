import { expect, test, type Page } from "@playwright/test";
import { accounts } from "../fixtures/accounts";
import { login, logout } from "../fixtures/auth";
import { clearSchoolDates } from "../fixtures/db";

/**
 * Faz 5 Parça 1 kabulü (09 §2): koç takvim görünümünde 6 derste "Sıradan dağıt" + bir satırı elle
 * değiştirir → 54 konunun tarihi dolu (yeniden açılınca kalır) → tarihi geçmiş ve başlanmamış
 * konu seed öğrencisinin (Ayşe) haritasında işaretli, hücre detayında "Okulda … hafta önce" →
 * K1 "Dikkat gerektirenler"de "Okulun gerisinde"; owner ayarlarda "Varsayılanları öner" → 3 satır
 * → kaydeder → yeniden açılınca kalır. Takvim şablon düzeyinde paylaşımlı olduğu için sonunda
 * temizlenir. Kurum geneli veri: `shared-desktop` projesi (seri, diğer projelerden önce; bkz.
 * playwright.config.ts).
 */
const SUBJECTS = [
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "T.C. İnkılap Tarihi ve Atatürkçülük",
  "Din Kültürü ve Ahlak Bilgisi",
  "İngilizce",
] as const;
const UNIT_TOPIC_COUNT = 54;
/** Ayşe'nin (seed) başlamadığı Türkçe konusu; okul 4 hafta önce bitirmiş sayılır. */
const BEHIND_TOPIC = "Cümle Türleri";

/** Bugünden `days` gün önce (UTC takvim günü; hafta çözünürlüğünde yeterli). */
function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function rowDateValues(page: Page): Promise<string[]> {
  return page
    .locator("ol > li input[type='date']")
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
}

test.describe("müfredat takvimi ve sezon dönemleri", () => {
  test.setTimeout(180_000);

  test("koç takvimi doldurur, öğrenci haritasında okul işareti, K1'de okulun gerisinde", async ({
    page,
  }) => {
    await login(page, accounts.coach.identifier);
    try {
      await page.goto("/coach/templates");
      await page
        .getByRole("navigation", { name: "Şablon görünümü" })
        .getByRole("link", { name: "Takvim" })
        .click();
      await expect(page).toHaveURL(/\/coach\/templates\?view=calendar$/);

      // Varsayılan aralık seed'deki 1. dönem; 6 derste "Sıradan dağıt".
      for (const name of SUBJECTS) {
        const region = page.getByRole("region", { name });
        await expect(region.getByLabel("Başlangıç")).toHaveValue("2026-09-14");
        await region.getByRole("button", { name: "Sıradan dağıt" }).click();
        await expect(page.getByText(/takvime dağıtıldı\./).filter({ hasText: name })).toBeVisible();
      }
      // Bir satır elle: Ayşe'nin başlamadığı konu 4 hafta önce bitmiş.
      const turkish = page.getByRole("region", { name: "Türkçe" });
      await turkish.getByLabel(BEHIND_TOPIC, { exact: true }).fill(daysAgo(28));
      await expect(turkish.getByLabel(BEHIND_TOPIC, { exact: true })).toHaveValue(daysAgo(28));
      // Satır kaydı sunucu eylemidir; onay gelmeden sayfadan ayrılmak isteği iptal eder
      // ("destination stream closed early") ve yeniden açılınca dağıtılan tarih görünür (CI'da flaky).
      await expect(page.getByText(`${BEHIND_TOPIC}: tarih kaydedildi.`)).toBeVisible();

      // Yeniden açılınca 54 tarih dolu; elle girilen satır kalır.
      await page.goto("/coach/templates?view=calendar");
      await expect(page.getByRole("region", { name: "İngilizce" })).toBeVisible();
      const values = await rowDateValues(page);
      expect(values).toHaveLength(UNIT_TOPIC_COUNT);
      expect(values.filter(Boolean)).toHaveLength(UNIT_TOPIC_COUNT);
      await expect(
        page.getByRole("region", { name: "Türkçe" }).getByLabel(BEHIND_TOPIC, { exact: true }),
      ).toHaveValue(daysAgo(28));
      await expect(page.getByRole("region", { name: "Türkçe" })).toContainText("13 / 13");

      // K1: Ayşe için "Okulun gerisinde".
      await page.goto("/coach/students");
      const attention = page.getByRole("region", { name: "Dikkat gerektirenler" });
      const row = attention
        .getByTestId("attention-row")
        .filter({ hasText: "Ayşe Kılıç" })
        .filter({ hasText: BEHIND_TOPIC });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("Okulun gerisinde");
      await expect(row).toContainText(/Okul bu konuyu \d+\shafta önce bitirdi/);

      // K2 Konular: "Okulun gerisinde" listesi ve haritada işaret.
      await row.getByRole("link", { name: "Öğrenciyi aç" }).click();
      await expect(page).toHaveURL(/\/coach\/students\/[^/]+\/topics$/);
      await expect(page.getByRole("region", { name: "Okulun gerisinde" })).toContainText(
        BEHIND_TOPIC,
      );
      await expect(
        page
          .getByRole("region", { name: "Türkçe" })
          .getByRole("button", { name: `${BEHIND_TOPIC}: Başlanmadı, okulda işlendi` }),
      ).toBeVisible();

      // Öğrenci haritası: işaret + hücre detayında okul satırı.
      await logout(page);
      await login(page, accounts.student.identifier);
      await page.goto("/student/topics");
      const cell = page
        .getByRole("region", { name: "Türkçe" })
        .getByRole("button", { name: `${BEHIND_TOPIC}: Başlanmadı, okulda işlendi` });
      await expect(cell).toBeVisible();
      await cell.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByTestId("topic-school")).toContainText(
        /^Okulda: .+ haftası · \d+\shafta önce$/,
      );
      // Okul henüz gelmediği konuda satır farklı; bitmiş konuda işaret yok.
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page
          .getByRole("region", { name: "Türkçe" })
          .getByRole("button", { name: /^Sözcükte Anlam: Oturdu$/ }),
      ).toBeVisible();
    } finally {
      await clearSchoolDates();
    }
  });

  test("owner sezon dönemlerini önerir ve kaydeder; koç salt okunur", async ({ page }) => {
    await login(page, accounts.owner.identifier);
    await page.goto("/coach/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel(/^\d\. dönem adı$/)).toHaveCount(3);

    // Satırları sil → nötr not → "Varsayılanları öner" → 3 satır (LGS 2027).
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "1. dönemi sil" }).click();
    }
    await expect(page.getByText("Sezon dönemleri tanımlı değil")).toBeVisible();
    await page.getByRole("button", { name: "Varsayılanları öner" }).click();
    await expect(page.getByLabel("1. dönem adı")).toHaveValue("Yeni konu öğrenme");
    await expect(page.getByLabel("1. dönem başlangıcı")).toHaveValue("2026-09-14");
    await expect(page.getByLabel("2. dönem adı")).toHaveValue("İkinci tur ve pekiştirme");
    await expect(page.getByLabel("3. dönem bitişi")).toHaveValue("2027-06-13");
    await expect(page.getByLabel("3. dönem yeni konu yüzdesi")).toHaveValue("0");

    // Çakışma form hatası: 2. dönem 1. dönemin bitişinden önce başlasın.
    await page.getByLabel("2. dönem başlangıcı").fill("2027-03-01");
    await page.getByRole("button", { name: "Ayarları kaydet" }).click();
    await expect(page.getByText("“Yeni konu öğrenme” dönemiyle çakışıyor.")).toBeVisible();
    await page.getByLabel("2. dönem başlangıcı").fill("2027-03-21");
    await page.getByRole("button", { name: "Ayarları kaydet" }).click();
    await expect(page.getByText("Ayarlar kaydedildi.")).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("3. dönem adı")).toHaveValue("Deneme ve eksik kapatma");
    await expect(page.getByLabel("Okul toleransı (hafta)")).toHaveValue("2");

    await logout(page);
    await login(page, accounts.coach.identifier);
    await page.goto("/coach/settings");
    await expect(page.getByLabel("1. dönem adı")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Varsayılanları öner" })).toHaveCount(0);
  });
});
