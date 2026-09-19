/**
 * Uygulama ekran görüntüleri (belge amaçlı):
 * `pnpm screenshots [--only <faz>] [--file <dosya.png>] [--out docs/tasarim]`.
 *
 * Çalışan bir sunucu bekler (varsayılan http://localhost:3000; `PLAYWRIGHT_BASE_URL` ile değişir)
 * ve yerel seed hesaplarını kullanır (supabase/seed.sql). e2e testlerinin parçası değildir;
 * Playwright'ı yalnızca tarayıcı olarak kullanır. Her faz kendi listesini `SHOTS` içine ekler;
 * her kayıt `dir` ile kendi klasörüne (uygulama-<faz>) yazılır. `--only 2` yalnızca o klasörü üretir.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "pusula-demo";
const ACCOUNTS = {
  student: "ayse.k",
  coach: "koc@pusula.local",
  owner: "sahip@pusula.local",
  parent: "veli.ayse@pusula.local",
};
const SEED = {
  ayse: "b0000000-0000-4000-8000-000000000011",
  mehmet: "b0000000-0000-4000-8000-000000000012",
  zeynep: "b0000000-0000-4000-8000-000000000013",
  resource: "f0000000-0000-4000-8000-000000000001",
  playlist: "f2000000-0000-4000-8000-000000000001",
};
const VIEWPORTS = {
  390: {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  },
  1440: { viewport: { width: 1440, height: 900 } },
};

/** @type {Array<{ dir: string; file: string; as: keyof typeof ACCOUNTS; width: 390 | 1440; path: string; before?: (page: import("@playwright/test").Page) => Promise<void> }>} */
const SHOTS = [
  // Faz 1c: kabuklar
  {
    dir: "uygulama-1c",
    file: "ogrenci-today-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
  },
  {
    dir: "uygulama-1c",
    file: "ogrenci-today-1440.png",
    as: "student",
    width: 1440,
    path: "/student/today",
  },
  {
    dir: "uygulama-1c",
    file: "ogrenci-hizli-kayit-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
    before: async (page) => {
      // Faz 1c'de toast'tı; Faz 3'ten itibaren sheet açılır.
      await page.getByRole("button", { name: "Soru kaydı ekle" }).filter({ visible: true }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-1c",
    file: "koc-ogrenciler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-1c",
    file: "koc-ogrenci-detay-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  {
    dir: "uygulama-1c",
    file: "koc-moduller-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/modules`,
  },
  {
    dir: "uygulama-1c",
    file: "koc-kagit-onayi-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.zeynep}`,
    before: async (page) => {
      await page.getByRole("button", { name: "Kâğıt onayı kaydet" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-1c",
    file: "koc-menu-390.png",
    as: "coach",
    width: 390,
    path: "/coach/students",
    before: async (page) => {
      await page.getByRole("button", { name: "Menüyü aç" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  { dir: "uygulama-1c", file: "veli-ozet-390.png", as: "parent", width: 390, path: "/parent" },

  // Faz 2: konu haritası ve şablon editörü
  {
    dir: "uygulama-2",
    file: "ogrenci-konular-390.png",
    as: "student",
    width: 390,
    path: "/student/topics",
  },
  {
    dir: "uygulama-2",
    file: "ogrenci-konular-1440.png",
    as: "student",
    width: 1440,
    path: "/student/topics",
  },
  {
    dir: "uygulama-2",
    file: "ogrenci-konu-detay-390.png",
    as: "student",
    width: 390,
    path: "/student/topics",
    before: async (page) => {
      await page.getByRole("button", { name: "Paragrafta Anlam: Tamamlandı" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-2",
    file: "koc-ogrenci-konular-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/topics`,
  },
  {
    dir: "uygulama-2",
    file: "koc-sablon-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/templates",
  },

  // Faz 3: Bugün, hızlı kayıt, geçmiş, koç listesi ve genel bakış
  {
    dir: "uygulama-3",
    file: "ogrenci-bugun-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
  },
  {
    dir: "uygulama-3",
    file: "ogrenci-bugun-1440.png",
    as: "student",
    width: 1440,
    path: "/student/today",
  },
  {
    dir: "uygulama-3",
    file: "ogrenci-hizli-kayit-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
    before: openQuickLog,
  },
  {
    dir: "uygulama-3",
    file: "ogrenci-hizli-kayit-1440.png",
    as: "student",
    width: 1440,
    path: "/student/today",
    before: openQuickLog,
  },
  {
    dir: "uygulama-3",
    file: "ogrenci-gecmis-390.png",
    as: "student",
    width: 390,
    path: "/student/logs",
  },
  {
    dir: "uygulama-3",
    file: "koc-ogrenciler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-3",
    file: "koc-genel-bakis-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  // Faz 4: plan sistemi (program, plan, uyarılar, öneriler)
  {
    dir: "uygulama-4",
    file: "ogrenci-bugun-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
  },
  {
    dir: "uygulama-4",
    file: "ogrenci-plan-390.png",
    as: "student",
    width: 390,
    path: "/student/plan",
  },
  {
    dir: "uygulama-4",
    file: "ogrenci-plan-gorev-390.png",
    as: "student",
    width: 390,
    path: "/student/plan",
    before: async (page) => {
      await page
        .getByRole("button", { name: /^Görev detayı: / })
        .first()
        .click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-4",
    file: "ogrenci-program-390.png",
    as: "student",
    width: 390,
    path: "/student/schedule",
  },
  {
    dir: "uygulama-4",
    file: "koc-ogrenciler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-4",
    file: "koc-genel-bakis-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  {
    dir: "uygulama-4",
    file: "koc-plan-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
  },
  {
    dir: "uygulama-4",
    file: "koc-plan-havuz-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
    // Havuz varsayılan kapalı; açılınca tercih localStorage'da kalır (aynı bağlam sonraki kareler).
    before: async (page) => {
      await page.getByRole("button", { name: "Görev havuzunu aç" }).click();
      await page.getByRole("complementary", { name: "Görev havuzu" }).waitFor();
    },
  },
  {
    dir: "uygulama-4",
    file: "koc-plan-bos-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.zeynep}/plan`,
    before: async (page) => {
      // Önceki kare havuzu açtı; boş hafta varsayılan görünümde (havuz kapalı).
      const collapse = page.getByRole("button", { name: "Görev havuzunu daralt" });
      if (await collapse.isVisible()) await collapse.click();
    },
  },
  {
    dir: "uygulama-4",
    file: "koc-ayarlar-1440.png",
    as: "owner",
    width: 1440,
    path: "/coach/settings",
  },

  // Faz 5: strateji katmanı (seed: Ayşe'nin hedefi kurulu ve takvimin önünde, Mehmet takvimin
  // gerisinde; Parça 3: K1/K2 öneri listesinde dönem satırı ve strateji notu)
  {
    dir: "uygulama-5",
    file: "koc-hedef-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/target`,
    before: async (page) => {
      // Ders bölümleri katlı (gecikmiş konu yoksa); ilk ders açılır ki konu satırları görünsün.
      await page.getByTestId("topic-target-subject").first().locator("summary").click();
    },
  },
  {
    dir: "uygulama-5",
    file: "koc-hedef-onizleme-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/target`,
    before: async (page) => {
      // Önizleme diyaloğu; kaydedilmez (seed durumu değişmez).
      await page.getByRole("button", { name: "Takvimi yeniden oluştur ve kaydet" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-5",
    file: "koc-genel-bakis-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  {
    dir: "uygulama-5",
    file: "koc-ogrenciler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-5",
    file: "koc-genel-bakis-geride-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.mehmet}`,
  },
  {
    dir: "uygulama-5",
    file: "koc-hedef-gecikmis-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.mehmet}/target`,
  },
  {
    dir: "uygulama-5",
    file: "ogrenci-bugun-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
  },
  {
    dir: "uygulama-5",
    file: "ogrenci-konu-detay-390.png",
    as: "student",
    width: 390,
    path: "/student/topics",
    before: async (page) => {
      // Bitmemiş konu: hedef haftası + okul haftası satırları.
      await page.getByRole("button", { name: "Cümlenin Ögeleri: Çalışılıyor" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },

  // Faz 6 Parça 1: denemeler (seed: Ayşe 4 genel deneme → grafik; katalog denemesi Ayşe + Mehmet)
  {
    dir: "uygulama-6",
    file: "ogrenci-denemeler-390.png",
    as: "student",
    width: 390,
    path: "/student/exams",
  },
  {
    dir: "uygulama-6",
    file: "ogrenci-deneme-giris-390.png",
    as: "student",
    width: 390,
    path: "/student/exams/new",
    before: async (page) => {
      // 2. adım (netler): serbest deneme adıyla ilerlenir; kaydedilmez.
      await page.getByRole("radio", { name: "Başka bir deneme" }).click();
      await page.getByLabel("Deneme adı").fill("Kafa Dengi Deneme 4");
      await page.getByRole("button", { name: "Devam" }).click();
      await page.getByRole("list", { name: "Ders netleri" }).waitFor();
      const rows = page.getByTestId("subject-entry-row");
      await rows.nth(0).getByLabel("Doğru", { exact: true }).fill("16");
      await rows.nth(0).getByLabel("Yanlış", { exact: true }).fill("2");
      await rows.nth(1).getByLabel("Doğru", { exact: true }).fill("13");
      await rows.nth(1).getByLabel("Yanlış", { exact: true }).fill("4");
    },
  },
  {
    dir: "uygulama-6",
    file: "ogrenci-deneme-detay-390.png",
    as: "student",
    width: 390,
    path: "/student/exams/e1000000-0000-4000-8000-000000000004",
  },
  {
    dir: "uygulama-6",
    file: "koc-denemeler-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/exams`,
  },
  {
    dir: "uygulama-6",
    file: "koc-deneme-katalog-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/exams",
  },
  {
    dir: "uygulama-6",
    file: "koc-deneme-karsilastirma-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/exams/e0000000-0000-4000-8000-000000000001",
  },
  {
    dir: "uygulama-6",
    file: "koc-ogrenciler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },

  // Faz 6 Parça 2: yanlış defteri (seed: Ayşe 3 fotoğrafsız kayıt), veli, konu hücresi deneme satırı
  {
    dir: "uygulama-6",
    file: "ogrenci-yanlislar-390.png",
    as: "student",
    width: 390,
    path: "/student/mistakes",
  },
  {
    dir: "uygulama-6",
    file: "ogrenci-yanlis-ekle-390.png",
    as: "student",
    width: 390,
    path: "/student/mistakes/new",
    before: async (page) => {
      // Fotoğraf seçilmiş hali (önizleme + "Not ekle" katlanır); kaydedilmez.
      await page.getByLabel("Fotoğraf seç").setInputFiles("e2e/fixtures/soru.jpg");
      await page.getByTestId("mistake-photo-preview").waitFor();
      await page.getByRole("radio", { name: "Mat", exact: true }).click();
      await page.getByRole("radio", { name: "İşlem hatası" }).click();
    },
  },
  {
    dir: "uygulama-6",
    file: "ogrenci-konu-detay-390.png",
    as: "student",
    width: 390,
    path: "/student/topics",
    before: async (page) => {
      await page.getByRole("button", { name: /^Üslü İfadeler:/ }).click();
      await page.getByRole("dialog").getByTestId("topic-mock").waitFor();
    },
  },
  {
    dir: "uygulama-6",
    file: "koc-yanlislar-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/mistakes`,
  },
  {
    dir: "uygulama-6",
    file: "veli-ozet-390.png",
    as: "parent",
    width: 390,
    path: `/parent/${SEED.ayse}`,
  },
  {
    dir: "uygulama-6",
    file: "veli-denemeler-390.png",
    as: "parent",
    width: 390,
    path: `/parent/${SEED.ayse}/exams`,
  },

  // Faz 7: kaynaklar ve videolar (11-faz7-kaynaklar.md §2). Seed: Ayşe Demo Mat SB %30, 2 video izlemiş;
  // Mehmet'in özel "Fen Fasikülü" koç kataloğunda "Öğrenci ekledi" bölümünde.
  {
    dir: "uygulama-7",
    file: "ogrenci-kaynaklar-390.png",
    as: "student",
    width: 390,
    path: "/student/resources",
  },
  {
    dir: "uygulama-7",
    file: "ogrenci-kaynak-detay-390.png",
    as: "student",
    width: 390,
    path: `/student/resources/${SEED.resource}`,
  },
  {
    dir: "uygulama-7",
    file: "ogrenci-kaynak-ekle-390.png",
    as: "student",
    width: 390,
    path: "/student/resources/new",
    before: async (page) => {
      await page.getByLabel("Kitap adı").fill("Demo Matematik");
      await page.getByTestId("resource-suggestions").waitFor();
    },
  },
  {
    dir: "uygulama-7",
    file: "koc-kaynak-katalog-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/resources",
  },
  {
    dir: "uygulama-7",
    file: "koc-kaynak-detay-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/resources/${SEED.resource}`,
  },
  {
    dir: "uygulama-7",
    file: "koc-kaynaklar-sekmesi-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/resources`,
    before: async (page) => {
      await page.locator("summary").first().click();
    },
  },
  {
    dir: "uygulama-7",
    file: "koc-plan-havuz-kaynaklar-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
    before: async (page) => {
      const open = page.getByRole("button", { name: "Görev havuzunu aç" });
      if (await open.isVisible()) await open.click();
      await page.getByRole("complementary", { name: "Görev havuzu" }).waitFor();
    },
  },
  {
    dir: "uygulama-7",
    file: "ogrenci-videolar-390.png",
    as: "student",
    width: 390,
    path: "/student/videos",
  },
  {
    dir: "uygulama-7",
    file: "ogrenci-video-oynatici-390.png",
    as: "student",
    width: 390,
    path: `/student/videos/${SEED.playlist}`,
  },
  {
    dir: "uygulama-7",
    file: "ogrenci-video-ekle-390.png",
    as: "student",
    width: 390,
    path: "/student/videos/new",
  },
  {
    dir: "uygulama-7",
    file: "koc-video-katalog-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/videos",
  },
  {
    dir: "uygulama-7",
    file: "koc-video-detay-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/videos/${SEED.playlist}`,
  },
  {
    dir: "uygulama-7",
    file: "koc-videolar-sekmesi-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/videos`,
    before: async (page) => {
      await page.locator("summary").first().click();
    },
  },
  {
    dir: "uygulama-7",
    file: "koc-sablon-kopyala-1440.png",
    as: "owner",
    width: 1440,
    path: "/coach/templates",
    before: async (page) => {
      await page.getByRole("button", { name: "Şablonu kopyala" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  // Faz 8: veli paneli ve bildirimler
  {
    dir: "uygulama-8",
    file: "veli-ozet-390.png",
    as: "parent",
    width: 390,
    path: `/parent/${SEED.ayse}`,
  },
  {
    dir: "uygulama-8",
    file: "veli-ozet-gecen-hafta-390.png",
    as: "parent",
    width: 390,
    path: `/parent/${SEED.ayse}`,
    before: async (page) => {
      await page.getByRole("link", { name: "Önceki hafta" }).click();
      await page.waitForURL(/week=/);
      await page.waitForLoadState("networkidle");
    },
  },
  {
    dir: "uygulama-8",
    file: "veli-notlar-390.png",
    as: "parent",
    width: 390,
    path: `/parent/${SEED.ayse}/notes`,
  },
  {
    dir: "uygulama-8",
    file: "veli-yanlislar-390.png",
    as: "parent",
    width: 390,
    path: `/parent/${SEED.ayse}/mistakes`,
  },
  {
    dir: "uygulama-8",
    file: "veli-bildirimler-390.png",
    as: "parent",
    width: 390,
    path: "/parent/notifications",
  },
  {
    dir: "uygulama-8",
    file: "ogrenci-bildirimler-390.png",
    as: "student",
    width: 390,
    path: "/student/notifications",
  },
  {
    dir: "uygulama-8",
    file: "ogrenci-notlar-390.png",
    as: "student",
    width: 390,
    path: "/student/notes",
  },
  {
    dir: "uygulama-8",
    file: "koc-bildirimler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/notifications",
  },
  {
    dir: "uygulama-8",
    file: "koc-ogrenciler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-8",
    file: "koc-genel-bakis-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  {
    dir: "uygulama-8",
    file: "koc-notlar-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/notes`,
  },
  {
    dir: "uygulama-8",
    file: "koc-duyurular-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/announcements",
  },
  {
    dir: "uygulama-8",
    file: "koc-ayarlar-ogrenci-uyarilari-1440.png",
    as: "owner",
    width: 1440,
    path: "/coach/settings",
    before: async (page) => {
      await page.getByRole("group", { name: "Öğrenci uyarıları" }).scrollIntoViewIfNeeded();
    },
  },
];

/** (+) → hızlı kayıt sheet'i; Doğru/Yanlış doldurulur ki anlık özet görünsün (kaydedilmez). */
async function openQuickLog(page) {
  await page.getByRole("button", { name: "Soru kaydı ekle" }).filter({ visible: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("radio", { name: "Mat" }).click();
  await dialog.getByLabel("Doğru", { exact: true }).fill("32");
  await dialog.getByLabel("Yanlış", { exact: true }).fill("6");
  await dialog.getByLabel("Boş", { exact: true }).fill("2");
  await dialog.getByLabel("Boş", { exact: true }).blur();
}

const outArg = process.argv.indexOf("--out");
const outRoot = resolve(outArg > -1 ? process.argv[outArg + 1] : "docs/tasarim");
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? `uygulama-${process.argv[onlyArg + 1]}` : null;
const fileArg = process.argv.indexOf("--file");
const onlyFile = fileArg > -1 ? process.argv[fileArg + 1] : null;
const shots = SHOTS.filter((s) => (!only || s.dir === only) && (!onlyFile || s.file === onlyFile));

const browser = await chromium.launch();
/** Aynı hesap + genişlik için tek oturum. */
const contexts = new Map();

async function contextFor(as, width) {
  const key = `${as}-${width}`;
  if (contexts.has(key)) return contexts.get(key);
  const context = await browser.newContext({
    ...VIEWPORTS[width],
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Kullanıcı adı veya e-posta").fill(ACCOUNTS[as]);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
  contexts.set(key, page);
  return page;
}

let failed = 0;
for (const shot of shots) {
  try {
    const outDir = resolve(outRoot, shot.dir);
    mkdirSync(outDir, { recursive: true });
    const page = await contextFor(shot.as, shot.width);
    await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (shot.before) await shot.before(page);
    await page.waitForTimeout(400); // giriş animasyonları
    // Tam sayfa yakalamada sabit alt menü görünüm konumunda (sayfanın ortasında) boyanır ve içeriği
    // kapatıyormuş gibi görünür; belge görüntüsünde belge altına sabitlenir (gerçekte içerik
    // `--nav-bottom` kadar boşluk bırakır). Yalnızca görüntü için; uygulamada değişiklik yok.
    await page.addStyleTag({
      content: "body { position: relative } nav.fixed { position: absolute !important }",
    });
    await page.screenshot({ path: resolve(outDir, shot.file), fullPage: true });
    console.log(`✓ ${shot.dir}/${shot.file}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${shot.file}: ${error instanceof Error ? error.message : error}`);
  }
}

await browser.close();
console.log(`${shots.length - failed}/${shots.length} görüntü → ${outRoot}`);
process.exit(failed > 0 ? 1 : 0);
