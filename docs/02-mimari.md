# Mimari

> Bu belge projenin "nasıl" kurulduğunu anlatır. Claude Code her oturumda bu belgeye uymalıdır. Bir kural değişecekse önce bu belge güncellenir, sonra kod.

## 1. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Çerçeve | **Next.js 16.x** (App Router) | Sunucu bileşenleri + Server Actions ile ayrı bir API katmanına gerek kalmıyor; Vercel ile sorunsuz. Eylül 2026 itibarıyla güncel kararlı hat 16.3. |
| Dil | **TypeScript** (strict) | Veritabanı tipleri otomatik üretilir, hatalar erken yakalanır |
| Stil | **Tailwind CSS v4** | Tasarım token'ları CSS değişkeni olarak tanımlanır |
| Bileşenler | **shadcn/ui** (Radix tabanlı) | Kod projeye kopyalanır, tamamen özelleştirilebilir, erişilebilir |
| İkonlar | **lucide-react** | |
| Veritabanı ve kimlik | **Supabase** (Postgres, Auth, Storage, pg_cron) | RLS ile güvenlik veritabanı seviyesinde |
| Supabase istemcisi | **@supabase/ssr** + **@supabase/supabase-js** | Çerezle oturum yönetimi |
| Doğrulama | **Zod** | Aynı şema hem formda hem Server Action'da |
| Formlar | **react-hook-form** + `@hookform/resolvers` | |
| Grafikler | **Recharts** | |
| Tarih | **date-fns** + `date-fns/locale/tr` + `@date-fns/tz` | Tüm gün hesapları `Europe/Istanbul` saat diliminde |
| Sürükle-bırak | **dnd-kit** | Plan oluşturucu için |
| Görsel sıkıştırma | **browser-image-compression** | Yanlış defteri fotoğrafları |
| Bildirim (toast) | **sonner** | |
| PWA | **Serwist** (`@serwist/next`) | Faz 8 |
| Test | **Vitest** (birim), **Playwright** (uçtan uca), **pgTAP** (RLS, `supabase test db`) | |
| Kod kalitesi | **ESLint** (flat config) + **Prettier** + `prettier-plugin-tailwindcss` | |
| Paket yöneticisi | **pnpm** | |
| CI | **GitHub Actions** | Lint, tip kontrolü, test, migration doğrulama |

Bağımlılık eklerken kural: yukarıdaki listede olmayan bir paket gerekiyorsa, önce neden gerektiği `Karar Kaydı`na (Bölüm 11) yazılır.

## 2. Klasör Yapısı

```
pusula/
├── CLAUDE.md                        # Claude Code için kalıcı talimatlar
├── README.md
├── .env.example                     # Gerekli ortam değişkenleri (değersiz)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                   # lint + typecheck + test + db test
│   │   ├── backup.yml               # haftalık pg_dump yedeği
│   │   └── keepalive.yml            # günlük hafif istek (proje duraklamasın)
│   └── dependabot.yml
├── docs/
│   ├── 01-proje-plani.md
│   ├── 02-mimari.md
│   ├── 03-veri-modeli.md
│   ├── 04-tasarim-sistemi.md
│   ├── tasarim/                     # Claude Design çıktıları (görsel referans) + ekran görüntüleri
│   ├── 05-lgs-2027-sablonu.md
│   └── 06-claude-code-rehberi.md
├── supabase/
│   ├── config.toml
│   ├── migrations/                  # YYYYMMDDHHMMSS_aciklama.sql (tek doğruluk kaynağı)
│   ├── seed.sql                     # Yerel geliştirme verisi (demo kurum, koç, 3 öğrenci)
│   ├── seeds/
│   │   └── lgs-2027-template.sql    # Üretimde de çalıştırılabilir şablon verisi
│   └── tests/                       # pgTAP RLS testleri
│       ├── 00_helpers.sql
│       ├── rls_students.test.sql
│       └── rls_question_logs.test.sql
├── public/
│   └── icons/                       # PWA ikonları
├── e2e/                             # Playwright testleri
│   ├── fixtures/
│   ├── student-quick-log.spec.ts
│   └── coach-create-student.spec.ts
└── src/
    ├── proxy.ts                     # Next.js 16: oturum yenileme + rol bazlı yönlendirme
    ├── app/
    │   ├── layout.tsx               # Kök layout: font, tema, Toaster
    │   ├── globals.css              # Tailwind + tasarım token'ları
    │   ├── manifest.ts              # PWA manifest
    │   ├── not-found.tsx
    │   ├── (auth)/
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── invite/[code]/page.tsx
    │   │   └── consent/page.tsx     # KVKK onay ekranı
    │   ├── auth/callback/route.ts
    │   ├── (student)/
    │   │   └── student/
    │   │       ├── layout.tsx       # Mobil kabuk: üst bar + alt menü; requireRole('student')
    │   │       ├── page.tsx         # → /student/today yönlendirme
    │   │       ├── today/page.tsx
    │   │       ├── topics/page.tsx
    │   │       ├── topics/[subjectId]/page.tsx
    │   │       ├── log/page.tsx
    │   │       ├── plan/page.tsx
    │   │       ├── goals/page.tsx
    │   │       ├── resources/…
    │   │       ├── videos/…
    │   │       ├── exams/…
    │   │       ├── mistakes/…
    │   │       ├── review/page.tsx
    │   │       ├── stats/page.tsx
    │   │       └── profile/page.tsx
    │   ├── (coach)/
    │   │   └── coach/
    │   │       ├── layout.tsx       # Masaüstü kabuk: yan menü; requireRole('coach','owner')
    │   │       ├── page.tsx         # Dikkat gerektirenler + öğrenci kartları
    │   │       ├── students/page.tsx
    │   │       ├── students/new/page.tsx
    │   │       ├── students/[studentId]/
    │   │       │   ├── layout.tsx   # Öğrenci başlığı + sekmeler (modüllerden üretilir)
    │   │       │   ├── page.tsx     # Genel bakış
    │   │       │   ├── topics/page.tsx
    │   │       │   ├── questions/page.tsx
    │   │       │   ├── plan/page.tsx
    │   │       │   ├── exams/page.tsx
    │   │       │   ├── mistakes/page.tsx
    │   │       │   ├── notes/page.tsx
    │   │       │   ├── modules/page.tsx   # Modül aç/kapat
    │   │       │   └── settings/page.tsx
    │   │       ├── templates/…      # Müfredat şablonları
    │   │       ├── resources/…      # Kaynak kataloğu
    │   │       ├── videos/…         # Video kataloğu
    │   │       ├── exams/…          # Deneme kataloğu
    │   │       ├── plan-templates/…
    │   │       ├── announcements/…
    │   │       └── settings/page.tsx   # Kurum ayarları, uyarı eşikleri
    │   └── (parent)/
    │       └── parent/
    │           ├── layout.tsx
    │           ├── page.tsx         # Çocuk seçimi (tek çocuksa doğrudan yönlendirir)
    │           └── [studentId]/…
    ├── features/                    # MODÜLLER (bkz. Bölüm 3)
    │   ├── topics/
    │   ├── question-log/
    │   ├── goals/
    │   ├── planner/
    │   ├── coach-notes/
    │   ├── announcements/
    │   ├── resources/
    │   ├── videos/
    │   ├── mock-exams/
    │   ├── mistakes/
    │   ├── review/
    │   ├── analytics/
    │   ├── notifications/
    │   ├── study-timer/
    │   ├── checkins/
    │   ├── reading/
    │   ├── target-schools/
    │   ├── achievements/
    │   └── school-exams/
    ├── modules/
    │   ├── define-module.ts         # defineModule() yardımcı fonksiyonu ve tipleri
    │   ├── registry.ts              # Tüm modül manifestlerinin listesi
    │   └── get-enabled-modules.ts   # Öğrenci için açık modülleri getirir (cache'li)
    ├── components/
    │   ├── ui/                      # shadcn/ui bileşenleri (sadece burada)
    │   ├── layout/                  # SurfaceRoot (data-surface), StudentBottomNav, StudentRail, CoachSidebar, PageHeader
    │   ├── charts/                  # Ortak grafik sarmalayıcıları
    │   └── shared/                  # EmptyState, SubjectBadge, subjectVars, StatTile, GoalRing, NumberStepper…
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts            # Tarayıcı istemcisi
    │   │   ├── server.ts            # Sunucu istemcisi (çerezli)
    │   │   ├── admin.ts             # Secret key'li istemci — "server-only", sadece koç işlemleri
    │   │   └── proxy.ts             # proxy.ts için oturum yenileme yardımcı fonksiyonu
    │   ├── auth/
    │   │   ├── get-session-user.ts  # Kullanıcı + profil + rol (React cache ile)
    │   │   ├── require-role.ts
    │   │   └── username.ts          # kullanıcı adı ↔ sentetik e-posta dönüşümü
    │   ├── actions/
    │   │   └── create-action.ts     # Server Action sarmalayıcısı (auth + zod + Result)
    │   ├── dates/
    │   │   └── index.ts             # todayInIstanbul(), weekStart()…
    │   ├── format/
    │   │   └── index.ts             # formatPercent, formatNet, formatCount, formatDuration, formatDateTr
    │   ├── exam/
    │   │   └── net.ts               # calculateNet(correct, wrong, penalty)
    │   ├── result.ts                # Result<T> tipi
    │   └── utils.ts                 # cn() vb.
    ├── config/
    │   ├── site.ts
    │   └── constants.ts             # Uygulama çapında sabitler (sezon değil, teknik sabitler)
    ├── content/
    │   └── labels.ts                # Enum → Türkçe etiket eşlemeleri (tek yer)
    └── types/
        ├── database.types.ts        # `supabase gen types` çıktısı — ELLE DÜZENLENMEZ
        └── index.ts                 # Sık kullanılan tablo satır tipleri (Tables<'…'>)
```

Rota segmentleri İngilizcedir (kod tutarlılığı için); arayüzdeki tüm metinler Türkçedir. İleride Türkçe URL istenirse `next.config` içinde `rewrites` ile eklenebilir.

## 3. Modül Sistemi

Projenin "generic ve modüler" olmasını sağlayan çekirdek budur.

### 3.1 Bir modülün klasör yapısı

```
src/features/question-log/
├── module.ts              # Manifest: kimlik, menü, panel kartları, ayarlar
├── index.ts               # DIŞA AÇIK API — başka yerler sadece buradan import eder
├── components/
│   ├── quick-log-sheet.tsx
│   ├── question-log-table.tsx
│   ├── question-log-form.tsx
│   └── widgets/
│       ├── student-today-widget.tsx
│       ├── coach-overview-widget.tsx
│       └── parent-summary-widget.tsx
├── server/
│   ├── queries.ts         # import "server-only"; sadece okuma
│   └── actions.ts         # "use server"; sadece yazma, createAction ile
├── schemas.ts             # Zod şemaları (form + action ortak)
├── types.ts
└── lib/
    ├── aggregate.ts       # Saf fonksiyonlar
    └── aggregate.test.ts
```

### 3.2 Manifest

```ts
// src/modules/define-module.ts
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { z } from "zod";

export type Role = "owner" | "coach" | "student" | "parent";

export type ModuleWidgetProps = { studentId: string };

export type ModuleManifest<TSettings extends z.ZodTypeAny = z.ZodTypeAny> = {
  id: string;                        // "question-log" — veritabanındaki module_id ile aynı
  name: string;                      // "Soru Takibi"
  description: string;
  icon: LucideIcon;
  core?: boolean;                    // true ise kapatılamaz
  defaultEnabled: boolean;
  dependsOn?: string[];              // ["topics"]
  nav?: Partial<Record<Role, { href: string; label?: string; order: number; mobile?: boolean }>>;
  coachStudentTab?: { segment: string; label: string; order: number };
  widgets?: {
    studentToday?: { component: ComponentType<ModuleWidgetProps>; order: number };
    coachOverview?: { component: ComponentType<ModuleWidgetProps>; order: number };
    parentSummary?: { component: ComponentType<ModuleWidgetProps>; order: number };
  };
  settingsSchema?: TSettings;        // Öğrenci bazlı ayarlar (ör. varsayılan günlük hedef)
};

export function defineModule<T extends z.ZodTypeAny>(m: ModuleManifest<T>) {
  return m;
}
```

```ts
// src/features/question-log/module.ts
import { PencilLine } from "lucide-react";
import { z } from "zod";
import { defineModule } from "@/modules/define-module";
import { StudentTodayWidget } from "./components/widgets/student-today-widget";

export const questionLogModule = defineModule({
  id: "question-log",
  name: "Soru Takibi",
  description: "Günlük çözülen soruların ders ve konu bazında kaydı",
  icon: PencilLine,
  defaultEnabled: true,
  dependsOn: ["topics"],
  nav: {
    student: { href: "/student/log", order: 30, mobile: true },
  },
  coachStudentTab: { segment: "questions", label: "Sorular", order: 30 },
  widgets: {
    studentToday: { component: StudentTodayWidget, order: 20 },
  },
  settingsSchema: z.object({
    showBlankField: z.boolean().default(true),
  }),
});
```

### 3.3 Modüllerin kullanıldığı yerler

- **Menüler:** `BottomNav` ve `Sidebar`, `registry` içindeki `nav` alanlarını role ve açık modüllere göre filtreleyerek oluşturur. Menü öğesi elle yazılmaz.
- **Paneller:** "Bugün", koç genel bakış ve veli özet sayfaları, ilgili `widgets` alanını `order`'a göre sıralayıp render eder.
- **Koç öğrenci sekmeleri:** `coachStudentTab` alanlarından üretilir.
- **Rota koruması:** Her modül sayfası en üstte `await requireModule(studentId, "question-log")` çağırır; modül kapalıysa `notFound()`.
- **Bağımlılık:** Koç bir modülü açarken `dependsOn` içindekiler kapalıysa uyarı verilir ve birlikte açılır.
- **Veritabanı:** `student_modules(student_id, module_id, enabled, settings)`. Kayıt yoksa manifestteki `defaultEnabled` geçerlidir.

### 3.4 Modül sınırları (kesin kurallar)

1. Bir modül, başka bir modülün iç dosyalarını import **edemez**. Sadece `@/features/<modul>` (yani `index.ts`) üzerinden erişir.
2. `components/ui`, `components/shared`, `lib`, `modules`, `types` her yerden import edilebilir; ama bunlar hiçbir `features/*` dosyasını import **edemez**.
3. Modüller arası veri ihtiyacı (ör. analiz modülünün soru kayıtlarını okuması) veritabanı **görünümleri** (views) üzerinden karşılanır, TypeScript import'u üzerinden değil.
4. Bu kurallar ESLint `no-restricted-imports` (veya `eslint-plugin-boundaries`) ile otomatik denetlenir.

## 4. Veri Akışı

### 4.1 Okuma

- Varsayılan: **Sunucu Bileşeni** içinde `features/<modul>/server/queries.ts` fonksiyonu çağrılır.
- Sorgular `lib/supabase/server.ts` istemcisini kullanır; bu istemci kullanıcının oturumuyla çalıştığı için **RLS otomatik uygulanır**.
- Oturum ve profil bilgisi `getSessionUser()` ile alınır; React `cache()` ile istek başına bir kez çalışır.
- İstemci tarafında sık güncellenen tek tük ekranlar (odak sayacı gibi) dışında istemci tarafı veri çekme kütüphanesi kullanılmaz.

### 4.2 Yazma

Tüm yazma işlemleri `createAction` sarmalayıcısıyla tanımlanır:

```ts
// src/lib/actions/create-action.ts (özet)
export function createAction<TSchema extends z.ZodTypeAny, TOut>(opts: {
  schema: TSchema;
  roles: Role[];
  handler: (input: z.infer<TSchema>, ctx: ActionContext) => Promise<TOut>;
  revalidate?: string[];
}) {
  return async (raw: unknown): Promise<Result<TOut>> => {
    // 1. Oturum ve rol kontrolü
    // 2. zod ile doğrulama → hata varsa { ok: false, fieldErrors }
    // 3. handler çalıştır (RLS yine de son savunma hattı)
    // 4. revalidatePath
    // 5. Beklenmeyen hataları loglayıp kullanıcıya genel Türkçe mesaj döndür
  };
}
```

```ts
// src/lib/result.ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

- Formlar `useOptimistic` veya `useTransition` ile anında geri bildirim verir.
- Başarı/hata mesajı `sonner` toast ile gösterilir.
- Toplu ve kritik işlemler (plan kopyalama, deneme sonucu + ders sonuçları + konu yanlışları) tek bir Postgres fonksiyonunda (`rpc`) **tek transaction** olarak yapılır.

### 4.3 Yetki katmanları

1. `proxy.ts`: Oturum yoksa `/login`'e; rol yanlış bölgeye girmeye çalışıyorsa kendi ana sayfasına yönlendirir. (Bu sadece kullanıcı deneyimi içindir, güvenlik değildir.)
2. `layout.tsx` içinde `requireRole()`: Sunucu tarafında kesin kontrol.
3. `createAction` içinde `roles`: Eylem düzeyinde kontrol.
4. **RLS:** Asıl güvenlik. Diğer katmanlar atlanmış olsa bile veri sızmaz.

### 4.4 Secret key kullanımı

`lib/supabase/admin.ts` sadece şu işlemlerde kullanılır ve dosyanın başında `import "server-only"` bulunur:

- Öğrenci Auth hesabı oluşturma (sentetik e-posta ile)
- Öğrenci şifresi sıfırlama
- Öğrenci silme (Auth kullanıcısı + depo dosyaları)

Her kullanımdan önce çağıranın o öğrencinin koçu veya kurum sahibi olduğu **veritabanı fonksiyonuyla** doğrulanır.

## 5. Tarih ve Saat

- Veritabanında zaman damgaları `timestamptz`, "hangi güne ait" bilgisi ayrıca `date` kolonu olarak tutulur (ör. `question_logs.log_date`).
- "Bugün" her zaman `Europe/Istanbul` saat dilimine göre hesaplanır: gece 00:30'da girilen kayıt yeni güne aittir.
- Hafta **pazartesi** başlar.
- Tüm tarih biçimlendirme `lib/dates` üzerinden yapılır; bileşenlerde doğrudan `new Date().toLocaleDateString()` kullanılmaz.

## 6. Hata Yönetimi ve Kayıt

- Her rota segmentinde `error.tsx` ve `loading.tsx` bulunur (iskelet ekranlar).
- Kullanıcıya gösterilen hata mesajları Türkçe, ne olduğunu ve ne yapılacağını söyler: "Kayıt kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene."
- Beklenmeyen hatalar Faz 9'da Sentry'ye gönderilir; öncesinde `console.error` + Vercel logları.

## 7. Performans İlkeleri

- Özet ekranlar ham tabloları taramaz; `v_student_daily_summary` gibi görünümler ve doğru indeksler kullanılır.
- Koç panelindeki öğrenci listesi tek sorguyla (görünüm) gelir, öğrenci başına ayrı sorgu yapılmaz (N+1 yasak).
- Grafik bileşenleri `dynamic(() => import(...), { ssr: false })` ile gerektiğinde yüklenir.
- Görseller her zaman imzalı URL + `next/image` olmadan küçük önizleme boyutunda (Supabase görsel dönüştürme ücretsiz planda yok; sıkıştırma yüklemede yapılır).

## 8. Test Stratejisi

| Tür | Araç | Neyi kapsar | Ne zaman |
|---|---|---|---|
| Birim | Vitest | `lib/*` ve `features/*/lib/*` saf fonksiyonları: net hesabı, hedef ilerlemesi, tekrar tarihi, hafta hesapları | Her fonksiyonla birlikte |
| RLS | pgTAP (`supabase test db`) | Her tablo için: öğrenci kendi verisini görür, başkasınınkini göremez; veli sadece izinli olanı görür; koç sadece kendi öğrencisini görür | Her yeni tabloyla birlikte **zorunlu** |
| Uçtan uca | Playwright | Kritik akışlar: giriş, hızlı soru kaydı, koçun öğrenci oluşturması, plan tamamlama, deneme girişi | Her faz sonunda |

## 9. Ortamlar ve Dağıtım

| Ortam | Uygulama | Veritabanı |
|---|---|---|
| Yerel | `pnpm dev` | `supabase start` (Docker) |
| Önizleme | Vercel preview (her PR) | Staging Supabase projesi (ücretsiz ikinci proje) |
| Üretim | Vercel production (`main`) | Üretim Supabase projesi (Frankfurt) |

Migration akışı:

1. `supabase migration new aciklama` → SQL yaz
2. `supabase db reset` → yerelde sıfırdan uygula + seed
3. `supabase test db` → RLS testleri
4. `pnpm db:types` → `src/types/database.types.ts` güncelle
5. PR → CI yeşil → birleştir
6. Üretime: `supabase db push` (önce staging'e, sonra üretime). Supabase GitHub entegrasyonu ile otomatikleştirilebilir.

**Kural:** Supabase panelinden (dashboard) şema değişikliği yapılmaz. Her değişiklik bir migration dosyasıdır.

### Ortam değişkenleri (`.env.example`)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=                 # sadece sunucu
STUDENT_EMAIL_DOMAIN=ogrenci.example.com
YOUTUBE_API_KEY=                     # sadece sunucu, Faz 5
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Supabase anahtar adları zaman içinde değişebildiği için (eski `anon` / `service_role` → yeni `publishable` / `secret`) kurulumda Supabase'in güncel Next.js rehberi esas alınır.

### package.json betikleri

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:start": "supabase start",
  "db:reset": "supabase db reset",
  "db:test": "supabase test db",
  "db:types": "supabase gen types typescript --local > src/types/database.types.ts",
  "check": "pnpm lint && pnpm typecheck && pnpm test"
}
```

## 10. Zamanlanmış İşler

Vercel Hobby planında cron günde bir kez ve saat hassasiyetinde çalıştığı için zamanlanmış işler **Supabase pg_cron** ile yapılır:

| İş | Zaman (İstanbul) | Ne yapar |
|---|---|---|
| `refresh_review_queue` | Her gün 03:00 | Tekrar tarihi gelen konu ve yanlışları işaretler |
| `create_daily_notifications` | Her gün 07:30 | "Bugün planında X görev var" bildirimleri |
| `detect_inactivity` | Her gün 21:00 | Hareketsizlik uyarılarını üretir |
| `generate_weekly_summary` | Pazar 20:00 | Öğrenci ve veli için haftalık özet |

pg_cron UTC ile çalışır; ifadeler buna göre yazılır (İstanbul = UTC+3).

GitHub Actions:
- `backup.yml`: Haftalık `pg_dump`, şifrelenmiş artifact olarak saklanır (veya ayrı özel depo).
- `keepalive.yml`: Günlük tek bir hafif sorgu (yaz tatilinde projenin duraklamasını önler).

## 11. Karar Kaydı

Her önemli teknik karar buraya bir satır olarak eklenir.

| # | Tarih | Karar | Gerekçe | Alternatifler |
|---|---|---|---|---|
| 1 | 2026-09 | Next.js App Router + Server Actions, ayrı API yok | Tek kod tabanı, az katman | tRPC, ayrı Express API |
| 2 | 2026-09 | Supabase + RLS | Güvenlik veritabanında, ücretsiz plan yeterli | Firebase (NoSQL, raporlama zor), kendi Postgres'imiz |
| 3 | 2026-09 | Müfredat veritabanında şablon | 2028 soru modeli değişikliği | Kodda sabit JSON |
| 4 | 2026-09 | `question_logs` tek veri kaynağı | Kaynak/hedef/istatistik tutarlılığı | Her modülde ayrı sayaç |
| 5 | 2026-09 | Öğrenci için kullanıcı adı + sentetik e-posta | Çocukların e-postası yok | Telefonla SMS girişi (ücretli) |
| 6 | 2026-09 | Zamanlanmış işler pg_cron'da | Vercel Hobby cron sınırı | Harici cron servisi |
| 7 | 2026-09 | Rota segmentleri İngilizce, arayüz Türkçe | Kod tutarlılığı | Türkçe URL |
| 8 | 2026-09 | Hibrit tasarım: öğrenci clay, veli sakin clay, koç sade; `data-surface` ile tek bileşen seti | Yaş grubuna uygun his + koç ekranlarında veri okunabilirliği | Tamamen clay, tamamen düz |
| 9 | 2026-09 | Ders rengi `subjects.color` token öneki + `subjectVars()` CSS değişkenleri | Tailwind dinamik sınıf üretemez; yeni dersler kod değişmeden renk alır | Sabit sınıf eşleme tablosu |
| 10 | 2026-09 | Tasarımdaki veli "Mesajlar" sekmesi "Notlar" olarak uygulanır | Mesajlaşma kapsam dışı | Mesajlaşma modülü eklemek |
