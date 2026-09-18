/**
 * Uygulama ekran görüntüleri (belge amaçlı): `pnpm screenshots [--only <faz>] [--out docs/tasarim]`.
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
  zeynep: "b0000000-0000-4000-8000-000000000013",
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

  // Faz 5: strateji katmanı (Parça 2: hedef ve geri planlama; seed'de Ayşe'nin hedefi kurulu)
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
const shots = only ? SHOTS.filter((s) => s.dir === only) : SHOTS;

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
