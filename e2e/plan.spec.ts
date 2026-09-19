import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, logout } from "./fixtures/auth";
import {
  E2E_STUDENT_PASSWORD,
  createStudentAsOwner,
  deleteStudentAsOwner,
} from "./fixtures/students";

const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;
const DAY_FULL = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

/** İstanbul'a göre bugünün ISO günü (1 = pazartesi). */
function todayIsoDay() {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(new Date());
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  return idx === 0 ? 7 : idx;
}

/**
 * Faz 4 Parça 2 kabulü (08 §2): koç boş haftada EmptyState görür, görev ekler (bugüne, iki tür),
 * yayınlar; öğrenci Bugün kartında görür, soru görevini hızlı kayıtla tamamlar
 * (question_logs.plan_item_id), diğerini erteler; koç ekranında tamamlandı/ertelendi ve uyum %;
 * kopyalama onayı mevcut/eklenecek sayılarını gösterir. Koç bölümü masaüstü görünümde çalışır.
 */
test.describe("haftalık plan", () => {
  test.setTimeout(180_000);

  test("koç plan hazırlar ve yayınlar; öğrenci tamamlar ve erteler; koç sonucu görür", async ({
    page,
  }, testInfo) => {
    const student = await createStudentAsOwner(page, { fullName: "E2E Plan", prefix: "plan" });
    const projectViewport = testInfo.project.use.viewport ?? { width: 1280, height: 720 };
    const today = todayIsoDay();
    const todayChip = DAY_SHORT[today % 7]!;
    try {
      await logout(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/plan`);

      // Boş hafta: EmptyState + üç eylem; havuz görünür
      await expect(page.getByRole("heading", { name: "Bu hafta için plan yok" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Geçen haftayı kopyala" }).first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Önerilen planı hazırla" })).toBeEnabled();
      // Havuz ilk açılışta kapalı; koç açar, tercih cihazda kalır.
      await expect(page.getByRole("complementary", { name: "Görev havuzu" })).toHaveCount(0);
      await page.getByRole("button", { name: "Görev havuzunu aç" }).click();
      await expect(page.getByRole("complementary", { name: "Görev havuzu" })).toBeVisible();

      // Koç mesajı boş haftada da yazılır; kaydedilince taslak plan açılır.
      await page.getByLabel("Haftalık mesaj (öğrenci görür)").fill("Bu hafta hafif başlıyoruz.");
      await page.getByRole("button", { name: "Mesajı kaydet" }).click();
      await expect(page.getByText("Haftalık mesaj kaydedildi.")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Bu hafta henüz görev yok" })).toBeVisible();
      await expect(page.getByText("Taslak", { exact: true }).first()).toBeVisible();

      // İlk görev: soru, Matematik, 20 soru, bugüne
      await page.getByRole("button", { name: "İlk görevi ekle" }).click();
      let dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Görev ekle" })).toBeVisible();
      const chips = dialog.getByRole("group", { name: "Günler" });
      await chips.getByText("Pzt", { exact: true }).click(); // varsayılan seçimi kaldır
      await chips.getByText(todayChip, { exact: true }).click();
      await dialog.getByLabel("Tür").selectOption({ label: "Soru" });
      await dialog.getByLabel("Ders").selectOption({ label: "Matematik" });
      await dialog.getByLabel("Soru sayısı").fill("20");
      await dialog.getByRole("button", { name: "Görevi ekle" }).click();
      await expect(page.getByText("Görev eklendi.").last()).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const todayColumn = page.getByTestId(`day-${today}`);
      await expect(todayColumn.getByTestId("plan-item")).toHaveCount(1);
      await expect(todayColumn.getByText("Matematik · 20 soru")).toBeVisible();

      // İkinci görev: serbest, sütunun "Görev ekle" düğmesiyle
      await todayColumn.getByRole("button", { name: "Görev ekle" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Tür").selectOption({ label: "Serbest" });
      await dialog.getByLabel("Başlık").fill("Kitap oku");
      await dialog.getByRole("button", { name: "Görevi ekle" }).click();
      await expect(page.getByText("Görev eklendi.").last()).toBeVisible();
      await expect(todayColumn.getByTestId("plan-item")).toHaveCount(2);
      await expect(page.getByText("Hafta toplamı: 2 görev")).toBeVisible();

      // Kopyalama onayı: mevcut + eklenecek sayıları, sonra vazgeç
      await page.getByRole("button", { name: "Başka öğrencilere kopyala" }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByText(/mevcut \+ 2 eklenecek/).first()).toBeVisible();
      await dialog.getByRole("button", { name: "Vazgeç" }).click();

      // Yayınla
      await page.getByRole("button", { name: "Planı yayınla" }).click();
      await expect(page.getByText("Plan yayınlandı.")).toBeVisible();
      await expect(page.getByText("Yayınlandı", { exact: true }).first()).toBeVisible();
      await logout(page);

      // Öğrenci: Bugün kartı, hızlı kayıtla tamamlama, erteleme
      await page.setViewportSize(projectViewport);
      await login(page, student.username, E2E_STUDENT_PASSWORD);
      await page.goto("/student/today");
      const planSection = page.getByRole("region", { name: "Planım" });
      await expect(planSection.getByTestId("plan-task")).toHaveCount(2);
      await expect(planSection.getByText("0 / 2 tamamlandı")).toBeVisible();

      await planSection.getByRole("checkbox", { name: "Tamamla: Matematik · 20 soru" }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Görevi tamamla" })).toBeVisible();
      await expect(dialog.getByRole("radio", { name: "Mat" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await dialog.getByLabel("Doğru", { exact: true }).fill("15");
      await dialog.getByLabel("Yanlış", { exact: true }).fill("3");
      await dialog.getByLabel("Boş", { exact: true }).fill("2");
      await dialog.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText(/Görev tamamlandı\./)).toBeVisible();
      await expect(
        planSection.getByRole("checkbox", { name: "Tamamlandı: Matematik · 20 soru" }),
      ).toBeVisible();
      await expect(planSection.getByText("1 / 2 tamamlandı")).toBeVisible();

      // Kayıt gerçekten plan görevine bağlı: geri alma bağı koparır ve söyler
      await page.goto("/student/plan");
      await expect(page.getByRole("heading", { level: 1, name: "Haftalık plan" })).toBeVisible();
      await page.getByRole("button", { name: "Görev detayı: Matematik · 20 soru" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Tamamlamayı geri al" }).click();
      await expect(
        page.getByText(
          "Tamamlama geri alındı. Soru kaydın duruyor, sadece görevle bağı kaldırıldı.",
        ),
      ).toBeVisible();
      // Tek dokunuşla yeniden tamamla (soru türü sheet açar; serbest görevi tamamla)
      await page.getByRole("checkbox", { name: "Tamamla: Kitap oku" }).click();
      await expect(page.getByText("Görev tamamlandı.", { exact: true })).toBeVisible();

      // Erteleme: soru görevi bir kez
      await page.getByRole("button", { name: "Görev detayı: Matematik · 20 soru" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Yarına ertele" }).click();
      await expect(page.getByText(/ertelendi\.|taşındı\./)).toBeVisible();
      // Görev yarına (pazarsa "bu hafta içinde"ye) taşındı; oraya bak
      if (today < 7) {
        await page.getByRole("tab", { name: new RegExp(`^${DAY_FULL[(today + 1) % 7]},`) }).click();
      }
      await page.getByRole("button", { name: "Görev detayı: Matematik · 20 soru" }).click();
      await expect(page.getByText("Bu görev bir kez ertelendi; tekrar ertelenemez.")).toBeVisible();
      await page.keyboard.press("Escape");
      await logout(page);

      // Koç: tamamlandı, ertelendi, uyum
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page, accounts.coach.identifier);
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await expect(page.getByText("1 görev ertelendi")).toBeVisible();
      await expect(page.getByTestId("plan-item").filter({ hasText: "Kitap oku" })).toContainText(
        "Tamamlandı",
      );
      await expect(
        page.getByTestId("plan-item").filter({ hasText: "Matematik · 20 soru" }),
      ).toContainText("Ertelendi");
      await page.goto("/coach/students");
      const row = page
        .getByTestId("student-row")
        .filter({ hasText: student.username })
        .filter({ visible: true });
      // Bugüne kadar: bugünün tamamlanan görevi 1/1 → %100; hafta geneli 1/2 → %50.
      await expect(row).toContainText("%100");
      await expect(row).toContainText("hafta %50");

      // Kısayol: görev menüsünden "Kopyala" → "Her gün" (görevin kendi günü devre dışı kalır)
      await page.goto(`/coach/students/${student.studentId}/plan`);
      await page.getByRole("button", { name: "Görev menüsü: Kitap oku" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Kopyala" }).click();
      const copyChips = dialog.getByRole("group", { name: "Kopyalanacak günler" });
      await expect(copyChips.getByRole("checkbox", { disabled: true })).toHaveCount(1);
      await dialog.getByRole("button", { name: "Her gün" }).click();
      await expect(copyChips.getByRole("checkbox", { checked: true })).toHaveCount(6);
      await dialog.getByRole("button", { name: "6 güne kopyala" }).click();
      await expect(page.getByText("Görev 6 güne kopyalandı.")).toBeVisible();
      await expect(page.getByTestId("plan-item").filter({ hasText: "Kitap oku" })).toHaveCount(7);
    } finally {
      await page.setViewportSize({ width: 1440, height: 900 });
      if (/\/coach\//.test(page.url())) await logout(page);
      await deleteStudentAsOwner(page, student.username);
    }
  });
});
