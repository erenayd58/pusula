# CLAUDE.md

Ölçek: tek koç, birkaç öğrenci, ücretsiz. Güvenlik (RLS) tavizsiz; diğer konularda en basit çalışan çözümü seç.

Bu dosya Claude Code'un bu depoda nasıl çalışacağını tanımlar. Kısa tutulur; ayrıntılar `docs/` altındadır.

## Proje

**Pusula**: 8. sınıf LGS öğrencileri için çalışma takip ve koçluk platformu. Üç kullanıcı rolü vardır: öğrenci (mobil ağırlıklı), koç/owner (masaüstü), veli (mobil, salt okunur özet). Kullanıcılar reşit olmayan çocuklar ve veliler olduğu için güvenlik ve veri gizliliği her kararda önceliklidir.

## Belgeler (bu sırayla başvur)

1. `docs/01-proje-plani.md`: amaç, roller, modül kataloğu, yol haritası
2. `docs/02-mimari.md`: yığın, klasör yapısı, modül sistemi, veri akışı, karar kaydı
3. `docs/03-veri-modeli.md`: tablolar, RLS matrisi, görünümler, fonksiyonlar
4. `docs/04-tasarim-sistemi.md`: token'lar, yüzey dilleri, ekran kuralları, yazım dili
   - `docs/tasarim/`: onaylanan tasarım (HTML) ve ekran görüntüleri (PNG). Arayüz yaparken ilgili ekranın PNG'sine bak. Kural çelişirse 04 belgesi geçerli; tasarımdaki örnek veriler bağlayıcı değil.
5. `docs/05-lgs-2027-sablonu.md`: seed verisi
6. `docs/06-claude-code-rehberi.md`: faz istemleri
7. `docs/07-bulut-kurulum.md`: Supabase/Vercel kurulum adımları

Belge ile kod çelişirse dur ve sor. Onaylanan değişiklikte önce belgeyi güncelle.

## Yığın

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth, Storage, pg_cron) · @supabase/ssr · Zod · react-hook-form · Recharts · date-fns · Vitest · Playwright · pgTAP · pnpm

## Komutlar

```bash
pnpm dev            # geliştirme sunucusu
pnpm check          # lint + typecheck + unit test — her adımın sonunda çalıştır
pnpm test:e2e       # Playwright (üretim derlemesi 3100'de; açıksa `pnpm e2e:server` yeniden kullanılır)
pnpm screenshots    # docs/tasarim/uygulama-<faz>/ ekran görüntüleri (dev sunucusu açıkken; e2e dışı)
pnpm db:start       # yerel Supabase
pnpm db:reset       # migration'ları sıfırdan uygula + seed
pnpm db:test        # pgTAP RLS testleri — her şema değişikliğinden sonra çalıştır
pnpm db:types       # src/types/database.types.ts üret
supabase migration new <ad>
```

Bir görevi "bitti" saymadan önce `pnpm check` ve (şema değiştiyse) `pnpm db:test` başarılı olmalı.

## Mimari Kurallar

- **Modüller** `src/features/<modul>/` altındadır ve `module.ts` manifesti ile kaydolur. Menü, sekme ve panel kartları elle yazılmaz, registry'den üretilir.
- Bir modül başka bir modülü **sadece** `@/features/<modul>` (index.ts) üzerinden import eder. `lib`, `components`, `modules`, `types` hiçbir `features/*` dosyasını import etmez.
- Modüller arası veri ihtiyacı veritabanı **görünümleriyle** karşılanır.
- **Okuma:** Sunucu Bileşeni → `features/*/server/queries.ts` (`import "server-only"`).
- **Yazma:** `features/*/server/actions.ts` içinde `createAction({ schema, roles, handler })`. Dönüş tipi `Result<T>`.
- Çok tablolu yazma işlemleri tek bir Postgres fonksiyonunda (transaction).
- `lib/supabase/admin.ts` (secret key) sadece öğrenci hesabı oluşturma, şifre sıfırlama ve silme için; öncesinde yetki veritabanında doğrulanır.
- "Bugün", hafta ve tarih hesapları her zaman `lib/dates` üzerinden, `Europe/Istanbul` saat diliminde. Hafta pazartesi başlar.
- Dersler, konular, net kuralı, eşikler **asla koda gömülmez**; veritabanından okunur.
- Test/kaynak tamamlanma bilgisi ayrı tutulmaz; `question_logs` tek veri kaynağıdır.

## Veritabanı Kuralları

- Şema değişikliği **sadece** `supabase/migrations/` dosyasıyla. Dashboard'dan değişiklik yok, mevcut migration dosyası düzenlenmez (yenisi eklenir).
- **Her yeni tabloda:** RLS açık + politikalar + pgTAP testleri (03-veri-modeli.md Bölüm 5.4'teki 5 senaryo). Önce testleri yaz.
- Politikalarda `(select auth.uid())` kullan; yetki kontrolü `private.*` yardımcı fonksiyonlarıyla.
- Security definer fonksiyonlar: `set search_path = ''`, ilk satırda yetki kontrolü, tablo adları `public.` önekli.
- Görünümler `with (security_invoker = true)`.
- Öğrenci verisi tabloları `student_id … on delete cascade`.
- Yabancı anahtar kolonlarına indeks.
- Migration sonrası `pnpm db:types` çalıştır ve üretilen dosyayı commit'le.
- Varsayılan yetkiler kapalıdır: `anon`'un `public`'te hiçbir yetkisi yok, `public` ve `private` fonksiyonlarında `authenticated` execute'u **fonksiyon başına** açıkça verilir (`grant execute on function … to authenticated`); `090_schema_guards` testi bunu her tablo/fonksiyon için denetler.

## Kod Stili

- TypeScript strict; `any` yok, `as` zorlamaları gerekçesiz yok.
- Dosya adları `kebab-case`, bileşenler `PascalCase` isimli export (default export sadece Next.js'in gerektirdiği dosyalarda).
- Kod, değişken, tablo ve rota adları İngilizce; **kullanıcıya görünen her metin Türkçe**.
- Enum → Türkçe etiket eşlemeleri sadece `src/content/labels.ts` içinde.
- Zod şemaları `schemas.ts` içinde, form ve action aynı şemayı kullanır.
- Saf iş mantığı (net, hedef ilerlemesi, tekrar tarihi, seri) `lib/` altında ve birim testli.
- Yeni bağımlılık eklemeden önce sor; kabul edilirse `02-mimari.md` karar kaydına ekle.
- `lib/format` çıktıları sayı ile birim arasında U+00A0 (NBSP) içerir; e2e ve birim testlerinde metin karşılaştırmalarında NBSP'yi hesaba kat (`NBSP` sabiti `@/lib/format`'ta).

## Arayüz Kuralları

- **Hibrit yüzey:** öğrenci `data-surface="clay"`, veli `clay-calm`, koç `flat`. Rol layout'u bu özelliği kök öğeye koyar; ortak bileşenler varyantı buradan alır. Koç ekranlarında clay yok (logo kutusu ve avatar hariç).
- Renk, gölge, yarıçap ve metin boyutu sadece token'larla (04 Bölüm 3). Hex değer yazılmaz.
- Ders rengi `subjects.color` token önekinden `subjectVars()` ile verilir; `bg-${...}` gibi dinamik Tailwind sınıfı kurma.
- Ders rengi sadece dersi temsil eder: rozet metni `-ink` tonu `-soft` zemin üzerinde; tam renk sadece şerit, dolgu, grafik. Ders dışı metrikler (toplam hedef, plan uyumu, toplam net) ders rengi kullanmaz.
- Kırmızı sadece sistem hatası (her zaman ikon + metin ile). Uyarı rengi sadece koç ekranlarında. Fosforlu sarı sadece tamamlanan görev ve ulaşılan günlük hedef.
- Clay: en fazla 3 seviye; clay kaptır, içerik düzdür; basılı durumda `--clay-pressed` + %3 küçülme.
- Responsive: telefon < 768, `md:` tablet, `lg:` masaüstü. Öğrenci telefonda ve tablette alt menü, masaüstünde 104 px yan menü. < 768 px alt panel, ≥ 768 px diyalog (`ResponsiveSheet`).
- Menüler ve sekmeler modül registry'sinden üretilir, elle yazılmaz.
- Sayı/tarih biçimi sadece `lib/format` ile (`71,33` · `1.250` · `%80`). Biçimlenmiş metni CSS veya hesap değeri olarak kullanma (`width: 86%`, `%86` değil).
- Öğrenciye "sen", veliye "siz", koça nötr dil; düğmeler eylemi söyler; boş ekran eylem önerir (04 Bölüm 12).
- Her sayfa segmentinde `loading.tsx` (iskelet) ve `error.tsx`.
- Erişilebilirlik: 44 px dokunma hedefi, `--focus-ring`, bilgi sadece renkle verilmez, klavye akışları (hızlı kayıt, konu haritası, sürükle-bırak), `prefers-reduced-motion`.
- Emoji ikon olarak kullanılmaz (lucide). Öğrenciler arası sıralama öğrenci ve veli arayüzünde yok.
- Kapsam dışı öğe tasarımda görünse bile eklenmez (ör. veli mesajlaşması); önce sor.

## Çalışma Şekli

1. Görev geldiğinde önce ilgili belgeleri oku ve **plan çıkar**; onay almadan büyük değişikliğe başlama.
2. Katman sırası: migration → RLS testleri → politikalar → tipler → queries/actions → arayüz → testler.
3. Küçük, çalışan adımlarla ilerle; her adım sonunda doğrulama komutlarını çalıştır.
4. Belirsizlikte varsayım yapma, kısa bir soru sor.
5. Faz bittiğinde `docs/01-proje-plani.md` yol haritasını ve gerekiyorsa karar kaydını güncelle.

## Yapma

- `.env*` dosyalarını okuma, yazdırma veya commit'leme (sadece `.env.example`).
- Secret key'i veya `lib/supabase/admin.ts`'i istemci bileşeninden import etme.
- RLS'yi devre dışı bırakma, test geçsin diye politikayı gevşetme.
- `src/types/database.types.ts` dosyasını elle düzenleme; her zaman `pnpm db:types` ile üret.
- Öğrenci verisini loglara yazma (ad, not, fotoğraf yolu).
- LGS puanı hesaplamaya çalışma; sadece net hesaplanır.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
