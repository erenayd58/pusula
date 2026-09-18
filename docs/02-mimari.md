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
| PWA | **Serwist** (`@serwist/next`) | Faz 9 |
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
├── scripts/
│   ├── write-local-env.mjs          # pnpm env:local: supabase status → .env.local
│   └── screenshots.mjs              # pnpm screenshots: belge amaçlı ekran görüntüleri (docs/tasarim/uygulama-<faz>/)
├── supabase/
│   ├── config.toml
│   ├── templates/confirmation.html  # e-posta doğrulama şablonu (üretimde dashboard'a girilir)
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
    │   ├── dev/layout.tsx           # /dev altı sadece geliştirme ortamı (üretimde notFound)
    │   ├── dev/design/page.tsx      # Tasarım sistemi sayfası: token'lar ve bileşenler, clay | flat yan yana
    │   ├── (auth)/                  # clay yüzeyli, tek sütun (Faz 1b)
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── profile-missing/page.tsx   # oturum var, profil yok
    │   │   ├── invite/page.tsx            # davet kodu girişi
    │   │   ├── invite/[code]/page.tsx     # veli kaydı (signUp)
    │   │   ├── invite/check-email/page.tsx
    │   │   ├── invite/accept/page.tsx     # e-posta doğrulandı → accept_invitation
    │   │   └── consent/page.tsx     # KVKK onay ekranı
    │   ├── auth/confirm/route.ts    # e-posta doğrulama: token_hash → verifyOtp (Supabase SSR kalıbı)
    │   ├── (student)/
    │   │   └── student/
    │   │       ├── layout.tsx       # Mobil kabuk: üst bar + alt menü; requireRole('student')
    │   │       ├── page.tsx         # → /student/today yönlendirme
    │   │       ├── today/page.tsx
    │   │       ├── [section]/page.tsx   # Yer tutucu: registry'deki href → modül açıksa "yakında", değilse 404 (Faz 1c)
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
    │   │       │   ├── [tab]/page.tsx     # Yer tutucu sekmeler (registry segment → requireModule)
    │   │       │   ├── topics/page.tsx
    │   │       │   ├── questions/page.tsx
    │   │       │   ├── plan/page.tsx
    │   │       │   ├── exams/page.tsx
    │   │       │   ├── mistakes/page.tsx
    │   │       │   ├── notes/page.tsx
    │   │       │   ├── modules/page.tsx   # Modül aç/kapat
    │   │       │   └── settings/page.tsx
    │   │       ├── [section]/page.tsx  # Koç menüsündeki yer tutucu sayfalar (Faz 1c)
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
    │           └── [studentId]/
    │               ├── layout.tsx   # Çocuk başlığı + alt menü (Özet · Denemeler · Notlar, registry'den)
    │               ├── page.tsx     # Özet
    │               └── [tab]/page.tsx   # Yer tutucu sekmeler
    ├── features/                    # MODÜLLER (bkz. Bölüm 3)
    │   ├── core/                    # Çekirdek: giriş, öğrenci hesabı, veli daveti, onay, kabuk başlıkları
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
    │   ├── define-module.ts         # defineModule() / defineWidgets() yardımcıları ve tipleri
    │   ├── registry.ts              # Tüm modül manifestlerinin listesi (sadece metadata; menü ve sekmeler buradan)
    │   ├── widgets.ts               # Panel kartlarının listesi (sadece panel sayfaları import eder; Faz 2'den itibaren)
    │   ├── get-enabled-modules.ts   # Öğrenci için açık modülleri getirir (cache'li) + requireModule
    │   ├── set-student-module.ts    # Koçun modül aç/kapat Server Action'ı (bağımlılıklar burada çözülür)
    │   ├── module-toggle-list.tsx   # Modüller sekmesi istemci bileşeni
    │   └── lib/registry-helpers.ts  # Saf yardımcılar (filtre, mergeEnabled, resolveToggle) + testleri
    ├── components/
    │   ├── ui/                      # shadcn/ui bileşenleri (sadece burada)
    │   ├── layout/                  # SurfaceRoot (data-surface + useSurface), NavLink, BottomNav, StudentRail, CoachSidebar (+ CoachMobileMenu), TabNav
    │   ├── charts/                  # Ortak grafik sarmalayıcıları
    │   └── shared/                  # EmptyState, ComingSoon, SubjectBadge, subjectVars, StatTile, GoalRing, NumberStepper…
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts            # Tarayıcı istemcisi
    │   │   ├── server.ts            # Sunucu istemcisi (çerezli)
    │   │   ├── admin.ts             # Secret key'li istemci — "server-only", sadece koç işlemleri
    │   │   └── proxy.ts             # proxy.ts için oturum yenileme yardımcı fonksiyonu
    │   ├── auth/
    │   │   ├── get-session-user.ts  # Kullanıcı + profil + rol (React cache ile; getClaims)
    │   │   ├── require-role.ts
    │   │   ├── routes.ts            # rol ↔ ana sayfa/bölge eşlemesi (proxy ve requireRole ortak)
    │   │   └── username.ts          # kullanıcı adı ↔ sentetik e-posta dönüşümü
    │   ├── actions/
    │   │   └── create-action.ts     # Server Action sarmalayıcısı (auth + zod + Result)
    │   ├── invitations/
    │   │   └── code.ts              # davet kodu üretici (8 karakter, kriptografik)
    │   ├── plan/
    │   │   └── task-title.ts        # otomatik görev başlığı (planner + analytics ortak, Faz 4d)
    │   ├── env.ts                   # ortam değişkenleri tek yerden
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

**Yer tutucu modül sayfaları (karar #22):** Henüz uygulanmamış modüllerin sayfaları tek dinamik segmentle çözülür (`student/[section]`, `coach/[section]`, `coach/students/[studentId]/[tab]`, `parent/[studentId]/[tab]`): segment registry'de bir menü öğesine karşılık gelmiyorsa 404, modül o öğrenci için kapalıysa `requireModule` 404, aksi halde "bu bölüm yakında" boş durumu. Gerçek modül geldiğinde kendi statik klasörü (`topics/page.tsx`) eklenir; Next.js statik segmenti dinamik olana tercih eder, yer tutucuya dokunmak gerekmez.

## 3. Modül Sistemi

Projenin "generic ve modüler" olmasını sağlayan çekirdek budur.

### 3.1 Bir modülün klasör yapısı

```
src/features/question-log/
├── module.ts              # Manifest: kimlik, menü, sekme, ayarlar — SADECE metadata, React bileşeni import etmez
├── widgets.ts             # Panel kartları (studentToday, coachOverview, parentSummary) — bileşen import eder
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
// src/modules/define-module.ts (özet; tam sürüm dosyada)
export type NavItem = { href: string; label?: string; icon?: LucideIcon; order: number; mobile?: boolean };
export type SegmentItem = { segment: string; label: string; icon?: LucideIcon; order: number }; // "" = kök

export type ModuleManifest<TSettings extends z.ZodType = z.ZodType> = {
  id: string;                        // "question-log" — veritabanındaki module_id ile aynı
  name: string;                      // "Soru Takibi"
  description: string;
  icon: LucideIcon;
  core?: boolean;                    // true ise kapatılamaz ve her zaman açık
  defaultEnabled: boolean;
  dependsOn?: string[];              // ["topics"]
  nav?: {
    student?: NavItem[];             // öğrenci menüsü (mobile: alt menüde de görünür)
    coach?: NavItem[];               // koç menüsü (öğrenciye bağlı değil, filtre yok)
    parent?: SegmentItem[];          // veli menüsü seçili çocuğa bağlı: /parent/<studentId>/<segment>
  };
  coachStudentTabs?: SegmentItem[];  // /coach/students/<studentId>/<segment>
  settingsSchema?: TSettings;        // Öğrenci bazlı ayarlar (ör. varsayılan günlük hedef)
};

export function defineModule<T extends z.ZodType>(m: ModuleManifest<T>) {
  return m;
}

// Panel kartları manifestten AYRI tutulur: manifest React bileşeni import etmez,
// böylece menü ve sekmeleri üreten kod widget bileşenlerini paket boyutuna eklemez.
// defineWidgets / ModuleWidgets Faz 2'de ilk kartla (Konular) eklendi; Faz 3'te dizi + sütun
// (karar #33): bir modül birden fazla kart verebilir, masaüstünde main/side iki sütun.
export type StudentTodayWidget = {
  component: ComponentType<ModuleWidgetProps>;
  order: number;
  column?: "main" | "side";          // main: hedef/kayıt/plan; side: hafta/konular/tekrar
};
export type ModuleWidgets = {
  moduleId: string;                  // manifest.id ile aynı
  studentToday?: StudentTodayWidget[];
  // coachOverview, parentSummary: ilk ihtiyaçla aynı kalıpla eklenir
};
```

Nav alanları dizidir çünkü bir modül aynı rol için birden fazla öğe verebilir (çekirdek: Bugün + Ben, Öğrenciler + Ayarlar, Genel bakış + Modüller). Öğe etiketi ve ikonu boşsa modülün adı ve ikonu kullanılır. Menü bileşenleri (`BottomNav`, `StudentRail`, `CoachSidebar`, `TabNav`) sunucu bileşenidir ve çözümlenmiş öğeleri prop alır; yalnızca aktiflik hesabı istemcidedir (`NavLink`). Registry sunucu tarafında kalır, istemci bileşenleri onu import etmez.

```ts
// src/features/question-log/module.ts  (sadece metadata)
import { PencilLine } from "lucide-react";
import { z } from "zod";
import { defineModule } from "@/modules/define-module";

export const questionLogModule = defineModule({
  id: "question-log",
  name: "Soru Takibi",
  description: "Günlük çözülen soruların ders ve konu bazında kaydı",
  icon: PencilLine,
  defaultEnabled: true,
  dependsOn: ["topics"],
  coachStudentTabs: [{ segment: "questions", label: "Sorular", order: 30 }],
  settingsSchema: z.object({
    showBlankField: z.boolean().default(true),
  }),
});
```

```ts
// src/features/question-log/widgets.ts  (panel kartları)
import { defineWidgets } from "@/modules/define-module";
import { TodayLogsWidget } from "./components/widgets/today-logs-widget";
import { WeekSubjectsWidget } from "./components/widgets/week-subjects-widget";

export const questionLogWidgets = defineWidgets({
  moduleId: "question-log",
  studentToday: [
    { component: TodayLogsWidget, order: 20, column: "main" },
    { component: WeekSubjectsWidget, order: 20, column: "side" },
  ],
});
```

`index.ts` her ikisini de dışa açar (`export { questionLogModule } from "./module"; export { questionLogWidgets } from "./widgets";`). `src/modules/registry.ts` manifestleri, `src/modules/widgets.ts` panel kartlarını toplar; menü/sekme üreten kod yalnızca `registry`'yi, panel sayfaları yalnızca `widgets`'ı import eder.

### 3.3 Modüllerin kullanıldığı yerler

- **Menüler:** Rol layout'ları `registry` yardımcılarıyla (`getStudentNav`, `getCoachNav`, `getParentNav`) öğeleri açık modüllere göre filtreler ve `BottomNav` / `StudentRail` / `CoachSidebar`'a verir. Menü öğesi elle yazılmaz. Koç menüsü öğrenciye bağlı olmadığı için filtrelenmez.
- **Paneller:** "Bugün", koç genel bakış ve veli özet sayfaları, `src/modules/widgets.ts` listesindeki ilgili alanı açık modüllere göre filtreleyip `order`'a göre sıralayarak render eder.
- **Koç öğrenci sekmeleri:** `coachStudentTabs` alanlarından üretilir (`getCoachStudentTabs`).
- **Rota koruması:** Her modül sayfası en üstte `await requireModule(studentId, "question-log")` çağırır; modül kapalıysa `notFound()`. Not: sayfa bir `loading.tsx` sınırı içinde akıtıldığı için HTTP durumu 200 kalır, kullanıcı 404 ekranını görür; e2e testleri başlığı doğrular.
- **Bağımlılık:** Koç bir modülü açarken kapalı `dependsOn` modülleri de açılır; kapatırken bu modüle bağımlı açık modüller de kapanır. Çözüm `resolveToggle` (saf, birim testli) ile **sunucuda** `setStudentModule` eylemi içinde yapılır; arayüz satırda bağımlılığı yazar ve sonucu bildirim olarak gösterir ("Konular kapatıldı; birlikte Soru Takibi, Plan da kapatıldı.").
- **Veritabanı:** `student_modules(student_id, module_id, enabled, settings)`. Kayıt yoksa manifestteki `defaultEnabled` geçerlidir.

### 3.4 Modül sınırları (kesin kurallar)

1. Bir modül, başka bir modülün iç dosyalarını import **edemez**. Sadece `@/features/<modul>` (yani `index.ts`) üzerinden erişir.
2. `components`, `lib`, `types`, `content`, `config` ve `modules/` altındaki yardımcılar (`define-module.ts`, `lib/registry-helpers.ts`) her yerden import edilebilir; ama bunlar hiçbir `features/*` dosyasını import **edemez**.
3. **Tek istisna `registry` katmanıdır:** `src/modules/registry.ts` ve `src/modules/widgets.ts` yalnızca `@/features/<modul>` index dosyalarını import edebilir; başka hiçbir shared dosya `features`'a bakmaz. `get-enabled-modules.ts`, `set-student-module.ts` ve `module-toggle-list.tsx` registry'yi kullandığı için bu katmanın parçasıdır ve yalnızca `src/app/**` tarafından import edilir. Modül aç/kapat eylemi bu yüzden bir `features/*/server/actions.ts` içinde değil `src/modules/` altındadır (aksi halde registry ↔ feature döngüsü oluşur).
4. `features/*/module.ts` yalnızca metadata içerir: `react`, `@/components/**` veya modülün kendi bileşenlerini import **edemez**. Bileşen gerektiren panel kartları `features/*/widgets.ts` içindedir.
5. `src/app/**` sayfaları `@/features/<modul>` index'lerini ve `@/modules/*` katmanını import edebilir.
6. Modüller arası veri ihtiyacı (ör. analiz modülünün soru kayıtlarını okuması) veritabanı **görünümleri** (views) üzerinden karşılanır, TypeScript import'u üzerinden değil.
7. Bu kurallar ESLint ile otomatik denetlenir: `eslint-plugin-boundaries` (element tipleri: `feature`, `feature-index`, `registry`, `modules`, `shared`, `app`) + `no-restricted-imports` (derin `@/features/<modul>/…` alias'ı ve `module.ts` için bileşen import'u).

| Kaynak → Hedef | `feature-index` (başka modül) | `feature` iç dosya (başka modül) | `shared`, `modules` | `registry` |
|---|---|---|---|---|
| `feature` | ✔ | ✘ | ✔ | ✘ |
| `shared`, `modules` | ✘ | ✘ | ✔ | ✘ |
| `registry` | ✔ | ✘ | ✔ | ✔ |
| `app` | ✔ | ✘ | ✔ | ✔ |

## 4. Veri Akışı

### 4.1 Okuma

- Varsayılan: **Sunucu Bileşeni** içinde `features/<modul>/server/queries.ts` fonksiyonu çağrılır.
- Sorgular `lib/supabase/server.ts` istemcisini kullanır; bu istemci kullanıcının oturumuyla çalıştığı için **RLS otomatik uygulanır**.
- Oturum ve profil bilgisi `getSessionUser()` ile alınır; React `cache()` ile istek başına bir kez çalışır. Kimlik `supabase.auth.getClaims()` ile doğrulanır (Supabase SSR önerisi; `getSession()` sunucuda güvenilmez), rol her istekte `profiles`'tan okunur (karar #21).
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

1. `proxy.ts`: Oturum yoksa `/login`'e; rol yanlış bölgeye girmeye çalışıyorsa kendi ana sayfasına yönlendirir. Rolü JWT'deki `app_metadata.user_role` claim'inden okur (`custom_access_token_hook`, karar #21); claim yoksa kararı layout'a bırakır. (Bu sadece kullanıcı deneyimi içindir, güvenlik değildir.)
2. `layout.tsx` içinde `requireRole()`: Sunucu tarafında kesin kontrol.
3. `createAction` içinde `roles`: Eylem düzeyinde kontrol.
4. **RLS:** Asıl güvenlik. Diğer katmanlar atlanmış olsa bile veri sızmaz.

### 4.4 Secret key kullanımı

`lib/supabase/admin.ts` sadece şu işlemlerde kullanılır ve dosyanın başında `import "server-only"` bulunur:

- Öğrenci Auth hesabı oluşturma (sentetik e-posta ile) → ardından `create_student_account` RPC (sadece `service_role`; aktör yetkisi, profil + öğrenci satırı tek transaction); RPC düşerse Auth kullanıcısı silinir (telafi)
- Öğrenci şifresi sıfırlama (`can_manage_student` ile önce yetki)
- Öğrenci silme (`can_delete_student`, sadece owner; cascade ile tüm veri; depo temizliği Faz 6)
- Veli kaydında davet kodunun salt okunur ön kontrolü (signUp'tan önce)

Her kullanımdan önce çağıranın o öğrencinin koçu veya kurum sahibi olduğu **veritabanı fonksiyonuyla** doğrulanır.

## 5. Tarih ve Saat

- Veritabanında zaman damgaları `timestamptz`, "hangi güne ait" bilgisi ayrıca `date` kolonu olarak tutulur (ör. `question_logs.log_date`).
- "Bugün" her zaman `Europe/Istanbul` saat dilimine göre hesaplanır: gece 00:30'da girilen kayıt yeni güne aittir.
- Hafta **pazartesi** başlar.
- Tüm tarih biçimlendirme `lib/dates` üzerinden yapılır; bileşenlerde doğrudan `new Date().toLocaleDateString()` kullanılmaz.

## 6. Hata Yönetimi ve Kayıt

- Her rota segmentinde `error.tsx` ve `loading.tsx` bulunur (iskelet ekranlar).
- Kullanıcıya gösterilen hata mesajları Türkçe, ne olduğunu ve ne yapılacağını söyler: "Kayıt kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene."
- Beklenmeyen hatalar Faz 10'da Sentry'ye gönderilir; öncesinde `console.error` + Vercel logları.

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
STUDENT_EMAIL_DOMAIN=ogrenci.pusula.local   # boşsa koddaki varsayılan; bulutta da aynı kalmalı
YOUTUBE_API_KEY=                     # sadece sunucu, Faz 7
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Supabase anahtar adları zaman içinde değişebildiği için (eski `anon` / `service_role` → yeni `publishable` / `secret`) kurulumda Supabase'in güncel Next.js rehberi esas alınır. Faz 1b (2026-09) doğrulaması: rehber `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` adlarını kullanıyor; yerel `supabase status` çıktısındaki `API_URL`, `PUBLISHABLE_KEY` (`sb_publishable_…`), `SECRET_KEY` (`sb_secret_…`) değerleri `pnpm env:local` ile `.env.local`'e yazılır (README). `MAILPIT_URL` sadece e2e içindir.

### Üretim Auth yapılandırması (dashboard, kod dışı)

Yerel `config.toml`'daki şu ayarların üretim/staging projesinde elle yapılması gerekir; unutulursa akışlar bozulmaz ama eksik çalışır:

| Ayar | Yerel | Üretim |
|---|---|---|
| Rol claim hook'u | `[auth.hook.custom_access_token]` | Authentication → Hooks → Customize Access Token → `public.custom_access_token_hook` (açılmazsa proxy sadece oturum kontrolü yapar) |
| E-posta doğrulama | `enable_confirmations = true` | Confirm email **kapalı** (veli davet koduyla gelir; kayıttan sonra doğrudan `/consent`). Uygulama iki durumda da çalışır (`registerParent`: signUp oturum döndürürse daveti hemen kabul eder) |
| Onay e-postası şablonu | `supabase/templates/confirmation.html` | Sadece doğrulama açılırsa: Email Templates → Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/invite/accept` |
| Site URL / redirect | `site_url`, `additional_redirect_urls` | Üretim alan adı |
| SMTP | Mailpit | Doğrulama kapalıyken gerekmez (Faz 8 e-posta bildirimleri ayrı karar) |
| Öğrenci e-posta alanı | `ogrenci.pusula.local` | Aynı değer (`DEFAULT_STUDENT_EMAIL_DOMAIN`); değişirse mevcut öğrenciler giriş yapamaz |

### package.json betikleri

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "e2e:server": "next build && next start -p 3100",
  "screenshots": "node scripts/screenshots.mjs",
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:test": "supabase test db",
  "db:types": "supabase gen types typescript --local > src/types/database.types.ts",
  "env:local": "node scripts/write-local-env.mjs",
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
| 11 | 2026-09 | Modül sınırları `eslint-plugin-boundaries` ile denetlenir | Klasör tabanlı katman kuralları; göreli import kaçaklarını da yakalar | Sadece `no-restricted-imports` |
| 12 | 2026-09 | shadcn/ui v4 (radix-nova) paketi tek seferde kabul: `radix-ui`, `class-variance-authority`, `cn` (clsx + tailwind-merge yerine shadcn'in motoru), `tw-animate-css`, `shadcn` (çalışma zamanında yalnızca `shadcn/tailwind.css` varyantları); semantik token'ları bizim token'lara takma ad. `cn` her zaman `@/lib/utils`'ten import edilir (özel `text-*`, `shadow-*`, `rounded-*` ölçekleri orada tanıtılır; ESLint kuralı) | shadcn bileşenleri bunları bekler; hex yazmadan paletle uyum | Her bileşeni elle yeniden yazmak; clsx + tailwind-merge |
| 13 | 2026-09 | Modül manifesti (`module.ts`, metadata) ile panel kartları (`widgets.ts`, bileşen) ayrı; `registry.ts` / `widgets.ts` ayrı toplanır | Menü ve sekme üreten kod widget bileşenlerini paket boyutuna eklemesin; `registry` katmanı features'a bakan tek shared yer | Tek manifest içinde bileşen referansı |
| 14 | 2026-09 | `typedRoutes` kapalı | Manifest `href` alanları düz string; Faz 1c'de değerlendirildi, dinamik yer tutucu segmentler yüzünden kapalı kaldı | `typedRoutes: true` |
| 15 | 2026-09 | Koç (flat) yüzeyinde `--bg-paper` (#FFFFFF) token'ı; `--focus-color` odak token'ı | Beyaz zemin ve odak rengi tek yerden değişsin (koyu tema); ders dışı öğe ders rengine bağlanmasın | Tailwind `bg-white`, `--subject-math` ile odak |
| 16 | 2026-09 | Yetki ikinci katmanı GRANT'larla: `anon`'a `public`'te sıfır yetki (mevcut + default privileges), `private` fonksiyonları fonksiyon başına `authenticated`'a, yerleşik PUBLIC execute global default privilege ile kapalı, `profiles`/`students`'ta kolon düzeyi UPDATE grant'ı (03 §5.1, §5.3 seçenek (c)); `090_schema_guards` testi katalogdan denetler | RLS atlansa bile anon veri göremesin; rol/kurum/koç kolonları API'den değişmesin; yeni tablo ve fonksiyonlar kapalı doğsun | Sadece RLS; kolon kısıtı için tetikleyici veya RPC |
| 17 | 2026-09 | `students` INSERT/DELETE ve `profiles` INSERT için RLS politikası yok; bu işlemler secret key ile, veritabanı yetki kontrolünden sonra Server Action'da (Faz 1b) | Auth kullanıcısı + profil + öğrenci satırı tek yerde, tek transaction; owner bile API'den doğrudan öğrenci silemez | Owner'a I/D politikası |
| 18 | 2026-09 | pgTAP yardımcıları `tests` şemasında; `000_test_helpers.sql` transaction'sız çalışıp commit eder, sabit kimlikli fixture (`tests.id`, `tests.seed_fixture`) ve `tests.authenticate_as` ile rol/JWT simülasyonu; yalnızca yerel ve CI | Her test dosyası aynı fixture'ı okunur adlarla kullanır; pg_prove alfabetik sırayla önce yardımcıları yükler | Her dosyada fixture tekrarı; harici test-helpers paketi |
| 19 | 2026-09 | Öğrenci sentetik e-postası yerelde `<kullaniciadi>@ogrenci.pusula.local`, üretimde kontrol ettiğimiz alan adının alt alanı (`ogrenci.<alan-adi>`), `STUDENT_EMAIL_DOMAIN` ile | Yerel GoTrue (CLI 2.117) admin API + şifreli giriş deneyi `.local`, `.invalid`, noktasız alan dahil hepsini kabul etti; `sb_secret_` ve eski `service_role` anahtarı aynı davrandı. Barındırılan projede e-posta doğrulama/engelleme ayarları değişebildiği için üretimde çözümlenebilir gerçek bir alt alan kullanılır ve deney staging'de tekrarlanır | `.invalid` TLD; telefon/SMS girişi |
| 20 | 2026-09 | Veli kaydı: açık kayıt (`enable_signup` açık) + davete bağlı profil; e-posta doğrulama yerelde açık (Mailpit e2e), bulutta kapalı (veli davet koduyla gelir, SMTP gerekmez) ve uygulama iki durumda da çalışır. Sunucu işlemi signUp'tan önce kodu doğrular; profil ve `student_parents` bağlantısı yalnızca e-posta doğrulandıktan sonra `accept_invitation` RPC'siyle oluşur (tek kullanımlık, `for update`). Davetsiz biri en fazla profilsiz bir Auth kaydı bırakabilir; RLS ile hiçbir veri göremez | GoTrue'nun standart doğrulama e-postası ve Mailpit ile e2e; az özel kod. Açık karar: `before_user_created` hook ile geçersiz kodlu signUp'ı Auth seviyesinde reddetmek (admin API yolunu etkileyip etkilemediği doğrulanmalı) | Kayıt kapalı + `admin.createUser` + `inviteUserByEmail`/`generateLink` (özel şifre belirleme akışı, daha fazla kod) |
| 21 | 2026-09 | Sunucuda oturum doğrulama `getClaims()`; rol her istekte `profiles`'tan; `proxy.ts` yönlendirmesi için `custom_access_token_hook` JWT'ye `app_metadata.user_role` ekler (yalnızca UX, güvenlik kararı değil) | Supabase SSR rehberi `getClaims()` öneriyor; asimetrik anahtarda (yerel CLI dahil ES256) ağ çağrısı yok. Proxy DB'ye gitmeden yönlendirir; hook kapalıysa layout'lar yine `requireRole` ile korur | `getUser()` her istekte (ağ çağrısı); proxy'de profil sorgusu; rolü yalnızca layout'ta kontrol |
| 22 | 2026-09 | Uygulanmamış modül sayfaları tek dinamik segmentle (`[section]`, `[tab]`) yer tutucu; registry'de yoksa veya modül kapalıysa 404 | Faz 1c'de ~25 klasör × 3 dosya yerine 4 sayfa; gerçek modül kendi statik klasörüyle önceliği alır | Her modüle ayrı klasör |
| 23 | 2026-09 | Onay tamlığı kaynaktan bağımsız: öğrencide `privacy_notice` + `explicit_consent` (geri çekilmemiş) varsa tam; veli dijital onayı veya koçun işlediği kâğıt onayı fark etmez. Veli kapısı (`/consent`) ve koç rozeti aynı sorguyu (`getConsentStatus`) kullanır | Kâğıt onayı pilot öncesi zorunlu; bir velinin onayı yeterli, ikinci veli veya kâğıt sonrası dijital tekrar istenmez | Veli başına dijital onay (Faz 1b davranışı) |
| 24 | 2026-09 | `ResponsiveSheet` yalnızca CSS ile: aynı `Dialog`, `max-md:` sınıflarıyla alt panel; koç telefon menüsü için ayrı `Sheet side="left"` | JS medya sorgusu olmadan sunucu/istemci aynı HTML'i üretir; ek bağımlılık yok | vaul (drawer), `matchMedia` ile iki bileşen |
| 25 | 2026-09 | Menü bileşenleri sunucu bileşeni, aktiflik `NavLink` istemci bileşeninde; ikon bileşenleri (fonksiyon) sunucu→istemci sınırını geçmediği için `ModuleToggleList` düz veri alır, bağımlılık çözümü sunucuda | Manifestler React dışı kalır, istemci paketi registry'yi taşımaz | Registry'yi istemciye taşımak, ikon adını string geçmek |
| 26 | 2026-09 | `devIndicators: false` | Geliştirme rozeti öğrenci rayındaki çıkış düğmesinin üstüne biniyor, e2e tıklamalarını kesiyordu; hata katmanı etkilenmez | Rozeti sağa almak |
| 27 | 2026-09 | LGS 2027 şablonu seed değil **migration** (`faz2_lgs_2027_template`): sabit UUID'ler, `on conflict do nothing`, mevcut öğrencilere atama aynı dosyada | Bulutta seed çalışmaz; `supabase db push` ile şablon canlıya gitmeli; tekrar çalışsa çift kayıt olmamalı | `supabase/seeds/*.sql`, dashboard'dan elle giriş |
| 28 | 2026-09 | Sistem şablonu (`organization_id null`) herkese okunur ve **koç/owner tarafından düzenlenebilir**; kurum şablonu yalnızca kendi kurumuna. `students.curriculum_template_id` FK'lı ama nullable (form zorunlu tutar) | Tek kurum ölçeğinde en basit çözüm; çok kurum olursa kopyalama (`based_on_id`) gelir. Fixture/RPC sadeliği için nullable | Sistem şablonu salt okunur + kuruma kopya; `not null` + sabit default |
| 29 | 2026-09 | Konu haritası yalnızca **ünite düzeyi** konuları (parent_id boş) gösterir; alt konular şablon editöründe girintili, ilerleme ünite düzeyinde | Tasarımdaki hücre sayısı (Matematik 12) ve sade harita; alt konu ayrıntısı Faz 3+ kayıtlarında kullanılır | Yaprak konuları göstermek, iki seviyeli harita |
| 30 | 2026-09 | Konu hücresi detayı `ResponsiveSheet` (telefonda alt panel, masaüstünde ortada diyalog); tasarımdaki sağ yan panel yapılmadı. Hücre durumları `.topic-cell` CSS sınıfları (globals.css) ile, ders rengi `subjectVars` | Tek bileşen, ek yerleşim yok; desenler beyaz yarı saydam olduğu için ders rengine otomatik uyar | Masaüstünde ayrı sağ panel; Tailwind arbitrary gradient sınıfları |
| 31 | 2026-09 | `FormError` `components/shared`'a taşındı (çekirdek yeniden dışa açar) | İstemci bileşenleri `@/features/core` index'ini import edemez (sunucu kodu taşır); diğer modüllerin istemci formları ortak bileşene ihtiyaç duyar | Her modülde kopya |
| 32 | 2026-09 | `goals` sadeleştirildi: `goal_metric` yalnızca `questions`, `goal_period` `daily`/`weekly`; öğrenci başına dönem başına tek aktif hedef (kısmi tekil indeks `(student_id, period) where is_active`); hedefi yalnızca koç/owner yazar; ilerleme saklanmaz, `v_student_daily_summary`'den uygulamada hesaplanır (`private.goal_progress` yok) | Pilot ölçeğinde en basit çalışan çözüm; enum'a değer eklemek (`alter type … add value`) geriye uyumlu | 03'teki tam enum kümesi, `goal_progress` fonksiyonu |
| 33 | 2026-09 | Bugün kartları: `ModuleWidgets.studentToday` dizi (bir modül birden fazla kart) + `column: main \| side`; sayfa masaüstünde iki sütun çizer, telefonda `order` sırası | 04 §8.2 iki sütun (solda "bugün ne yapacağım", sağda "neyi kaçırıyorum"); kartlar elle yazılmaz | Tek kart/modül, CSS grid otomatik yerleşim |
| 34 | 2026-09 | Hızlı kayıtta son ders/konu `localStorage` (`pusula:quick-log:last`), sheet açılırken güncel seçeneklerde yoksa yok sayılır; form yalnızca istemcide kurulduğu için lazy `useState` ile okunur | Sunucu tarafı gerekmez; cihaz başına hatırlama yeterli | `students` tablosunda kolon, cookie |
| 35 | 2026-09 | `curriculum_templates.exam_date`: yeni öğrenci formunun sınav tarihi varsayılanı seçili şablondan (LGS 2027 → 2027-06-13, migration ile) | Tarih koda gömülmez; yeni sezon şablonu kendi tarihini taşır | `config/constants` sabiti |
| 36 | 2026-09 | Net ve seri saf fonksiyon (`lib/exam/net`, `lib/dates/streak`), veritabanı fonksiyonu yok; `wrong_penalty` şablon `scoring`'inden. "Bugün" her yerde İstanbul: SQL'de `(now() at time zone 'Europe/Istanbul')::date` (`current_date` yasak), TS'te `lib/dates`; `question_logs.log_date` sunucuda atanır, gelecek tarih zod + check ile reddedilir | Birim testlenebilir, kural tek yerde; UTC sunucuda gün kayması olmaz | `public.student_streak` RPC, istemciden tarih |
| 37 | 2026-09 | Görünümler `with (security_invoker = true)`, `authenticated`'a yalnızca `select`; `090_schema_guards` her `public` görünümü için bunu denetler. Modüller arası veri (konu istatistiği, koç listesi) görünümle | RLS alttaki tablodan uygulanır; koç listesi tek sorgu (N+1 yok) | Security definer görünüm, modülün diğer modülün tablosunu doğrudan okuması |
| 38 | 2026-09 | Faz 4 plan sistemi kararları `08-faz4-plan-sistemi.md` §6'da (A1–A13): dnd-kit (`@dnd-kit/core`, `sortable`, `utilities`) eklendi; uyarı kuralları TS'te olgu görünümü üzerinden; kopyalamada hedefte plan varsa sona eklenir; yayınlanmış plan canlı düzenlenir; erteleme `max(gün+1, bugün)`; değerlendirme cumartesi→hafta sonu; koç plan ekranı sekme + `/coach/plans`; `plan_item_kind` 5 değer | Tek belgede, parça oturumları verili kabul eder | Belgede listelenen alternatifler |
| 39 | 2026-09 | Öğrencinin plan yazmaları (tamamla, geri al, ertele, not, değerlendirme) yalnızca security definer RPC ile; tabloda öğrenci UPDATE politikası yok (03 §5.3 seçenek (a)). Soru türü görev hızlı kayıt sheet'inden `complete_plan_item(p_log)` ile tek transaction'da tamamlanır; `useQuickLog` context'i `components/shared`'a taşındı | Koşula bağlı kolon kısıtı (yalnızca yayınlanmış plan, bir kez erteleme) politikayla ifade edilemez; planner istemci bileşeni question-log index'ini import edemez (karar #31 kalıbı) | Tetikleyiciyle kolon denetimi; iki ayrı yazma |
| 40 | 2026-09 | Plan oluşturucu: yerel arabellek yok, her değişiklik kendi Server Action'ı (otomatik kayıt = son başarılı eylem); 8 sütun (7 gün + "Bu hafta içinde") havuz kapalıyken 1440 px'e kaydırmasız sığar, havuz açıkken yatay kayar; havuz ilk açılışta kapalı, tercih `localStorage`'da; < 768 salt okunur. `created_by` kolonları (program, plan) nullable + `on delete set null` | Koç yan menüsüyle 1440 px'te 8 sütun sığmıyor; öğrenci kendi satırını yazınca `not null` FK cascade silmeyi engelliyordu | Toplu kaydet düğmesi; 04 §8.4'teki 1280/1440 eşikleri |
| 46 | 2026-09 | Faz 5c strateji farkındalığı: öneri motoru imzaları değişmedi, strateji isteğe bağlı parametre (`buildSuggestions.strategy`, `priorityScore` ek alanlar; verilmezse Faz 4 sonucu birebir); strateji bağlamı (`StudentStrategy`) sorgu katmanında kurum ayarı + `students.exam_date` + gidişat görünümlerinden kurulur (`getStrategyContext`, React `cache`; `getSuggestions` çağıran her yer aynı bağlamı alır), tablo/görünüm eklenmedi; dönem karışımı kotası `lib/strategy/mix.ts: allocateByMix` (en büyük kalan; dolmayan kota puana açılır, dönem yoksa kota yok); sınav yakınlığı çarpanı `1 ± 0,25 × yakınlık` (yeni konu −, zayıf/bakım +), gecikme `max(uyarı, hedef)`, ders `× (1 + soru açığı)`; `distributeTasks` ders çeşitliliği (aynı dersten en az olan gün, sonra kapasite) ve `date` anahtarı (çok haftalık ufuk için kanca, tek hafta kullanımı sürer); `strategyNote` satır metni saf katmanda üretilir, arayüz ve havuz aynı metni gösterir; dönem satırı `SuggestionList`'e `period` prop'uyla gelir | 09 §2 Parça 3, karar B9; 08 §5 kancaları imza değiştirmeden dolduruldu; karar #42 saf katman kalıbı | Strateji bağlamı için yeni görünüm; ağırlıkları dönemle değiştirmek; dönem satırını bileşenin kendisinin okuması (analytics → core çalışma zamanı bağı) |
| 45 | 2026-09 | Faz 5b hedef ve geri planlama: konu hedef tarihleri `student_topic_targets`'ta saklı çıpa (her açılışta hesaplanmaz), `set_student_targets` security definer tek transaction (`students.topics_finish_by / target_starts_on` kolon grant'sız → niyet RPC'de); geri planlama / dağıtım / gerçekçilik / gidişat saf (`src/lib/strategy/back-plan, split, feasibility, pace`), `backPlanTopics` istemcide hesaplanıp önizlemeden sonra RPC'ye gider; "Hedef" sekmesi `goals` modülünün `coachStudentTabs` girdisi (`dependsOn` + topics); uyanık aralık `students.wake_*` nullable, `getWakeWindow` kurum ayarına düşer (imza aynı); öğrenci Bugün kartı topics'te genişler ve `v_student_pace_facts` ile okur (goals'u import etmez); K1 "Takvim" sütunu overview görünümünden; `lib/format.formatPossessive` ("9'u") | 09 §1.4, kararlar B4–B7, B10, B13, B16; görünümle modüller arası okuma (#37); saf katman iki modülün ortak malı | Her açılışta yeniden hesap; ayrı `strategy` modülü; haftalık hedefin otomatik güncellenmesi |
| 44 | 2026-09 | Faz 5a okul takvimi ve dönemler: `topics.school_finish_on date` (şablon düzeyi tek takvim; hafta olarak gösterilir, toplu doldurma pazartesi yazar), sezon dönemleri `organizations.settings.strategy.periods` JSON (liste editörü ayar formunda; varsayılanlar migration'a değil `lib/strategy/periods.ts: suggestSeasonPeriods` önerisine), `behind_school` uyarı türü (bitmemiş konuların hepsi, tolerans `strategy.school_lag_weeks`; öğrenci Bugün kartında gösterilmez, K1/K2/havuzda görünür). Saf strateji fonksiyonları `src/lib/strategy/` (yapısal tip, `features/*` import etmez). `evaluateTopicAlerts` eşik nesnesi `AlertThresholds = alerts & {school_lag_weeks}` (`alertThresholds(settings)`); `behind_school.idleDays` = okulun bitirmesinden bu yana gün (sebep metni "N hafta önce") | 09 §1.3 tartışması (tarih vs göreli hafta), B1–B3, B8, B14, B17; `analytics` dönem karışımını Parça 3'te kullanacak, kural ve etiketler şimdiden tek enum'da (`suggestion_dismissals.kind` çalışır) | `season_periods` tablosu (RLS + pgTAP); göreli hafta numarası + ara tatil eşlemesi; yalnızca `not_started` konularda okul uyarısı |
| 43 | 2026-09 | e2e üretim derlemesine karşı koşar: `webServer` `pnpm e2e:server` (`next build && next start -p 3100`, açıksa yeniden kullanılır); yalnızca `/dev/design` testleri `design-desktop` / `design-mobile` projeleriyle dev sunucusuna (3000). Playwright rol adı eşleşmesi aksan düşürerek alt dize aradığı için kısa düğme adları `exact: true` ("Sil" ⊂ "Olasılığı") | Ölçüm (4 paralel oturum, giriş → plan → K1 → çıkış): dev sunucusu oturum başına ~45 s (tek işlem, CPU'ya bağlı derleme + React dev render), üretim ~2,4 s; dev'de 4 işçi 60 s test bütçesini aşıyor, "çıkış/giriş zamanlaması" gibi görünen kararsızlık bundandı (oturum karışması yok: `signOut` başka bağlamın oturumunu düşürmüyor, bağlamlar test başına ayrı) | İşçi sayısını düşürmek; zaman aşımlarını büyütmek |
| 42 | 2026-09 | Öneri motoru: `buildSuggestions` / `priorityScore` / `distributeTasks` saf, analytics'te; `distributeTasks` müsait süreyi yapısal tip (`DistributeDay`) olarak alır, schedule'ı import etmez; "Plana ekle" ve "Önerilen planı hazırla" planner istemci bileşenleridir, sayfalar analytics listelerinin `action` yuvasına takar; reddetme `dismissed_until` tarihi `today` ile saf fonksiyonda karşılaştırılır (sorgu da süresi geçenleri eler); `taskTitle` `lib/plan`'a taşındı (planner ve analytics ortak) | Bağımlılık yönü `planner → analytics`, tersi yok (08 §0); başlık üretimi tek yerde, iki modül de features import etmeden erişir | Öneri görevinde başlığı boş bırakıp sunucuda üretmek (liste ve havuzda gösterilemezdi); `analytics → planner` import |
| 41 | 2026-09 | Konu uyarıları: `v_topic_alert_facts` yalnızca olgu verir, karar `features/analytics/lib/alerts.ts` saf fonksiyonunda (eşikler `organizations.settings.alerts`'ten parametre, `today` İstanbul günü); `analytics` modülünün nav/sekmesi yok, K1 bölümü + Konular sekmesi + Bugün kartı + havuz kategorileriyle görünür. Modüller arası saf yardımcı (`planner/lib/alert-pool.ts`) analytics'ten yalnızca **tip** alır, `alertReason` sayfadan parametre gelir | Vitest ile her kural test edilir, SQL'de jsonb eşik mantığı hantal; feature index'i sunucu kodu taşıdığı için çalışma zamanı import istemci bileşeninde ve birim testte kırılır (karar #31 kalıbı) | Karar SQL görünümünde; `features/analytics/lib` derin import |
