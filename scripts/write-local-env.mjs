#!/usr/bin/env node
// Yerel Supabase'in `supabase status` çıktısından .env.local üretir (README "Geliştirme").
// Değerler commit'lenmez (.gitignore: .env*). Var olan dosyayı --force olmadan ezmez.
//
//   pnpm env:local            # .env.local yoksa yazar
//   pnpm env:local --force    # her durumda yeniden yazar (CI)

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const force = process.argv.includes("--force");
const target = resolve(process.cwd(), ".env.local");

if (existsSync(target) && !force) {
  console.log(".env.local zaten var; yeniden yazmak için --force kullan.");
  process.exit(0);
}

const raw = execSync("pnpm exec supabase status -o json", { encoding: "utf8" });
// CLI, JSON'dan önce uyarı satırı basabilir ("Stopped services: …"); ilk `{`'den itibaren al.
const status = JSON.parse(raw.slice(raw.indexOf("{")));

const required = ["API_URL", "PUBLISHABLE_KEY", "SECRET_KEY", "MAILPIT_URL"];
for (const key of required) {
  if (!status[key]) {
    console.error(`supabase status çıktısında ${key} yok. Supabase çalışıyor mu? (pnpm db:start)`);
    process.exit(1);
  }
}

// --force ile yeniden yazarken elle eklenen ek anahtarlar (ör. YOUTUBE_API_KEY) korunur.
const KNOWN = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "STUDENT_EMAIL_DOMAIN",
  "NEXT_PUBLIC_SITE_URL",
  "MAILPIT_URL",
]);
const extra = existsSync(target)
  ? readFileSync(target, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l) && !KNOWN.has(l.slice(0, l.indexOf("="))))
  : [];

const lines = [
  "# pnpm env:local ile üretildi; commit'lenmez. Kaynak: supabase status",
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
  `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
  "STUDENT_EMAIL_DOMAIN=ogrenci.pusula.local", // koddaki varsayılanla aynı (config/constants)
  "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
  `MAILPIT_URL=${status.MAILPIT_URL}`,
  ...extra,
  "",
];

writeFileSync(target, lines.join("\n"), "utf8");
console.log(`.env.local yazıldı (${required.length} değer supabase status'tan).`);
