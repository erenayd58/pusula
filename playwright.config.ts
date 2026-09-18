import { defineConfig, devices } from "@playwright/test";

/**
 * Uygulama testleri üretim derlemesine karşı koşar (3100; dev sunucusu 3000'de kalır). Ölçüm
 * (4 paralel oturum, giriş → plan → K1 → çıkış): dev sunucusu oturum başına ~45 s (tek işlem,
 * CPU'ya bağlı derleme + React dev render), üretim ~2,4 s. Dev'de 4 işçi 60 s test bütçesini
 * aşıyordu; paralel "çıkış / giriş zamanlaması" hataları bundandı. `pnpm e2e:server` elle
 * açıksa yeniden kullanılır. Yalnızca `/dev/design` (üretimde 404) dev sunucusunda test edilir.
 *
 * Paylaşımlı durum (02 karar #47): kurum ayarını ya da sistem şablonunu değiştiren spec'ler
 * `e2e/shared/` altındadır ve `shared-desktop` projesinde tek işçiyle seri koşar; diğer uygulama
 * projeleri bu projeye bağımlıdır (önce o biter, durum geri alınmış olur), böylece okuyan testler
 * değişmiş ayarı görmez. Tek dosya koşarken bağımlılığı atlamak için `--no-deps`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const devURL = process.env.PLAYWRIGHT_DEV_URL ?? "http://localhost:3000";
const DESIGN_SPEC = /design-page\.spec\.ts/;
const SHARED_SPECS = /[\\/]shared[\\/].*\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  // Oturum akışları çok adımlı (birden fazla giriş/çıkış); üretim sunucusunda 4 işçiyle yeterli.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "shared-desktop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: SHARED_SPECS,
      fullyParallel: false,
      workers: 1,
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [DESIGN_SPEC, SHARED_SPECS],
      dependencies: ["shared-desktop"],
    },
    // WebKit kurulmaz; mobil profil de Chromium tabanlı (Pixel 7).
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testIgnore: [DESIGN_SPEC, SHARED_SPECS],
      dependencies: ["shared-desktop"],
    },
    // Tasarım sistemi sayfası yalnızca dev sunucusunda (src/app/dev/layout.tsx üretimde 404).
    {
      name: "design-desktop",
      use: { ...devices["Desktop Chrome"], baseURL: devURL },
      testMatch: DESIGN_SPEC,
    },
    {
      name: "design-mobile",
      use: { ...devices["Pixel 7"], baseURL: devURL },
      testMatch: DESIGN_SPEC,
    },
  ],
  webServer: [
    {
      command: "pnpm e2e:server",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      // next build + start; soğuk makinede derleme birkaç dakika sürebilir.
      timeout: 300_000,
    },
    {
      command: "pnpm dev",
      url: `${devURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
