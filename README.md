# Pusula

8. sınıf LGS öğrencileri için çalışma takip ve koçluk platformu.

Başlamak için sırayla:

1. `docs/01-proje-plani.md` — ne yapıyoruz, neden
2. `docs/06-claude-code-rehberi.md` — kurulum ve faz faz geliştirme
3. `CLAUDE.md` — Claude Code bu dosyayı her oturumda otomatik okur

## Geliştirme

```bash
pnpm install
pnpm db:start        # yerel Supabase (Docker)
pnpm db:reset        # migration'lar + supabase/seed.sql
pnpm db:test         # pgTAP RLS testleri
pnpm env:local       # .env.local'i supabase status çıktısından üretir (aşağıya bak)
pnpm dev
```

### Ortam değişkenleri (`.env.local`)

`.env.local` commit'lenmez; `pnpm env:local` dosyayı yerel Supabase'den üretir (`--force` ile yeniden yazar).
Elle dolduracaksan `pnpm exec supabase status -o env` çıktısındaki şu değerleri kullan:

| `.env.local` | `supabase status` | Not |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` | `sb_publishable_…`; eski `ANON_KEY` kullanılmaz |
| `SUPABASE_SECRET_KEY` | `SECRET_KEY` | `sb_secret_…`; sadece sunucu (`lib/supabase/admin.ts`); eski `SERVICE_ROLE_KEY` kullanılmaz |
| `STUDENT_EMAIL_DOMAIN` | — | `ogrenci.pusula.local` (boşsa koddaki varsayılan; bulutta da aynı kalmalı) |
| `NEXT_PUBLIC_SITE_URL` | — | `http://localhost:3000` (`config.toml` `site_url` ile aynı) |
| `MAILPIT_URL` | `MAILPIT_URL` | `http://127.0.0.1:54324`; doğrulama e-postaları burada (Playwright de okur) |

`supabase/config.toml` değişince (ör. auth hook, e-posta şablonu) `pnpm db:stop && pnpm db:start` gerekir;
`db:reset` konteynerleri yeniden başlatsa da Auth yapılandırmasını yeniden okumaz.

### Kimlik doğrulama yapılandırması

- **E-posta doğrulama:** Veli kaydı doğrulama e-postası ister (`enable_confirmations = true`); yerelde e-postalar Mailpit'e düşer: http://127.0.0.1:54324. Şablon `supabase/templates/confirmation.html` (`/auth/confirm?token_hash=…`). Bulutta doğrulama kapalıdır (veli davet koduyla gelir, kayıttan sonra doğrudan onay ekranı); kurulum için `docs/07-bulut-kurulum.md`.
- **Rol claim'i:** `public.custom_access_token_hook` `profiles.role`'ü JWT'ye `app_metadata.user_role` olarak ekler; `proxy.ts` rol bazlı yönlendirmeyi bundan yapar. Yerelde `config.toml` `[auth.hook.custom_access_token]` açıktır. **Üretimde** Dashboard → Authentication → Hooks → "Customize Access Token (JWT) Claims" → `public.custom_access_token_hook` seçilir. Açılmazsa proxy yalnızca oturum kontrolü yapar; layout'lardaki `requireRole` yine korur.

`pnpm db:reset` yerel veritabanına demo verisi yükler (`supabase/seed.sql`, sadece yerel).
Demo hesapların tümünün şifresi **`pusula-demo`**'dur; bu değer yalnızca yerel Docker
ortamı içindir, hiçbir uzak ortamda kullanılmaz.

| Rol | Giriş |
|---|---|
| Kurum sahibi | `sahip@pusula.local` |
| Koç | `koc@pusula.local` |
| Öğrenci | `ayse.k`, `mehmet.y`, `zeynep.a` (kullanıcı adı; arka planda `<ad>@ogrenci.pusula.local`) |
| Veli | `veli.ayse@pusula.local`, `veli.mehmet@pusula.local` (ilk girişte KVKK onayı istenir) |

Uçtan uca testler (`pnpm test:e2e`) yerel Supabase'in çalışmasını ve `.env.local`'i bekler; koç seed hesabıyla öğrenci oluşturur, veli daveti akışını Mailpit üzerinden doğrular.
