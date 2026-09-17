/**
 * Uygulama ekran görüntüleri (belge amaçlı): `pnpm screenshots [--out docs/tasarim/uygulama-1c]`.
 *
 * Çalışan bir sunucu bekler (varsayılan http://localhost:3000; `PLAYWRIGHT_BASE_URL` ile değişir)
 * ve yerel seed hesaplarını kullanır (supabase/seed.sql). e2e testlerinin parçası değildir;
 * Playwright'ı yalnızca tarayıcı olarak kullanır. Her faz kendi listesini `SHOTS` içine ekler.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "pusula-demo";
const ACCOUNTS = {
  student: "ayse.k",
  coach: "koc@pusula.local",
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

/** @type {Array<{ file: string; as: keyof typeof ACCOUNTS; width: 390 | 1440; path: string; before?: (page: import("@playwright/test").Page) => Promise<void> }>} */
const SHOTS = [
  { file: "ogrenci-today-390.png", as: "student", width: 390, path: "/student/today" },
  { file: "ogrenci-today-1440.png", as: "student", width: 1440, path: "/student/today" },
  {
    file: "ogrenci-hizli-kayit-390.png",
    as: "student",
    width: 390,
    path: "/student/today",
    before: async (page) => {
      await page.getByRole("button", { name: "Soru kaydı ekle" }).first().click();
      await page.getByText("Hızlı kayıt yakında").waitFor();
    },
  },
  { file: "koc-ogrenciler-1440.png", as: "coach", width: 1440, path: "/coach/students" },
  {
    file: "koc-ogrenci-detay-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}`,
  },
  {
    file: "koc-moduller-1440.png",
    as: "coach",
    width: 1440,
    path: `/coach/students/${SEED.ayse}/modules`,
  },
  {
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
    file: "koc-menu-390.png",
    as: "coach",
    width: 390,
    path: "/coach/students",
    before: async (page) => {
      await page.getByRole("button", { name: "Menüyü aç" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  { file: "veli-ozet-390.png", as: "parent", width: 390, path: "/parent" },
];

const outArg = process.argv.indexOf("--out");
const outDir = resolve(outArg > -1 ? process.argv[outArg + 1] : "docs/tasarim/uygulama-1c");
mkdirSync(outDir, { recursive: true });

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
for (const shot of SHOTS) {
  try {
    const page = await contextFor(shot.as, shot.width);
    await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (shot.before) await shot.before(page);
    await page.waitForTimeout(400); // giriş animasyonları
    await page.screenshot({ path: resolve(outDir, shot.file), fullPage: true });
    console.log(`✓ ${shot.file}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${shot.file}: ${error instanceof Error ? error.message : error}`);
  }
}

await browser.close();
console.log(`${SHOTS.length - failed}/${SHOTS.length} görüntü → ${outDir}`);
process.exit(failed > 0 ? 1 : 0);
