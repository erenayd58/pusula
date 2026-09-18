# Faz 4: Plan Sistemi Tasarımı

> Faz 4'ün dört parçasının (program, plan, konu uyarıları, öneri motoru) ortak tasarım belgesi. Veri modeli bölümü onaylandığında `03-veri-modeli.md` §4.4'ün yerine geçer; parça oturumları bu belgeyi okuyarak başlar. Belge ile kod çelişirse dur ve sor. Ölçek kuralı: tek koç, birkaç öğrenci; RLS tavizsiz, gerisi en basit çalışan çözüm.
>
> **Durum:** dört parça da uygulandı (2026-09-17/18; ✅ notları ilgili bölümlerde). Uygulamayla farklar bölüm sonlarındaki notlarda; ekran görüntüleri `docs/tasarim/uygulama-4/`. Faz 5 §5'teki kancaları imza değiştirmeden genişletir.

## 0. Özet ve parça sırası

| Parça | Modül | Ne bitirir | Dal |
|---|---|---|---|
| 1 | `schedule` | Sabit meşguliyetler, istisnalar, müsait süre hesabı, kurum ayarları altyapısı | `faz-4a-program` |
| 2 | `planner` | Haftalık plan tabloları + RPC'ler, koç plan oluşturucu, öğrenci plan ekranı, Bugün kartı, plan uyumu, yazdırma | `faz-4b-plan` |
| 3 | `analytics` (uyarılar) | Konu uyarı kuralları (saf), `v_topic_alert_facts`, koç "Dikkat gerektirenler", zayıf konular, öğrenci nötr kart, ayar formu | `faz-4c-uyarilar` |
| 4 | `analytics` (öneriler) | Öneri motoru, önem puanı, "Plana ekle", "Önerilen planı hazırla", reddetme hafızası, görev havuzu tam | `faz-4d-oneriler` |

Bağımlılık yönü (import): `planner → analytics`, `planner → schedule`, `planner → question-log` (yalnızca paylaşılan context), `analytics → schedule` **yok** (müsait süre planner'dan saf fonksiyona parametre gider), `analytics → planner` **yok** (döngü olmasın; "Plana ekle" düğmesi planner'ın istemci bileşenidir, sayfa onu analytics listesine `action` yuvası olarak verir). Modüller arası okuma görünümlerle.

Faz 4 kapsam dışı (01 §11'den fark): `plan_templates`, `meetings` tabloları yapılmaz; `coach-notes` ve `announcements` modülleri bu belgeye dahil değildir (ayrı planlanır).

## 1. Veri modeli (03 §4.4'e eklenecek hali)

### 1.1 Enum'lar

```sql
create type busy_slot_kind   as enum ('school', 'tutoring_center', 'private_lesson', 'course', 'other');
create type plan_status      as enum ('draft', 'published');
-- 03'teki tam liste yerine Faz 4 değerleri; Faz 7'de `alter type … add value 'section'`, `'video'` (karar #32 kalıbı)
create type plan_item_kind   as enum ('topic_study', 'questions', 'review', 'link', 'custom');
create type topic_alert_kind as enum ('knowledge_gap', 'low_accuracy', 'review_due', 'forgetting_risk',
                                      'stale', 'not_started', 'neglected_subject');
```

Türkçe etiketler `src/content/labels.ts`: `busySlotKindLabels` (Okul, Dershane, Özel ders, Kurs, Diğer), `planStatusLabels` (Taslak, Yayınlandı), `planItemKindLabels` (Konu çalışması, Soru, Tekrar, Bağlantı, Serbest), `topicAlertKindLabels` (Bilgi eksiği, Düşük başarı, Tekrar zamanı, Unutma riski, Soğumuş konu, Başlanmamış, İhmal edilen ders).

### 1.2 Kurum ayarları (`organizations.settings`, Parça 1)

Eşikler ve varsayılanlar koda gömülmez; migration mevcut kurumlara varsayılanları yazar (`settings = defaults || settings`, mevcut anahtar kazanır) ve kolon varsayılanını aynı JSON yapar. Uygulama `features/core/lib/org-settings.ts` zod şemasıyla okur (`getOrgSettings()`, React `cache`); şemadaki `.default()` değerleri yalnızca eksik anahtar güvencesidir.

```json
{
  "schedule": { "wake_start": "08:00", "wake_end": "22:00" },
  "planner": {
    "minutes_per_question": 1.5,
    "topic_study_minutes": 40, "review_minutes": 20, "link_minutes": 15, "custom_minutes": 30,
    "questions_target": 20,
    "day_capacity_ratio": 0.7, "max_items_per_subject_per_day": 2
  },
  "alerts": {
    "lookback_days": 60,
    "knowledge_gap":   { "min_questions": 40, "max_accuracy": 55 },
    "low_accuracy":    { "min_questions": 20, "max_accuracy": 60 },
    "review_due_days": [7, 15, 30],
    "forgetting_risk": { "min_accuracy": 60, "idle_days": 21 },
    "stale_days": 45,
    "neglected_subject_days": 10,
    "setup_account_days": 7
  },
  "suggestions": { "max_per_student": 5, "dismiss_days": 14 }
}
```

`review_intervals` (Faz 6 tekrar modülü) ayrı anahtar olarak kalır; `alerts.review_due_days` Faz 4'ün basit kuralıdır (bkz. §5 Faz 5/6 kancası). Ayarları owner düzenler (`organizations` UPDATE politikası zaten owner'da; Parça 3'te `/coach/settings` formu, karar A5).

### 1.3 Parça 1: Haftalık program

```sql
busy_slots (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),   -- 1 = pazartesi
  starts_at time not null,
  ends_at time not null,                     -- check (ends_at > starts_at); gece yarısını aşan aralık yok
  kind busy_slot_kind not null default 'other',
  note text,                                 -- 'Matematik dershanesi'
  created_by uuid references profiles(id) on delete set null,   -- öğrenci kendi satırını yazabilir; profil silinince satır kalır
  created_at, updated_at
)
-- index (student_id, day_of_week)

schedule_exceptions (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  on_date date not null,
  starts_at time, ends_at time,              -- ikisi de null = tüm gün; check: ikisi birlikte null ya da dolu ve ends > starts
  title text not null,                       -- 'Yazılı: Fen', 'Okul gezisi'
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at, updated_at
)
-- index (student_id, on_date)
```

RLS (standart öğrenci verisi kalıbı, 03 §5.2): öğrenci S I U D (kendi), koç S I U D, veli S, owner tümü. `created_by = (select auth.uid())` insert with check'te. Tablo yetkisi: `authenticated` S I U D. `created_by` `not null` değildir: öğrenci kendi satırını yazdığı için `auth.users` cascade silmesinde profil FK'sı engel olurdu (`110_cascade` testi). ✅ Parça 1 uygulandı (2026-09-17).

### 1.4 Parça 2: Haftalık plan

```sql
weekly_plans (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  created_by uuid references profiles(id) on delete set null,
  status plan_status not null default 'draft',
  coach_message text,
  student_reflection text,                   -- "Haftam nasıl geçti?"
  published_at timestamptz,
  created_at, updated_at,
  unique (student_id, week_start)
)

plan_items (
  id uuid pk,
  plan_id uuid not null references weekly_plans(id) on delete cascade,
  day_of_week smallint check (day_of_week between 1 and 7),   -- NULL = "bu hafta içinde"
  sort_order smallint not null default 0,
  kind plan_item_kind not null,
  title text not null,                       -- otomatik üretilir, koç düzenler
  subject_id uuid references subjects(id),
  topic_id uuid references topics(id),
  url text,                                  -- kind = 'link'; check (kind <> 'link' or url ~ '^https?://')
  target_value int check (target_value > 0), -- soru sayısı ya da dakika
  target_unit text check (target_unit in ('questions', 'minutes')),
  estimated_minutes int not null check (estimated_minutes between 1 and 600),
  completed_at timestamptz,
  student_note text check (char_length(student_note) <= 200),
  postponed_from smallint check (postponed_from between 1 and 7),
  postponed_at timestamptz,                  -- dolu = bir kez ertelendi; ikinci erteleme yok
  created_at, updated_at
)
-- index (plan_id, day_of_week, sort_order), (subject_id), (topic_id)
-- Faz 7: section_id, video_id kolonları ve enum değerleri eklenir (kolon şimdi yok)

alter table question_logs add column plan_item_id uuid references plan_items(id) on delete set null;
create index question_logs_plan_item_id_idx on question_logs (plan_item_id);
-- plan_item_id dolu kayıtta source = 'plan' (uygulama yazar)
```

**Yardımcılar (`private`, security definer, `set search_path = ''`):**

- `private.plan_student(p_plan_id) returns uuid` — planın öğrencisi.
- `private.can_read_plan(p_plan_id) returns boolean` — `can_read_student(öğrenci) and (status = 'published' or is_coach_of(öğrenci))`.
- `private.can_write_plan(p_plan_id) returns boolean` — `is_coach_of(öğrenci)`.

**RLS:**

| Tablo | Öğrenci | Koç | Veli | Owner |
|---|---|---|---|---|
| `weekly_plans` | S (yalnızca `published`); reflection yazma RPC ile | S I U D (`is_coach_of`; insert `created_by` kendisi) | S (`published`) | Tümü |
| `plan_items` | S (`can_read_plan`); tamamlama/not/erteleme RPC ile | S I U D (`can_write_plan`) | S (`can_read_plan`) | Tümü |

Tablo yetkisi her ikisinde `authenticated` S I U D (politikalar daraltır; öğrencinin doğrudan UPDATE'i politikayla 0 satır etkiler, kolon kısıtı 03 §5.3 seçenek (a) ile RPC'de). Ek yardımcı: `private.can_act_on_plan(p_plan_id)` = öğrenci kendi yayınlanmış planı ya da koç (RPC yetki kontrolü). ✅ Parça 2 uygulandı (2026-09-17); sütun düzeni: havuz kapalıyken 8 sütun 1440 px'e kaydırmasız sığar (min 112 px, gün başlığı iki satır "Müsait / Planlı", kart eylemleri metnin altında), havuz açıkken (320 px, başlık en fazla 2 satır) sütunlar 160 px ve yatay kayar; havuz ilk açılışta kapalı, tercih cihazda (`localStorage`, 02 karar #40).

**RPC'ler (Parça 2, migration `faz4b_plan_rpcs`):**

| Fonksiyon | Tür | Ne yapar |
|---|---|---|
| `complete_plan_item(p_item_id uuid, p_note text default null, p_log jsonb default null)` | security definer; yetki: öğrenci kendi **yayınlanmış** planı ya da koçu | `completed_at = now()`; `p_log` doluysa (`subject_id, topic_id, correct, wrong, blank, duration_minutes`) `question_logs`'a `plan_item_id` + `source = 'plan'` ile kayıt açar. Tek transaction. Döner: `{item_id, log_id}` |
| `uncomplete_plan_item(p_item_id uuid)` | security definer, aynı yetki | `completed_at = null`; bağlı `question_logs.plan_item_id = null` yapar (kayıt silinmez). Döner: `{unlinked_logs int}` → arayüz "Soru kaydın duruyor, sadece görevle bağı kaldırıldı." |
| `postpone_plan_item(p_item_id uuid)` | security definer, aynı yetki | `postponed_at is null` ve tamamlanmamış olmalı; `postponed_from = day_of_week`; hedef gün `greatest(day_of_week + 1, bugünün_isodow)`, 7'yi aşarsa `null` (karar A6); `day_of_week` zaten `null` ise hata `cannot_postpone` |
| `set_plan_item_note(p_item_id uuid, p_note text)` | security definer, öğrenci/koç | `student_note` (≤ 200) |
| `set_plan_reflection(p_plan_id uuid, p_text text)` | security definer, öğrenci/koç | `student_reflection`; hafta kapandıysa (`week_start + 7 <= İstanbul bugünü`) `week_closed` hatası (karar A9) |
| `move_plan_item(p_item_id uuid, p_day smallint, p_index int)` | **security invoker** (RLS: koç) | Günü değiştirir ve hedef gündeki `sort_order`'ı yeniden numaralar (`move_topic` kalıbı) |
| `copy_weekly_plan(p_source_plan_id uuid, p_target_student_ids uuid[], p_week_start date, p_only_incomplete boolean default false)` | security definer; her hedef için `is_coach_of` | Hedefte plan yoksa **taslak** açar; varsa öğeler mevcut planın sonuna **eklenir** (karar A3). Öğeler `completed_at/student_note/postponed_*` sıfırlanmış kopyalanır (`p_only_incomplete` ile yalnızca tamamlanmamışlar; "tamamlanmayanları yeni haftaya aktar" ve "geçen haftayı kopyala" bunu kullanır). Döner: `{copied: [{student_id, plan_id, existing_items, added_items}]}` |

Yayınlama RPC gerektirmez: koç `status = 'published', published_at = now()` günceller (RLS). Taslak oluşturma: `weekly_plans` `insert … on conflict do nothing` + select (tek tablo); koç mesajı da boş haftada yazılır ve plan yoksa aynı yolla taslak açar (kapanış düzeltmesi; `setCoachMessage` hafta anahtarıyla gelir). Toplu görev ekleme (çoklu gün çipleri, "Önerilen planı hazırla"): `plan_items` tek `insert` ifadesi (çok satır, tek tablo → atomik, RPC yok).

**Görünümler (Parça 2, `faz4b_plan_views`, hepsi `security_invoker`):**

| Görünüm | Kolonlar | Kullanım |
|---|---|---|
| `v_plan_completion` | student_id, plan_id, week_start, status, items_total, items_completed, postponed_count (`postponed_at` dolu öğe sayısı), percent (int, `items_total = 0` → null), to_date_total / to_date_completed / to_date_percent (kapanış düzeltmesi: "bugüne kadar") | Plan uyumu; K2 kutusu "bugüne kadar 5 görevin 4'ü · hafta geneli %57 (7 görevin 4'ü)"; koç plan başlığı ve K2 kutusunda nötr satır "2 görev ertelendi" (0 ise satır yok) |
| `v_student_subject_pace` | student_id, subject_id, questions, minutes, minutes_per_question (son `alerts.lookback_days`; `duration_minutes` dolu kayıtlar) | Tahmini süre önerisi |
| `v_week_plan_topics` | student_id, week_start, subject_id, topic_id | Öneri motoru "bu hafta zaten planlı" |
| `v_coach_student_overview` (replace) | + `plan_percent_week`, `plan_items_week`, `plan_done_week`, `plan_percent_last_week` (İstanbul haftası, yalnızca `published`) | K1 listesi "Plan uyumu" |

**Plan uyum yüzdesi tanımı:** iki değer. *Hafta geneli* `items_completed / items_total` (gün atanmamış "bu hafta içinde" görevleri dahil). *Bugüne kadar* (kapanış düzeltmesi, 2026-09-18): bugün ve öncesindeki günlerin görevleri + tamamlanmış "bu hafta içinde" görevleri (henüz yapılmamış gün atanmamış görev gecikmiş sayılmaz); geçmiş haftada iki değer eşittir, gelecek haftada bugüne kadar `null`. İkisi de yalnızca yayınlanmış plan; öğe yoksa `null` ("—"). K1 sütununda bugüne kadar öne, hafta geneli ikincil ("hafta %57"); K2 kutusunda ikisi de. Erteleme yüzdeyi **etkilemez**; `postponed_count` ayrı, bilgi amaçlı bir sayaçtır. 01 §7 "Plan uyumu düşük" uyarısı (Faz 8) geçen haftayı kullanır.

**Öğrenci değerlendirmesi (karar A9):** "Haftam nasıl geçti?" alanı o haftanın cumartesi 00:00'ından (İstanbul) itibaren açılır ve hafta bitene kadar (pazar 23:59) düzenlenebilir; hafta kapandıktan sonra salt okunur (`set_plan_reflection` de `week_start + 7 > bugün` koşulunu denetler; geçmiş hafta → `week_closed` hatası). Koç her zaman okur.

### 1.5 Parça 3: Konu uyarı olguları

Kurallar TypeScript'te (saf, birim testli); görünüm yalnızca **olguları** verir, karar vermez (karar A2). Ünite düzeyi konular (karar #29), öğrenci × konu başına bir satır.

```sql
v_topic_alert_facts (
  student_id, organization_id, coach_id,
  subject_id, subject_name, subject_short_name, subject_color, subject_sort_order, exam_question_count,
  topic_id, topic_name, topic_sort_order,
  status topic_status,          -- satır yoksa 'not_started'
  status_changed_at,            -- student_topic_progress.updated_at
  completed_at, last_reviewed_at,
  questions_window int, correct_window int,   -- son alerts.lookback_days (kurum ayarından okunur)
  last_topic_log_date date,
  subject_last_log_date date,   -- dersin herhangi bir konusundaki son kayıt
  is_next_topic boolean         -- dersin sort_order'a göre ilk not_started konusu
)
```

Satır sayısı: öğrenci × ~54 ünite; koç ana ekranı için tek sorgu (tüm öğrenciler) bu ölçekte yeterli. Okuma `features/analytics/server/queries.ts: getTopicAlertFacts(studentIds?)`. ✅ Parça 3 uygulandı (2026-09-18): ek kolon `student_first_log_date date` (derste hiç kayıt yoksa ihmal süresi öğrencinin ilk kaydından sayılır; öğrencinin hiç kaydı yoksa ihmal uyarısı üretilmez); `topic_alert_kind` enum'u bu migration'da (`faz4c_topic_alert_facts`) tanımlandı; analiz modülü kapatılan öğrenciler sorgu katmanında (`student_modules`) dışarıda bırakılır.

### 1.6 Parça 4: Reddetme hafızası

```sql
suggestion_dismissals (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  dismissed_by uuid not null references profiles(id),
  subject_id uuid not null references subjects(id),
  topic_id uuid references topics(id),       -- ders düzeyi öneride null
  kind topic_alert_kind not null,
  dismissed_until date not null,             -- bugün + suggestions.dismiss_days (sunucu hesaplar)
  created_at,
  unique nulls not distinct (student_id, subject_id, topic_id, kind)
)
```

RLS: koç S I U D (`is_coach_of`, `dismissed_by` kendisi), owner tümü, öğrenci/veli yok. Upsert ile yenilenir; süresi geçen satır temizlenmez, filtrede `dismissed_until >= bugün`. ✅ Parça 4 uygulandı (2026-09-18): `dismissed_by` ve `subject_id`/`topic_id` FK'ları `on delete cascade` (koç profili silinince hafızası gider, `110_cascade` engellenmez).

### 1.7 pgTAP

| Dosya | Kapsam |
|---|---|
| `170_schedule.test.sql` | `busy_slots`, `schedule_exceptions`: 5 senaryo + check'ler (ends > starts, istisna null çifti) |
| `180_weekly_plans.test.sql` | İki tablo 5 senaryo; öğrenci taslağı **göremez**, yayınlananı görür; öğrenci doğrudan UPDATE → 0 satır; veli yalnızca yayınlanan |
| `185_plan_rpcs.test.sql` | complete (log'lu/log'suz), uncomplete bağ koparma, postpone bir kez/son gün/null hata, taslakta öğrenci tamamlayamaz, copy (yetki, only_incomplete), move sıralama |
| `190_topic_alert_facts.test.sql` | Görünüm RLS (koç kendi öğrencisi), lookback ayardan, `is_next_topic` |
| `195_suggestion_dismissals.test.sql` | 5 senaryo + `unique nulls not distinct` |
| `090_schema_guards` | Yeni tablo/görünüm satırları; `question_logs` kolon listesi değişmez (tablo düzeyi grant) |

## 2. Parça sınırları

### Parça 1: Haftalık program (`schedule`)

**Dosyalar**

- Migration: `faz4a_org_settings` (§1.2), `faz4a_schedule` (§1.3 + grant + politikalar); test `170`; `090` satırları; `pnpm db:types`.
- `features/core/lib/org-settings.ts` (zod şema + tip), `features/core/server/queries.ts: getOrgSettings()`; core index'ten dışa açılır.
- `features/schedule/`: `module.ts` (id `schedule`, ad "Program", `defaultEnabled: true`, nav yok; koç sekmesi `schedule` "Program" order 45), `index.ts`, `schemas.ts` (slot/istisna), `types.ts`, `lib/availability.ts` + test, `server/queries.ts` (`getWeekSchedule(studentId, weekStart)` → slotlar + istisnalar; `getWeekAvailability(studentId, weekStart)` → `DayAvailability[7]`), `server/actions.ts` (`upsertBusySlot`, `deleteBusySlot`, `upsertScheduleException`, `deleteScheduleException`; roller öğrenci/koç/owner, öğrenci yalnızca kendi), `components/schedule-editor.tsx` (istemci; tek sütun liste, gün başlıkları, `ResponsiveSheet` form, telefonda tek sütun), `components/availability-summary.tsx` (7 gün × müsait süre; planner gün başlığı da kullanır).
- Rotalar: `app/(student)/student/schedule/page.tsx` (+ loading/error; "Ben" sayfasından "Haftalık programım" bağlantısı), `app/(coach)/coach/students/[studentId]/schedule/page.tsx` (aynı editör, flat).
- `content/labels.ts`: `busySlotKindLabels`. e2e `schedule.spec.ts`: öğrenci meşguliyet ekler → koç görür, düzenler → müsait süre değişir.

**Müsait süre (saf):**

```ts
// features/schedule/lib/availability.ts
type Minute = number;                                  // gece yarısından dakika (0–1440)
type Interval = { start: Minute; end: Minute };
export function mergeIntervals(list: Interval[]): Interval[];            // sırala, çakışan/bitişikleri birleştir
export function clipToWindow(list: Interval[], window: Interval): Interval[];
export function availableMinutes(window: Interval, busy: Interval[]): number;
export type DayAvailability = {
  date: string; dayOfWeek: 1|2|3|4|5|6|7;
  busy: (Interval & { label: string; kind: BusySlotKind | "exception" })[];   // birleştirilmiş değil, gösterim için
  availableMinutes: number; allDayBusy: boolean;
};
export function availabilityForWeek(input: {
  weekStart: string; wake: Interval; slots: BusySlot[]; exceptions: ScheduleException[];
}): DayAvailability[];                                 // tüm gün istisna → 0; kısmi istisna → meşguliyet
```

Testler: çakışma birleştirme, uyanık aralık dışına taşan slot kırpma, tüm gün istisna, boş gün = uyanık süre, Faz 5 için saat çözünürlüğü değişmeden `wake` parametresinin öğrenci başına verilebilmesi.

**Kabul:** Öğrenci telefonda okul saatlerini girer, koç sekmesinde görür ve düzenler; yazılı istisnası girilen günün müsait süresi 0 olur (e2e); `pnpm check` + `pnpm db:test` yeşil.

### Parça 2: Plan oluşturucu ve öğrenci plan ekranı (`planner`)

**Dosyalar**

- Migration: `faz4b_weekly_plans`, `faz4b_plan_rpcs`, `faz4b_plan_views`; testler `180`, `185`; `090`; `db:types`.
- Bağımlılık (karar A1): `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` → 02 karar kaydı.
- `components/shared/quick-log-context.tsx`: `QuickLogContext`, `useQuickLog`, `QuickLogRequest` (question-log'dan taşınır; provider question-log'da kalır). `QuickLogRequest` `planItem?: { id, subjectId, topicId, targetValue }` alır; sheet ders/konu/hedef sayıyı ön doldurur, ders çipleri kilitlenmez.
- `features/question-log`: `createQuestionLogSchema` + `planItemId?`; action `planItemId` doluysa `rpc('complete_plan_item', {p_item_id, p_log})`, yoksa mevcut insert; `revalidate` listesine `/student/plan` eklenir.
- `features/planner/`: `module.ts` (mevcut), `index.ts`, `schemas.ts` (`planItemInputSchema`: kind, title, subject/topic, url, target, estimated, days `number[] | null[]`), `types.ts` (`PlanItem`, `WeekPlan`, `TaskPoolItem`, `TaskPoolCategory`), `lib/estimate.ts` (+test), `lib/plan-summary.ts` (gün/hafta toplamı, uyum yüzdesi, gün başına aşım; +test), `lib/task-title.ts` (otomatik başlık: "Üslü İfadeler · 40 soru"; +test), `lib/pool.ts` (havuz kategorilerini kurar; Parça 2'de yalnızca `frequent` kategorisi dolu, diğer kategori kimlikleri boş dizi), `server/queries.ts` (`getWeekPlan(studentId, weekStart)`, `getPlanForStudent` (yayınlanmış), `getTodayPlanItems`, `getFrequentTasks(coachId)`, `getPlanCompletion`, `listCoachPlans(weekStart)`), `server/actions.ts` (`ensureDraft`, `addPlanItems` (çoklu gün), `updatePlanItem`, `deletePlanItem`, `movePlanItem` → RPC, `publishPlan`, `setCoachMessage`, `copyPlan` → RPC, `carryOverIncomplete` → RPC, öğrenci: `completeItem`, `uncompleteItem`, `postponeItem`, `setItemNote`, `setReflection`), `widgets.ts` (`PlanTodayWidget`, main, order 15).
- Bileşenler: koç `plan-builder.tsx` (istemci; dnd-kit `DndContext` + `PointerSensor` + `KeyboardSensor`, 7 gün + "Bu hafta içinde" sütunu, 1280 px altında yatay kaydırma, < 768 salt okunur notu), `day-column.tsx` (başlık: tarih, meşguliyet etiketleri, müsait/planlanan süre; aşımda nötr metin "planlanan süre müsait süreyi aşıyor", engel yok), `plan-item-card.tsx` (koç: sürüklenebilir + menü: düzenle, başka güne taşı, "bu hafta içinde"ye taşı, sil; erteleme işareti), `plan-item-form.tsx` (`ResponsiveSheet`; tür, ders, konu, hedef, tahmini süre (öneri + düzenlenebilir), url, gün çipleri), `task-pool.tsx` (sol panel, kategori başlıkları, arama, sürüklenebilir öğe + "Güne ekle" düğmesi), `plan-header.tsx` (hafta seçici, taslak/yayınlandı + son kayıt saati, hafta toplamı, nötr "2 görev ertelendi" satırı (`postponed_count > 0` ise), "Geçen haftayı kopyala", "Başka öğrencilere kopyala", "Tamamlanmayanları aktar", "Yazdır", "Planı yayınla"), `copy-plan-dialog.tsx` (üç kopyalama eylemi için ortak onay penceresi: hedef öğrenci başına satır "Ayşe: 6 mevcut + 5 eklenecek" — mevcut sayı hedef haftanın `v_plan_completion.items_total`'ından, eklenecek sayı kaynak öğe sayısından (`only_incomplete` ise tamamlanmamışlar); onaydan sonra sonuç toast'ı "3 öğrenciye kopyalandı"), `coach-message-form.tsx`, `plan-empty-state.tsx` (boş hafta: plan yok ya da öğe yok → sütunların yerine `EmptyState` + üç eylem: "Geçen haftayı kopyala" (geçen hafta planı yoksa devre dışı + ipucu), "Önerilen planı hazırla" (Parça 2'de devre dışı + ipucu "Öneriler sonraki güncellemeyle geliyor", Parça 4'te aktif), "İlk görevi ekle" (görev formunu açar); görev havuzu boş haftada da soldadır ve sürükleme hedefi olarak gün sütunları boş durumun altında/yanında görünmeye devam eder — havuzdan sürüklenen ilk öğe boş durumu kapatır); öğrenci `student-plan.tsx` (gün seçici: işaretli günlerde nokta, bugün varsayılan; seçili gün listesi + toplam süre; "Bu hafta içinde" bölümü; koç mesajı kartı; `reflection-form.tsx`), `plan-task-card.tsx` (clay-md → tamamlanınca clay-sm + fosforlu onay; soru türünde `useQuickLog().open({planItem})`, diğerlerinde tek dokunuş; geri al; "Yarına ertele" (bir kez); not alanı; link türü yeni sekmede açılır), `plan-print-sheet.tsx` (`print:block`, 7 gün liste; diğer her şey `print:hidden`; `globals.css` `@media print` kuralları), `widgets/plan-today-widget.tsx`.
- Rotalar: `app/(coach)/coach/students/[studentId]/plan/page.tsx` (`?week=YYYY-MM-DD`, varsayılan bu hafta), `app/(coach)/coach/plans/page.tsx` (öğrenci listesi: bu haftanın plan durumu, uyum, "Planı aç"), `app/(student)/student/plan/page.tsx` (`?week=`; yalnızca yayınlanmış haftalar gezilir).
- `core/server/queries.ts: StudentListRow` + `planPercentWeek`; `StudentTable` "Plan uyumu" sütunu; K2 genel bakış: `PlanCompletionTile` (bu hafta / geçen hafta; altında nötr "2 görev ertelendi" satırı) + öğrencinin geçen hafta değerlendirmesi.
- Öğrenci `reflection-form.tsx`: cumartesiden hafta sonuna kadar düzenlenebilir, kapanan haftada salt okunur metin (karar A9).
- `content/labels.ts`: `planStatusLabels`, `planItemKindLabels`. e2e `plan.spec.ts` (masaüstü koç + mobil öğrenci): koç 2 güne soru görevi ekler → yayınlar → öğrenci Bugün kartında görür → tamamlar (hızlı kayıt ön dolu) → `question_logs.plan_item_id` dolu → koç ekranında tamamlandı + uyum %; geri alma mesajı; erteleme bir kez.

**Tahmini süre (saf):**

```ts
// features/planner/lib/estimate.ts
export function estimateMinutes(input: {
  kind: PlanItemKind; targetValue: number | null;
  pace: { minutesPerQuestion: number } | null;        // v_student_subject_pace (ders bazlı, 60 gün)
  defaults: OrgSettings["planner"];
}): number;
// questions: round(target * (pace ?? defaults.minutes_per_question)); topic_study/review/link/custom: defaults.*_minutes
```

**Otomatik taslak kaydı:** yerel arabellek yok; her ekleme/taşıma/düzenleme kendi Server Action'ıyla anında yazılır, başlık "son kayıt 14:02" son başarılı eylemin saatidir. Yayınlanmış plan da aynı şekilde düzenlenir (karar A4).

**Kabul:** 01 §11 Faz 4 kabulü (kopyalama 3 öğrenciye, tamamlanan görev koçta görünür) + e2e yukarıdaki akış; boş haftada EmptyState ve üç eylem görünür, "İlk görevi ekle" formu açar (e2e); kopyalama onayında mevcut/eklenecek sayılar doğru (e2e); ertelenen görev sayısı koç başlığında (e2e); klavyeyle görev taşıma (dnd-kit klavye sensörü) elle doğrulanır; yazdırma önizlemesinde yalnızca plan listesi.

### Parça 3: Konu uyarıları (`analytics`)

**Dosyalar**

- Migration `faz4c_topic_alert_facts` (görünüm + grant); test `190`; `090`; `db:types`.
- `features/analytics/`: `module.ts` (id `analytics`, ad "Analiz", `defaultEnabled: true`, `dependsOn: ["topics", "question-log"]`, nav/sekme yok), `index.ts`, `types.ts` (`TopicAlertFacts`, `TopicAlert`, `AlertGroup`), `lib/alerts.ts` (+test), `lib/nudge.ts` (+test), `server/queries.ts` (`getTopicAlertFacts(studentIds?)`, `getTopicAlerts(studentId | studentIds)` = olgular + ayar → saf fonksiyon), `components/attention-list.tsx` (koç: öğrenci, konu, sebep, `action` yuvası), `components/weak-topics.tsx` (öğrenci detayı Konular sekmesi: "Zayıf konular" ve "Bakım gerektirenler" iki ayrı liste), `components/widgets/topic-nudge-widget.tsx` (öğrenci Bugün, side, order 25; en fazla 1 kart, nötr dil, uyarı rengi yok), `widgets.ts`.
- `/coach/students` (K1) sayfasına "Dikkat gerektirenler" bölümü (Parça 3'te "Plana ekle" yerine "Öğrenciyi aç"; Parça 4 `action` yuvasına düğmeyi takar); Konular sekmesi sayfasına `WeakTopics`; planner görev havuzuna `weak`, `not_started`, `review_due` kategorileri (`getTopicAlerts` ile).
- `/coach/settings/page.tsx` + `features/core/components/org-settings-form.tsx` + `updateOrgSettings` action (owner; zod şema §1.2; karar A5).

**Kurallar (saf, eşikler parametre):**

```ts
// features/analytics/lib/alerts.ts
export function evaluateTopicAlerts(facts: TopicAlertFacts[], t: OrgSettings["alerts"], today: string): TopicAlert[];
// Konu başına en fazla bir uyarı, öncelik sırası:
//   knowledge_gap   : questions_window >= 40 && accuracy < 55
//   low_accuracy    : questions_window >= 20 && accuracy < 60
//   stale           : status ∈ {studying, needs_review} && status_changed_at 45+ gün önce
//   forgetting_risk : status ∈ {completed, mastered} && accuracy >= 60 (ya da soru yok) && son etkinlik 21+ gün önce
//   review_due      : status ∈ {completed, mastered}; geçilen en büyük eşik m ∈ review_due_days için
//                     completed_at + m gününden sonra konuda kayıt/tekrar yok
//   not_started     : is_next_topic
// Ders düzeyi (topic_id null): neglected_subject : subject_last_log_date 10+ gün önce (hiç kayıt yoksa öğrencinin ilk kaydından itibaren)
// accuracy = correct_window / questions_window (boş yanlış sayılır). Son etkinlik = greatest(last_topic_log_date, last_reviewed_at, completed_at).
export function groupAlerts(alerts: TopicAlert[]): { weak: TopicAlert[]; maintenance: TopicAlert[]; notStarted: TopicAlert[]; subjects: TopicAlert[] };
// weak = knowledge_gap, low_accuracy · maintenance = review_due, forgetting_risk, stale
export function alertReason(a: TopicAlert): string;   // "40 soruda %52 başarı" · "12 gündür bakılmadı"
```

```ts
// features/analytics/lib/nudge.ts — öğrenci Bugün kartı (karar A7)
export function pickStudentNudge(alerts: TopicAlert[]): TopicAlert | null;  // yalnızca maintenance + not_started; suçlayıcı dil yok
// Metin örnekleri: "Üslü İfadeler'e bir göz atma zamanı. 12 gündür bakmadın." · "Sırada Olasılık var, istersen bugün başla."
```

**Kurulum uyarıları (kapanış düzeltmesi, 2026-09-18; yalnızca koç):** `v_student_setup_facts` olguları + `evaluateSetupAlerts(facts, { setup_account_days }, today)` → `SetupAlert { studentId, kind }`; türler `no_schedule` (busy_slots ve schedule_exceptions boş), `no_goal` (aktif günlük/haftalık hedef yok), `no_plan` (bu hafta yayınlanmış plan yok), `no_logs` (hiç soru kaydı yok ve hesap `setup_account_days` günden eski). Soru kaydı olan öğrencide `no_schedule` / `no_logs` üretilmez, `no_goal` / `no_plan` kalır; kapalı modülün uyarısı üretilmez. K1 "Kurulum" bölümü (Dikkat ile Öneriler arasında, öğrenciye göre gruplu) ve K2 kartı; eylemler Program sekmesi, K2 `#goals`, Plan sekmesi, öğrenci sayfası. Öğrenci ekranında gösterilmez. Etiketler `setupAlertKindLabels`.

**Kabul:** Seed öğrencisinde (Ayşe, 14 günlük kayıt) en az bir uyarı üretilir ve koç listesinde görünür; eşik değiştirilince (ayar formu) sonuç değişir; öğrenci Bugün'de en fazla bir nötr kart; birim testleri her kural + öncelik + ders düzeyi için. ✅ Uygulandı (2026-09-18; e2e `alerts.spec.ts`). Notlar: K1 "Dikkat gerektirenler" (acil müdahale) ile "Öneriler" (plana eklenebilecekler) tek satır açıklama taşır; aynı öğrenci + konu + tür iki bölümde birden görünmez (dikkat öncelikli, sayfa öneri listesinden eler); öneriler öğrenci başına 3 açık, kalanı "Tümünü gör" (`details`; sorgu sınırı `max_per_student` ayrı). `TopicAlert` Parça 4 için `questions`, `accuracy`, `threshold`, `idleDays`, `delayDays` taşır (`review_due`'da `idleDays` son etkinlik, `delayDays` eşiği aşan gün); K1 listesi `not_started` türünü göstermez (dikkat gerektirmez), pasif/arşiv öğrenciler listeye girmez, ilk 6 satır açık gerisi `details`; havuz eşlemesi `features/planner/lib/alert-pool.ts` (analytics'ten yalnızca tip alır, sebep metni `alertReason` sayfadan parametre gelir): bakım türlerinin üçü `review_due` kategorisinde `review` görevi, ders düzeyi uyarı havuza girmez; ayar formu tek şema `orgSettingsFormSchema` (core `schemas.ts`), `revalidatePath` listesine `/coach/settings` eklendi.

### Parça 4: Öneri motoru (`analytics`)

**Dosyalar**

- Migration `faz4d_suggestion_dismissals`; test `195`; `090`; `db:types`.
- `features/analytics/lib/suggestions.ts` (+test), `lib/priority.ts` (+test), `lib/distribute.ts` (+test), `server/queries.ts: getSuggestions(studentIds?)` (uyarılar + `v_week_plan_topics` + `suggestion_dismissals` + `exam_question_count`), `server/actions.ts: dismissSuggestion` (koç), `components/suggestion-list.tsx` (gruplu: öğrenci → öneriler; `action` yuvası; "Şimdi değil").
- `features/planner`: `components/add-suggestion-button.tsx` (istemci; hafta = bu hafta, isteğe bağlı gün seçimi → `addPlanItems`; gün yoksa `null`), `components/prepare-plan-button.tsx` ("Önerilen planı hazırla": `getSuggestions` + `getWeekAvailability` + mevcut öğeler → `distributeTasks` → `addPlanItems`; yalnızca taslak/plan yok, karar A8), görev havuzu `suggestions` kategorisi en üstte.
- `/coach/students` "Öneriler" bölümü, K2 genel bakış "Öneriler" kartı; `AttentionList` `action` yuvasına `AddSuggestionButton`.

**Öneri (saf):**

```ts
// features/analytics/lib/priority.ts
export function priorityScore(input: {
  examQuestionCount: number; maxExamQuestionCount: number;    // ders ağırlığı 0–1
  delayDays: number;                                          // eşiği aşan gün sayısı, 30'da doyar
  kind: TopicAlertKind; accuracy: number | null; threshold: number | null;   // zayıflık derecesi 0–1
}): number;   // 0–100 = 100 * (0.4 * ders + 0.3 * zayıflık + 0.3 * gecikme); ağırlıklar SCORE_WEIGHTS sabiti
// zayıflık: tür taban puanı (knowledge_gap 1, low_accuracy .8, forgetting_risk .7, stale .6, review_due .6, neglected_subject .5, not_started .4)
//           × (başarı eşiği varsa (threshold − accuracy)/threshold ile 0.5–1 arası ölçek)

// features/analytics/lib/suggestions.ts
export type Suggestion = {
  studentId: string; subjectId: string; topicId: string | null;
  kind: TopicAlertKind; reason: string;                      // kısa Türkçe
  task: { kind: PlanItemKind; targetValue: number | null; targetUnit: "questions" | "minutes" | null; estimatedMinutes: number; title: string };
  score: number;
};
export function buildSuggestions(input: {
  alerts: TopicAlert[]; plannedTopicIds: Set<string>; dismissed: Set<string>;  // anahtar `${kind}:${subjectId}:${topicId ?? ""}`
  settings: OrgSettings; maxExamQuestionCount: number; today: string;
}): Suggestion[];   // filtre (planlı, reddedilmiş) → puan → öğrenci başına en fazla suggestions.max_per_student
// uyarı → görev: knowledge_gap/not_started → topic_study (topic_study_minutes); low_accuracy/neglected_subject → questions (questions_target);
//                review_due/forgetting_risk/stale → review (review_minutes)

// features/analytics/lib/distribute.ts
export function distributeTasks(input: {
  suggestions: Suggestion[]; days: DayAvailability[]; existing: { dayOfWeek: number | null; subjectId: string | null; minutes: number }[];
  ratio: number; maxPerSubjectPerDay: number;
}): { dayOfWeek: number | null; suggestion: Suggestion }[];
// puana göre sırayla; her öneri için kapasitesi (müsait × ratio − planlanan) en yüksek ve ders sınırını aşmayan gün; sığmayan → null ("bu hafta içinde")
```

**Kabul:** Seed'de öneriler K1'de gruplu görünür; "Plana ekle" bu haftanın taslağına ön dolu görev ekler (e2e); "Şimdi değil" 14 gün gizler (birim + pgTAP); "Önerilen planı hazırla" taslak üretir, gün başına %70 ve ders başına 2 sınırı birim testte; bu hafta planlı konu önerilmez (birim). ✅ Uygulandı (2026-09-18; e2e `suggestions.spec.ts`: yeni öğrencide "Başlanmamış" önerileri, Plana ekle → `day-any` sütunu, Şimdi değil, Önerilen planı hazırla). Notlar: `buildSuggestions` girdisi `plannedTopicIds` (`öğrenci:konu`) + `plannedSubjectIds` (`öğrenci:ders`; ders düzeyi öneri dersin planlı konusuyla elenir) ve `dismissed: Map<anahtar, dismissed_until>` (anahtar `dismissalKey(öğrenci, tür, ders, konu)`; `today` ile karşılaştırılır — 08'deki `Set` yerine, "14 gün gizler" birim testte doğrulanabilsin); `Suggestion` ders adı/kısa ad/renk taşır (liste analytics'ten ders bilgisi almadan çizer); `distributeTasks` `days` yapısal tip (`DistributeDay = { dayOfWeek, availableMinutes }`, `DayAvailability` uyar), geçmiş günler çağıran tarafından dizide verilmez (bu haftada bugünden itibaren, geçmiş haftada hiç); `estimatedMinutes` öneri görevinde kurum ayarından (`questions_target × minutes_per_question`), öğrenci temposu havuzdan forma geçince öneriliyor; `getSuggestions(studentIds?, week?)` — `week` verilmezse bu hafta (K1, K2, "Plana ekle"), plan oluşturucu görüntülenen haftayı geçirir; `taskTitle` `src/lib/plan/task-title.ts`'e taşındı (analytics `alertToTask` başlığı üretir, `AttentionList` "Plana ekle" düğmesi de aynı fonksiyonla görev kurar); `prepareSuggestedPlan` planner eylemidir (getSuggestions + getWeekAvailability + mevcut öğeler → distributeTasks → tek insert), yayınlanmış planda `ActionError`; "Plana ekle" `ResponsiveSheet` ile isteğe bağlı gün çipi (varsayılan "Bu hafta içinde"). Havuz `suggestions` boş metni: "Bu hafta için yeni öneri yok; uyarılar plana girdikçe burası boşalır." Puan listede gösterilmez, sıra puanı taşır.

## 3. Ortak yapılar

### 3.1 Görev havuzu kategorileri

```ts
// features/planner/types.ts
export type TaskPoolCategoryId = "suggestions" | "weak" | "not_started" | "review_due" | "frequent";  // Faz 5a: + "behind"; Faz 7: "resources" | "videos"
export type TaskPoolItem = {
  key: string; categoryId: TaskPoolCategoryId;
  kind: PlanItemKind; title: string; subjectId: string | null; topicId: string | null;
  targetValue: number | null; targetUnit: "questions" | "minutes" | null; estimatedMinutes: number;
  reason?: string; url?: string;
};
export type TaskPoolCategory = { id: TaskPoolCategoryId; title: string; items: TaskPoolItem[]; emptyText: string };
```

Sıra: öneriler, zayıf konular, hiç başlanmamış, tekrar zamanı, sık kullanılan görevler. `lib/pool.ts: buildTaskPool(...)` kategorileri kurar; her parça kendi kategorisini doldurur (Parça 2 `frequent`, Parça 3 `weak/not_started/review_due`, Parça 4 `suggestions`). Havuz öğesi güne bırakılınca ya da "Güne ekle" ile `addPlanItems` çağrılır; tahmini süre `estimateMinutes` ile hesaplanmış gelir. `frequent`: `plan_items ⋈ weekly_plans` `created_by = koç`, `distinct (kind, title, subject_id, topic_id)` son 20.

### 3.2 Görev türü sunumu

`features/planner/lib/kinds.ts`: tür başına `{ icon, defaultTargetUnit, needsTopic, needsUrl, completeMode: "quick-log" | "tap" }` tablosu. Kart, form ve başlık üretici bu tablodan okur; Faz 7'de `section`/`video` satırı eklemek yeterli.

### 3.3 Plan uyum yüzdesi

Tek tanım (§1.4): `v_plan_completion.percent`; TS tarafında aynı formül `lib/plan-summary.ts: completionPercent(items)` (anlık ekran güncellemesi). K1 sütunu ve K2 kutusu görünümden; öğrenci ekranı ("3 / 5 tamamlandı") öğe listesinden.

### 3.4 Yazım ve renk

Öğrenci tarafında uyarı/hata rengi yok; erteleme işareti koç ekranında nötr rozet ("Ertelendi: Sal → Çar"); aşım metni nötr (`ink-500`) + ikon. Fosforlu sarı yalnızca tamamlanan görev. Ders rengi yalnızca kart şeridi ve rozet.

## 4. Kurum ayarları erişimi

`getOrgSettings()` core'dan; `schedule`, `planner`, `analytics` bunu index üzerinden alır. Ayar değişince `revalidatePath` (`/coach`, `/coach/students`, `/student/today`).

## 5. Faz 5 kancası (takvim / strateji katmanı)

Genişletilebilir kalması gereken noktalar; Faz 5 bunları **imza değiştirmeden** parametre ekleyerek genişletir:

| Yapı | Faz 4 | Faz 5 eki |
|---|---|---|
| `availabilityForWeek({ wake, slots, exceptions })` | Kurum uyanık aralığı | `wake` öğrenci başına; `exceptions` MEB takvimi/tatiller (`schedule_exceptions.source: 'manual' \| 'calendar'` kolonu, kurum düzeyi tatil tablosu) |
| `plan_item_kind`, `plan_items` | 5 tür | `section`, `video` değerleri; `section_id`, `video_id` kolonları; `kinds.ts`'e iki satır; havuz `resources`/`videos` |
| `buildSuggestions({ alerts, … })` | Uyarı tabanlı | `strategy` parametresi (sınava kalan gün, hedef ders dağılımı) ve deneme yanlışları (`v_topic_mastery`) uyarı olgusu olarak |
| `priorityScore(...)` | ders × zayıflık × gecikme | `examProximity` çarpanı; ağırlıklar kurum ayarına taşınabilir |
| `distributeTasks({ days, … })` | 1 hafta | `days` çok haftalık dizi; geri planlama (sınava kadar) aynı fonksiyonun ufuk parametresi |
| `copy_weekly_plan` | Öğrenciler arası kopya | Şablon (`plan_templates`) kaynağı için ikinci giriş noktası, aynı kopyalama çekirdeği |
| `v_topic_alert_facts` | Soru + durum olguları | Deneme yanlışı kolonları (`mock_wrong_total`); tekrar modülü gelince `review_due` → `v_review_queue` |
| `TaskPoolCategoryId` | 5 kategori | `resources`, `videos`; `buildTaskPool` sırası sabit |

## 6. Kararlar (2026-09-17, onaylandı)

Parça oturumları bu kararları verili kabul eder; Faz sonunda 02 karar kaydına özetlenir.

| # | Konu | Karar | Değerlendirilen alternatif |
|---|---|---|---|
| A1 | dnd-kit | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` Parça 2'de eklenir; 02 karar kaydına yazılır | Sürükle-bırakı erteleyip yalnızca "Güne ekle" |
| A2 | Uyarı kuralları | TS saf fonksiyon + olgu görünümü (`v_topic_alert_facts`); eşikler kurum ayarından parametre | Kararı SQL görünümünde vermek (jsonb eşikleriyle hantal, Vitest'siz) |
| A3 | Kopyalamada hedefte plan varsa | Öğeler mevcut planın sonuna eklenir; onay penceresi öğrenci başına "Ayşe: 6 mevcut + 5 eklenecek" gösterir; aktarma ile aynı kural | Atla ve bildir · üzerine yaz |
| A4 | Yayınlanmış plan | Canlı düzenlenir, durum değişmez, "yeniden yayınla" yok | Yeniden yayınlama akışı |
| A5 | Kurum ayarı formu | Parça 3'te `/coach/settings`, owner, sayı alanları | Sonraya bırakmak |
| A6 | Erteleme hedef günü | `max(day + 1, bugün)`; 7'yi aşarsa "bu hafta içinde"; gün atanmamış görev ertelenemez | Salt `day + 1` |
| A7 | Öğrenci Bugün kartı | Yalnızca bakım (`review_due`, `forgetting_risk`, `stale`) + `not_started`; başarı dili öğrenciye gösterilmez | Başarıya dayalı türleri de göstermek |
| A8 | "Önerilen planı hazırla" | Yalnızca taslak ya da plan yokken; yayınlanmışta tekil "Plana ekle" | Her zaman ekle |
| A9 | "Haftam nasıl geçti?" | Cumartesi 00:00'dan hafta bitene kadar düzenlenebilir; hafta kapanınca salt okunur; gelecek haftada kapalı | Pazar akşamı · her zaman |
| A10 | Koç plan ekranı | `/coach/students/[id]/plan` sekmesi + `/coach/plans` liste sayfası | Yalnızca sekme |
| A11 | Öğrenci program sayfası | Menüde yok; "Ben" ve plan ekranındaki "Programını düzenle" bağlantısı; 04 §8.2 ray listesi değişmez | Masaüstü rayına "Program" |
| A12 | K1 bölümleri | "Dikkat gerektirenler" ve "Öneriler" `/coach/students` üstünde; `/coach` yönlendirmesi kalır | `/coach` ayrı sayfa |
| A13 | `plan_item_kind` | Faz 4'ün 5 değeri; Faz 7'de `add value` (karar #32 kalıbı) | 03'teki 8 değeri şimdiden tanımlamak |
