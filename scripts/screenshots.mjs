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
  // Faz 4a: haftalık program
  {
    dir: "uygulama-4a",
    file: "ogrenci-program-390.png",
    as: "student",
    width: 390,
    path: "/student/schedule",
  },
  {
    dir: "uygulama-4a",
    file: "ogrenci-program-1440.png",
    as: "student",
    width: 1440,
    path: "/student/schedule",
  },
  {
    dir: "uygulama-4a",
    file: "ogrenci-mesguliyet-formu-390.png",
    as: "student",
    width: 390,
    path: "/student/schedule",
    before: async (page) => {
      await page.getByRole("button", { name: "Meşguliyet ekle" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-4a",
    file: "koc-program-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/schedule`,
  },
  // Faz 4b: haftalık plan
  {
    dir: "uygulama-4b",
    file: "koc-plan-olusturucu-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
  },
  {
    dir: "uygulama-4b",
    file: "koc-plan-bos-hafta-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.zeynep}/plan`,
  },
  {
    dir: "uygulama-4b",
    file: "koc-gorev-formu-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
    before: async (page) => {
      await page.getByTestId("day-5").getByRole("button", { name: "Görev ekle" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-4b",
    file: "koc-planlar-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/plans",
  },
  {
    dir: "uygulama-4b",
    file: "ogrenci-plan-390.png",
    as: "student",
    width: 390,
    path: "/student/plan",
  },
  {
    dir: "uygulama-4b",
    file: "ogrenci-plan-1440.png",
    as: "student",
    width: 1440,
    path: "/student/plan",
  },
  {
    dir: "uygulama-4b",
    file: "ogrenci-bugun-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
  },
  {
    dir: "uygulama-4b",
    file: "ogrenci-gorev-tamamla-390.png",
    as: "student",
    width: 390,
    path: "/student/plan",
    before: async (page) => {
      await page.getByRole("tab", { name: /^Salı,/ }).click();
      await page
        .getByRole("checkbox", { name: /^Tamamla: / })
        .first()
        .click();
      await page.getByRole("dialog").waitFor();
    },
  },
  // Faz 4c: konu uyarıları
  {
    dir: "uygulama-4c",
    file: "koc-dikkat-gerektirenler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-4c",
    file: "koc-zayif-konular-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/topics`,
  },
  {
    dir: "uygulama-4c",
    file: "koc-havuz-uyarilar-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
  },
  {
    dir: "uygulama-4c",
    file: "sahip-ayarlar-1440.png",
    as: "owner",
    width: 1440,
    path: "/coach/settings",
  },
  {
    dir: "uygulama-4c",
    file: "ogrenci-bugun-konu-karti-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
  },
  // Faz 4d: öneri motoru
  {
    dir: "uygulama-4d",
    file: "koc-oneriler-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
  },
  {
    dir: "uygulama-4d",
    file: "koc-plana-ekle-1440.png",
    as: "coach",
    width: 1440,
    path: "/coach/students",
    before: async (page) => {
      await page
        .getByRole("region", { name: "Öneriler" })
        .getByRole("button", { name: /^Plana ekle: / })
        .first()
        .click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    dir: "uygulama-4d",
    file: "koc-genel-bakis-oneriler-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  {
    dir: "uygulama-4d",
    file: "koc-havuz-oneriler-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/plan`,
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
