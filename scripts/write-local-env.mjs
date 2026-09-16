#!/usr/bin/env node
// Yerel Supabase'in `supabase status` çıktısından .env.local üretir (README "Geliştirme").
// Değerler commit'lenmez (.gitignore: .env*). Var olan dosyayı --force olmadan ezmez.
//
//   pnpm env:local            # .env.local yoksa yazar
//   pnpm env:local --force    # her durumda yeniden yazar (CI)

import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
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

const lines = [
  "# pnpm env:local ile üretildi; commit'lenmez. Kaynak: supabase status",
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
  `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
  "STUDENT_EMAIL_DOMAIN=ogrenci.pusula.local",
  "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
  `MAILPIT_URL=${status.MAILPIT_URL}`,
  "",
];

writeFileSync(target, lines.join("\n"), "utf8");
console.log(`.env.local yazıldı (${required.length} değer supabase status'tan).`);
