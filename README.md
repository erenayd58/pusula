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
pnpm dev
```

`pnpm db:reset` yerel veritabanına demo verisi yükler (`supabase/seed.sql`, sadece yerel).
Demo hesapların tümünün şifresi **`pusula-demo`**'dur; bu değer yalnızca yerel Docker
ortamı içindir, hiçbir uzak ortamda kullanılmaz.

| Rol | Giriş |
|---|---|
| Kurum sahibi | `sahip@pusula.local` |
| Koç | `koc@pusula.local` |
| Öğrenci | `ayse.k`, `mehmet.y`, `zeynep.a` (kullanıcı adı; arka planda `<ad>@ogrenci.pusula.local`) |
| Veli | `veli.ayse@pusula.local`, `veli.mehmet@pusula.local` |
