# Faz 6: Denemeler ve Yanlış Defteri Tasarımı

> Faz 6'nın iki parçasının (denemeler ve analiz; yanlış defteri, veli net raporu ve öneri motoruna bağlama) ortak tasarım belgesi. 08 ve 09'un yapısını izler. Veri modeli bölümü parça oturumlarında `03-veri-modeli.md`'ye (§3, §4.6, §5.3, §5.4, §6, §7, §8, §9) işlenir; parça oturumları bu belgeyi okuyarak başlar. 09 §5'teki Faz 6 kancalarını **imza değiştirmeden** doldurur. Ölçek kuralı: tek koç, birkaç öğrenci; RLS tavizsiz, gerisi en basit çalışan çözüm. Belge ile kod çelişirse dur ve sor.
>
> **Durum:** tasarım onaylandı (2026-09-19, kararlar §6). Parçalar `faz-6-denemeler` dalında sırayla uygulanır; uygulama notları ilgili bölümlerin sonuna eklenir.

## 0. Özet ve parça sırası

| Parça | Modül | Ne bitirir | Dal |
|---|---|---|---|
| 1 | `mock-exams` (+ `core` K1 sütunu / K2 kutusu) | 4 tablo + RLS + `save_mock_exam_result`; kurum ayarı `mock_exams`; öğrenci giriş sihirbazı, deneme listesi/detayı, net trend grafiği (`LineChart` ortak bileşeni), son deneme ders kartları, en çok yanlış konular; koç kataloğu, karşılaştırma tablosu, K2 Denemeler sekmesi, K2 "Son deneme neti" kutusu, K1 "Son net" sütunu | `faz-6-denemeler` |
| 2 | `mistakes`, `analytics`, `topics` (hücre detayı), veli (`core` Özet + `mock-exams` Denemeler sekmesi) | `mistakes` tablosu + `mistake-images` bucket + politikalar; fotoğraflı kayıt, liste, "Çözdüm"; koç hata nedeni dağılımı; `mock_weak` uyarı türü + `v_topic_alert_facts` deneme/defter kolonları + `subjectGap` ikinci bileşen + somut sebep metni; konu hücresi detayında deneme yanlışı satırı; `parentSummary` widget kalıbı; veli Denemeler sekmesi ve Özet kartı; öğrenci silmede depo temizliği | `faz-6-denemeler` |

Bağımlılık: Parça 2 → Parça 1 (defter kısayolu deneme sonucundan; uyarı olguları deneme tablolarından). Import yönü: `mistakes → mock-exams` **yok** (kısayol yalnızca URL parametresi: `/student/mistakes/new?mockResultId=…`), `analytics → (görünüm)`, `topics → (görünüm)`, `core → mock-exams` **yok** (K1 sütunu overview görünümünden; K2 kutusu ve veli kartı sayfa/widget üzerinden `@/features/mock-exams`). Saf hesaplar `src/lib/exam/` (mevcut `net.ts` yanına), `src/lib/strategy/gap.ts` ve `src/lib/image/compress.ts`; grafik `src/components/shared/line-chart/` (hiçbir `features/*` dosyasını import etmez).

Tek dal: her iki parça `faz-6-denemeler` dalında sırayla (Faz 5 kalıbı).

**Kapsam dışı:** kaynak/video görevleri (Faz 7; `mistakes.section_id` kolonu şimdi yok), bildirimler ve "Net düşüşü" K1 uyarısı (Faz 8; olgu kolonları hazır), soru soru cevap anahtarı, LGS puanı hesabı, otomatik yüzdelik tahmini, yapay zekâ, tekrar sistemi ve ısı haritası (karar C13), veli yanlış defteri arayüzü (C10), çözüm fotoğrafı, deneme kataloğunun şablonla kopyalanması. Kapsam dışı bir öğe tasarımda görünse bile eklenmez; önce sor.

## 1. Veri modeli (03'e eklenecek hali)

### 1.1 Enum

```sql
create type mistake_reason as enum ('knowledge_gap', 'attention', 'time', 'misread_question', 'calculation', 'unknown');  -- Parça 2
create type mistake_status as enum ('open', 'solved');            -- Parça 2; 03'teki 'reviewing' tekrar sistemiyle gelir (karar #32 kalıbı: add value)
alter type public.topic_alert_kind add value 'mock_weak';         -- Parça 2
```

Etiketler (`src/content/labels.ts`): `mistakeReasonLabels` (Bilgi eksiği, Dikkat hatası, Süre yetmedi, Soru kökünü yanlış okuma, İşlem hatası, Bilmiyorum), `mistakeStatusLabels` (Açık, Çözüldü), `topicAlertKindLabels.mock_weak` "Denemede tekrarlayan yanlış", `mockExamKindLabels` (Genel, Branş). `suggestion_dismissals.kind` aynı enum'u kullandığı için "Şimdi değil" `mock_weak` için de çalışır.

### 1.2 Kurum ayarı `mock_exams` (Parça 1)

Migration `faz6a_mock_settings`: `private.default_org_settings()` + yeni **üst düzey** anahtar, mevcut kurumlara `settings = defaults || settings` (yalnızca eksik anahtar yazılır; iç içe anahtar eklenmediği için sığ birleştirme yeter). Uygulama `features/core/lib/org-settings.ts` zod şemasıyla okur (`.prefault({})`).

```json
{ "mock_exams": { "recent_count": 3, "weak_min_marks": 2, "weak_min_mistakes": 3, "gap_weight": 0.5 } }
```

| Anahtar | Anlamı |
|---|---|
| `recent_count` | "Son N deneme" penceresi: konu işareti sayımı, ders yanlış toplamı ("son 3 denemede 7 yanlış"), `subjectGap` deneme bileşeni, öğrenci "en çok yanlış yaptığın konular" |
| `weak_min_marks` | Son N genel denemenin en az bu kadarında işaretlenen konu `mock_weak` üretir |
| `weak_min_mistakes` | Yanlış defterinde son `alerts.lookback_days` içinde bu kadar kayıt açılan konu da `mock_weak` üretir |
| `gap_weight` | `subjectGap = (1 − w) × soruAçığı + w × denemeAçığı`; 0–1; veri olmayan bileşen ağırlığını diğerine bırakır (§3.3) |

Ayar formunda (`/coach/settings`) yeni bölüm "Denemeler ve yanlış defteri" (4 sayı alanı; owner düzenler, koç salt okunur; karar A5).

### 1.3 Parça 1: Denemeler

```sql
mock_exams (                                   -- deneme kataloğu (kurum düzeyi)
  id uuid pk,
  organization_id uuid not null references organizations(id),
  template_id uuid not null references curriculum_templates(id),
  subject_id uuid references subjects(id) on delete restrict,    -- null = genel deneme; dolu = branş (03'teki is_full_exam yerine)
  title text not null,                          -- 1–80: 'Kafa Dengi Türkiye Geneli 3'
  publisher text,                               -- ≤ 60
  exam_date date,
  created_by uuid references profiles(id) on delete set null,
  created_at, updated_at
)
-- index (organization_id, exam_date desc), (template_id), (subject_id), (created_by)

mock_exam_results (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  mock_exam_id uuid references mock_exams(id) on delete restrict,   -- katalog denemesi; sonucu olan deneme silinemez (C5)
  custom_title text,                            -- katalog dışı: ≤ 80
  subject_id uuid references subjects(id),      -- katalog dışı branş denemesi; katalogdan geliyorsa null (türü katalog belirler)
  taken_on date not null,                       -- check: <= (now() at time zone 'Europe/Istanbul')::date
  duration_minutes int check (duration_minutes between 1 and 600),
  score numeric(6,3) check (score between 0 and 999.999),        -- yayınevinin puanı, elle, isteğe bağlı
  percentile numeric(5,2) check (percentile between 0 and 100),  -- yayınevinin yüzdeliği, elle, isteğe bağlı
  note text,                                    -- ≤ 300
  created_by uuid references profiles(id) on delete set null,
  created_at, updated_at,
  check (mock_exam_id is not null or custom_title is not null),
  check (mock_exam_id is null or subject_id is null)
)
-- index (student_id, taken_on desc), (mock_exam_id), (subject_id), (created_by)
-- unique (student_id, mock_exam_id) where mock_exam_id is not null   -- katalog denemesi öğrenci başına bir kez; yeniden giriş = düzenleme (C6)

mock_exam_subject_results (
  result_id uuid references mock_exam_results(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  correct_count smallint not null default 0 check (correct_count >= 0),
  wrong_count  smallint not null default 0 check (wrong_count >= 0),
  blank_count  smallint not null default 0 check (blank_count >= 0),
  wrong_penalty smallint not null check (wrong_penalty >= 0),      -- kayıt anında şablon scoring'inden; 0 = ceza yok
  net numeric(6,2) generated always as
    (correct_count - case when wrong_penalty > 0 then wrong_count::numeric / wrong_penalty else 0 end) stored,
  primary key (result_id, subject_id)
)
-- index (subject_id)

mock_exam_topic_mistakes (                     -- "bu konuda yanlış yaptım" işareti; sayı yok (03'teki wrong_count/blank_count kaldırıldı)
  result_id uuid references mock_exam_results(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  primary key (result_id, topic_id)
)
-- index (topic_id)
```

**Yardımcı:** `private.mock_result_student(p_result_id uuid) returns uuid` (security definer, `set search_path = ''`; `plan_student` kalıbı) — alt tabloların politikaları bununla öğrenciye bağlanır.

**RLS:**

| Tablo | Öğrenci | Koç | Veli | Owner |
|---|---|---|---|---|
| `mock_exams` | S (`organization_id = private.my_org()`) | S I U D (kurum; insert `created_by` kendisi) | S (kurum; rapor başlığı için) | Tümü |
| `mock_exam_results` | S I U D (kendi; insert `created_by` kendisi) | S I U D (`is_coach_of`) | S | Tümü |
| `mock_exam_subject_results`, `mock_exam_topic_mistakes` | S I U D (`can_write_student(private.mock_result_student(result_id))`) | S I U D | S (`can_read_student(…)`) | Tümü |

Tablo yetkisi `authenticated` S I U D (politikalar daraltır; `090` matrisine 4 tablo × 4 satır). Katalog kurum düzeyi olduğu için `can_read_template` değil `my_org` kullanılır (sistem şablonu için de katalog kurumundur). `is_coach_of` owner'ı kapsar.

**RPC (`faz6a_mock_exam_rpc`):**

| Fonksiyon | Tür | Ne yapar |
|---|---|---|
| `save_mock_exam_result(p_result jsonb, p_subjects jsonb, p_topic_ids uuid[] default '{}')` | **security invoker** (RLS uygulanır), `set search_path = ''`; ilk satır `private.can_write_student(student_id)` değilse `not_allowed` 42501 | Tek transaction. `p_result = {id?, student_id, mock_exam_id?, custom_title?, subject_id?, taken_on, duration_minutes?, score?, percentile?, note?}`; `p_subjects = [{subject_id, correct, wrong, blank}]`. Doğrulama (hepsi `22023`): katalog denemesi öğrencinin kurumu ve şablonunda (`invalid_exam`), her ders şablonda ve tekrarsız (`invalid_subject`), branşta tek ders satırı ve o ders (`invalid_subject`), `correct+wrong+blank <= exam_question_count` (null ise sınırsız; `count_exceeded`), konu şablonda ve ders satırı olan bir derse ait (`invalid_topic`), katalog dışı kayıtta başlık boş değil (`title_required`); `wrong_penalty` şablonun `scoring->>'wrong_penalty'` değerinden (yoksa 0). `id` boşsa insert (`created_by` çağıran), doluysa update + alt satırlar silinip yeniden yazılır (RLS 0 satır → `not_found`). Döner `uuid` (result id); `grant execute … to authenticated` |

Silme RPC gerektirmez: öğrenci/koç `mock_exam_results` satırını RLS ile siler, alt satırlar cascade, `mistakes.mock_result_id` set null.

**Görünüm (`faz6a_mock_overview`):** `v_coach_student_overview` (drop + create, Faz 5b kalıbı; kolonlar sona) `last_net numeric` (son **genel** denemenin toplam neti; `taken_on desc, created_at desc`), `prev_net numeric`, `net_delta numeric` (= last − prev; tek deneme → null), `last_mock_on date`. K1 "Son net" sütunu tek sorguda; Faz 8 "Net düşüşü" uyarısı aynı kolonlardan (§5).

### 1.4 Parça 2: Yanlış defteri

```sql
mistakes (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  mock_result_id uuid references mock_exam_results(id) on delete set null,   -- deneme kısayolundan geldiyse
  image_path text,                              -- storage yolu; null = fotoğrafsız kayıt (C7). 03'teki solution_image_path yok
  reason mistake_reason not null default 'unknown',
  note text,                                    -- ≤ 300
  status mistake_status not null default 'open',
  solved_at timestamptz,                        -- check ((status = 'solved') = (solved_at is not null))
  created_by uuid references profiles(id) on delete set null,
  created_at, updated_at
)
-- index (student_id, created_at desc), (subject_id), (topic_id), (mock_result_id), (created_by)
-- Faz 7: section_id; tekrar sistemi: review_stage, next_review_at (kolon şimdi yok; §5)
```

**Yardımcı:** `private.can_read_mistakes(p_student_id uuid) returns boolean` = kendisi **veya** `is_coach_of` **veya** `is_parent_of(p_student_id, true)` (veli yalnızca `can_view_details`). Hem tablo hem depo politikası bunu kullanır; `can_read_student`'tan farkı veli kapısıdır.

**RLS:** öğrenci S I U D (kendi; insert `created_by` kendisi), koç S U D (`is_coach_of`; koç kayıt açmaz — fotoğraf öğrencinin telefonundan), veli S (`can_read_mistakes`), owner tümü. Tablo yetkisi `authenticated` S I U D.

**Depo (`faz6b_mistake_images`):**

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mistake-images', 'mistake-images', false, 2097152, '{image/webp,image/jpeg}')
on conflict (id) do nothing;
-- storage.objects politikaları (yol: {organization_id}/{student_id}/{uuid}.webp|jpg)
--   select: bucket_id = 'mistake-images' and private.can_read_mistakes(((storage.foldername(name))[2])::uuid)
--   insert, delete: bucket_id = 'mistake-images' and private.can_write_student(((storage.foldername(name))[2])::uuid)
--                   and ((storage.foldername(name))[1])::uuid = private.my_org()
--   update: yok
```

Gösterim kısa süreli imzalı URL (liste küçük görseli 10 dk, tam görüntü 60 dk; sunucu bileşeninde `createSignedUrls`). Yükleme istemciden doğrudan bucket'a (tarayıcı istemcisi; RLS yol klasörünü denetler), ardından `createMistake` eylemi satırı yazar ve yolun `${org}/${studentId}/` ile başladığını doğrular; satır yazılamazsa istemci nesneyi siler. Kayıt silme: eylem önce satırı (RLS), sonra nesneyi siler. **Öğrenci silme (KVKK):** `deleteStudent` admin istemcisiyle `mistake-images/{org}/{studentId}/` altındaki nesneleri listeleyip siler, sonra Auth kullanıcısını siler (03 §8 notu; `110_cascade` satırları öğrenciyle gider, depo temizliği e2e ile doğrulanır).

### 1.5 Parça 2: Uyarı olguları ve ders deneme istatistiği (`faz6b_mock_alert_facts`)

`v_topic_alert_facts` sona üç kolon (`create or replace`): `mock_recent_count int` (öğrencinin son `mock_exams.recent_count` **genel** denemesi sayısı; ayar görünümde `coalesce((o.settings #>> '{mock_exams,recent_count}')::int, 3)`), `mock_wrong_recent int` (bu denemelerin kaçında konu işaretli), `mistakes_window int` (son `alerts.lookback_days` içinde açılmış defter kaydı, durum fark etmez). `FACT_SELECT` + `TopicAlertFacts` üçünü alır.

Yeni görünüm `v_student_mock_subject_stats` (security_invoker): `student_id, organization_id, coach_id, subject_id, exams_count` (son `recent_count` sonuç: genel + bu dersin branşı), `avg_net numeric, last_net numeric, wrong_total int, exam_question_count`. Kullanan: analytics `getStrategyContext` (deneme açığı + "son 3 denemede 7 yanlış"), K2 Denemeler "ders bazlı net gelişimi" tablosu, topics hücre detayı için değil (o `v_topic_alert_facts` değil, `mock_exam_topic_mistakes` okur; §2 Parça 2).

### 1.6 pgTAP

| Dosya | Kapsam |
|---|---|
| `220_mock_exams.test.sql` | 4 tablo 5 senaryo (katalog: kurum içi herkes okur, başka kurum 0, öğrenci/veli yazamaz; sonuç ve alt tablolar öğrenci kendi, koç kendi öğrencisi, veli çocuğu, anon 42501); check'ler (başlık/katalog, branş+katalog çelişkisi, gelecek tarih 23514), tekil katalog sonucu 23505, `on delete restrict` 23503; RPC: öğrenci kendi sonucunu yazar ve düzenler (alt satırlar yenilenir), koç yazar, başka koç 42501, geçersiz ders/konu/aşan sayı 22023 ve atomiklik, `wrong_penalty` şablondan, `net` hesaplanmış (3 yanlış = −1,00), ceza 0 şablonda net = doğru; overview `last_net / net_delta` (tek deneme → delta null; branş sayılmaz) |
| `225_mock_settings.test.sql` | `mock_exams` anahtarı varsayılanları, `defaults \|\| settings` ile mevcut değer kazanır |
| `230_mistakes.test.sql` | 5 senaryo; veli `can_view_details=false` → 0 satır, true → görür; koç insert edemez, status/reason günceller; `solved_at` check; depo: bucket satırı var ve private; `storage.objects` politikaları (öğrenci kendi klasörüne insert/delete, başka öğrenci klasörüne 42501, koç okur, detaysız veli 0 satır) — yerel `storage` şeması pgTAP'te elverişsizse bu kısım e2e'ye taşınır ve belgeye not düşülür |
| `235_mock_alert_facts.test.sql` | üç yeni kolon: işaret sayımı pencereye göre (N+1. deneme sayılmaz), branş denemesi `mock_recent_count`'a girmez, defter penceresi; `v_student_mock_subject_stats` RLS ve `wrong_total`, branş sonucu o dersin satırına girer |
| `090_schema_guards` | 5 tablo × 4 satır; görünüm/fonksiyon katalogdan otomatik |
| `110_cascade` | deneme sonuçları, işaretler ve defter öğrenciyle silinir; katalog ve kayıt `created_by` set null |

## 2. Parça sınırları

### Parça 1: Denemeler ve analiz (`mock-exams`, `core`)

**Dosyalar**

- Migration: `faz6a_mock_settings` (§1.2), `faz6a_mock_exams` (tablolar, yardımcı, grant + politikalar, indeksler), `faz6a_mock_exam_rpc`, `faz6a_mock_overview`; testler `220`, `225`, `090`, `110`; `db:types`.
- `src/lib/exam/mock.ts` (+test): `autoBlank`, `totalNet`, `netDeltas`, `trendSummary`, `topicMarkCounts`, `recentSubjectWrong` (§3.1). `src/components/shared/line-chart/` (`line-chart.tsx` istemci, `scale.ts` +test): `LineChart` (§3.2).
- `features/core`: `org-settings.ts` + `mock_exams`, `schemas.ts`, `org-settings-form.tsx` bölümü; `StudentListRow` + `lastNet`, `netDelta`, `lastMockOn`; `StudentTable` "Son net" sütunu (Plan uyumu ile Takvim arasında: `71,33` + `formatSigned` değişim, U+2212; yok → "—"; telefon kartında satır).
- `features/mock-exams`: `module.ts` (mevcut manifest kalır: id `mock-exams`, öğrenci `/student/exams` mobil, koç `/coach/exams`, veli segmenti `exams`, koç sekmesi `exams`, `dependsOn: ["topics"]`), `index.ts`, `schemas.ts` (`mockExamSchema`: title 1–80, publisher ≤ 60, examDate, subjectId | null; `saveMockResultSchema`: result + subjects + topicIds, `takenOn <= bugün`, form ve action aynı şema; `deleteMockResultSchema`), `types.ts` (`MockExam`, `MockResultSummary`, `MockResultDetail`, `SubjectNetRow`, `TrendPoint`, `ComparisonRow`), `server/queries.ts` (`listMockExams(templateId)`, `getMockExam(id)`, `listStudentResults(studentId)` (özet + delta), `getResultDetail(resultId)`, `getTrend(studentId)` (genel denemeler tarih sırasıyla, ders netleri), `getTopicMarkCounts(studentId, n)`, `getExamComparison(examId)` (aynı denemeyi giren öğrenciler × ders netleri + ortalama satırı), `getSubjectProgress(studentId)` (ders başına son / önceki / ortalama)), `server/actions.ts` (`upsertMockExam`, `deleteMockExam` (koç/owner; sonucu varsa `23503` → "Bu denemeyi 3 öğrenci girdi; önce sonuçları sil"), `saveMockResult` → RPC (öğrenci kendi / koç / owner), `deleteMockResult`), bileşenler: `result-wizard.tsx` (istemci; 3 adım), `subject-entry-row.tsx` (ders satırı: `SubjectBadge` + D/Y `NumberStepper` + B (otomatik, düzenlenebilir) + `net` canlı; `compact` koç yüzeyinde), `topic-mark-step.tsx` (yanlış olan derslerin ünite konuları çip; "Atla"), `net-trend-chart.tsx` (`LineChart` sarmalayıcı: seriler toplam + dersler, nokta detayı), `result-card-list.tsx` (< 4 deneme), `last-result-cards.tsx` (son denemenin ders kartları: net + değişim), `top-mistake-topics.tsx`, `result-list.tsx`, `result-detail.tsx` (ders tablosu, işaretli konular, puan/yüzdelik/süre, düzenle/sil), `mock-exam-form.tsx` (`ResponsiveSheet`), `mock-exam-catalog.tsx`, `exam-comparison-table.tsx`, `subject-progress-table.tsx`, `last-mock-tile.tsx` (K2 kutusu, `StatTile`).
- Rotalar (her segmentte `loading.tsx` + `error.tsx`): öğrenci `app/(student)/student/exams/page.tsx`, `exams/new/page.tsx` (sihirbaz; `?examId=` ile katalogdan ön seçim), `exams/[resultId]/page.tsx` (detay; `?edit=1` sihirbazı dolu açar). Koç `app/(coach)/coach/exams/page.tsx` (katalog), `coach/exams/[examId]/page.tsx` (karşılaştırma), `coach/students/[studentId]/exams/page.tsx` (K2 sekmesi: son deneme kartları + trend + ders tablosu + konu birikimi + liste + "Deneme ekle"), `…/exams/new`, `…/exams/[resultId]`. K2 Genel bakış kutu satırına `LastMockTile` (`enabled.has("mock-exams")`).
- e2e `mock-exams.spec.ts` (mobil öğrenci + masaüstü koç): koç katalogda deneme tanımlar → öğrenci sihirbazda seçer, 6 derste D/Y girer (B otomatik), 2 konu işaretler, kaydeder → detayda toplam net şablon kuralıyla (`formatNet`, NBSP) → listede satır; ikinci serbest deneme → değişim rozeti; koç K2 Denemeler sekmesinde ders tablosu ve konu birikimi, K1 "Son net" dolu; koç karşılaştırma sayfasında öğrenci satırı; düzenleme (`?edit=1`) neti değiştirir; silme. Katalog kaydı e2e sonunda silinir (sonuçlar önce). Grafik seed öğrencisiyle (Ayşe, 4 deneme): `figure` + sr-only tablo 4 satır. Katalog kurum tablosu olduğundan spec `desktop-chromium`'da kalır (benzersiz başlık; `e2e/shared/` gerekmez).
- `pnpm screenshots --only 6` → `docs/tasarim/uygulama-6/`: `ogrenci-denemeler-390`, `ogrenci-deneme-giris-390` (2. adım), `ogrenci-deneme-detay-390`, `koc-denemeler-1440` (K2 sekmesi), `koc-deneme-katalog-1440`, `koc-deneme-karsilastirma-1440`, `koc-ogrenciler-1440` (Son net sütunu).
- Seed: 1 katalog denemesi (genel, "Demo Yayınları Türkiye Geneli 1", 3 hafta önce) + Ayşe için 4 genel sonuç (8, 5, 3 hafta önce katalog denemesi, 1 hafta önce serbest; netler yükselen, bir düşüş: 52,00 → 58,33 → 55,67 → 63,33) ve konu işaretleri (Üslü İfadeler 4 denemenin 3'ünde, Paragrafta Anlam 2'sinde → Parça 2 `mock_weak`); Mehmet aynı katalog denemesinde 1 sonuç (karşılaştırma tablosu iki satır); Zeynep yok (boş durum görüntüsü).

**Giriş sihirbazı (öğrenci, telefon; hedef 3 dk):**

1. *Deneme:* katalog listesi (öğrencinin şablonundaki denemeler, tarih sırasıyla; öğrencinin girdiği "Girildi" rozetiyle devre dışı) ya da "Başka bir deneme": başlık + "Genel / Sadece bir ders" (branşta ders çipi). Tarih (varsayılan bugün, gelecek yok). "İsteğe bağlı" katlanır bölüm: süre, puan, yüzdelik.
2. *Netler:* ders satırları (branşta tek satır). Doğru ve Yanlış girilir; **Boş otomatik** = `exam_question_count − D − Y` (düzenlenebilir; C4), D+Y sayıyı aşarsa satır hatası "Bu derste 20 soru var". Satır sonunda `net` canlı; altta yapışkan özet "Toplam 90 soru · Net 71,33" (`aria-live`). Ders soru sayısı boşsa Boş elle. Klavye: Tab alanlar, ↑↓ sayı, Enter sonraki adım, Esc vazgeç.
3. *Yanlış konular:* yalnızca `wrong > 0` dersler; her dersin ünite konuları çip (çoklu seçim, sayı yok). "Atla" ve "Kaydet". Kaydet → RPC → detay sayfası + toast "Deneme kaydedildi. Toplam net 71,33." Parça 2 detay sayfasına "Deftere ekle" bağlantılarını ekler.

Koç aynı sihirbazı `flat` yüzeyde, `compact` adımlayıcıyla kullanır (öğrenci adına giriş, düzenleme). Yerel taslak yok (3 dakikalık akış).

**Analiz ekranları:** Öğrenci `/student/exams`: başlık + "Deneme ekle"; son deneme kartı (toplam net, `+3,67` değişim, tarih, ad) ve ders kartları (net + değişim, `SubjectBadge`; değişim ders rengi değil ink); trend grafiği (≥ 4 genel deneme) ya da kart listesi; "En çok yanlış yaptığın konular" (son `recent_count` denemede işaret sayısına göre ilk 5; "3 denemenin 2'sinde"); tüm denemeler listesi (branş denemeleri "Branş · Mat" rozetiyle). Boş durum: "Henüz deneme eklemedin. İlk denemeni ekle, net takibin başlasın." Sıralama/karşılaştırma yok. Koç K2 sekmesi aynı bileşenler + "Ders bazlı net gelişimi" (ders · son · önceki · son 3 ort. · değişim) + "Konu bazlı yanlış birikimi" (konu · işaret / deneme sayısı · ders rozeti, ilk 10) + karşılaştırma bağlantısı. Katalog `/coach/exams`: tablo (ad, yayınevi, tarih, tür, giren öğrenci sayısı), satır → karşılaştırma (öğrenci × ders netleri + toplam, en altta ortalama; toplam nete göre sıralı — yalnızca koç ekranı). Puan/yüzdelik yalnızca detayda gösterilir, grafiğe girmez. LGS puanı hiçbir yerde hesaplanmaz.

**Kabul:** Öğrenci telefonda 6 derste D/Y girip iki konu işaretleyerek deneme kaydeder, net şablon kuralıyla anında ve kayıtta aynı (e2e + pgTAP `net`); dört ve üzeri denemede grafik, altında kart listesi (e2e seed + yeni öğrenci); koç katalog denemesi tanımlar ve aynı denemeyi giren öğrencileri karşılaştırır (e2e); K1 "Son net" ve K2 kutusu görünümden dolu (e2e); `autoBlank`, `netDeltas`, `trendSummary`, `topicMarkCounts`, `recentSubjectWrong`, ölçek yardımcıları birim testli; `pnpm check` + `pnpm db:test` yeşil.

### Parça 2: Yanlış defteri, veli raporu, öneri motoruna bağlama (`mistakes`, `analytics`, `topics`, `core`, `mock-exams`)

**Dosyalar**

- Migration: `faz6b_mistakes` (enum'lar, tablo, `can_read_mistakes`, grant + politikalar, bucket + depo politikaları), `faz6b_mock_alert_facts` (enum değeri, görünüm kolonları, `v_student_mock_subject_stats`); testler `230`, `235`, `090`, `110`; `db:types`.
- `src/lib/exam/mistakes.ts` (+test): `reasonDistribution`, `dominantReasonSentence`. `src/lib/strategy/gap.ts` (+test): `mockSubjectGap`, `combineGap`. `src/lib/image/compress.ts` (+test, saf kısım: hedef boyut hesabı `fitWithin`): `compressImage(file) → Promise<{ blob: Blob; ext: "webp" | "jpg" }>` (canvas: en uzun kenar 1600 px, `image/webp` q 0,8; `toBlob` webp üretemezse `image/jpeg` q 0,8; EXIF yönü `createImageBitmap(file, { imageOrientation: "from-image" })`; C8).
- `features/mistakes`: `module.ts` (mevcut: `/student/mistakes` mobil değil, koç sekmesi `mistakes`; veli segmenti yok), `schemas.ts` (`createMistakeSchema`: subjectId, topicId | null, mockResultId | null, imagePath | null (`^{org}/{student}/[0-9a-f-]{36}\.(webp|jpg)$` eylemde doğrulanır), reason (varsayılan `unknown`), note ≤ 300; `updateMistakeSchema`: reason/topic/note; `setMistakeStatusSchema`), `types.ts` (`Mistake`, `MistakeFilters`, `ReasonSlice`), `server/queries.ts` (`listMistakes(studentId, filters)` + imzalı küçük URL'ler, `getMistake(id)` + 60 dk URL, `getReasonDistribution(studentId)` (son `alerts.lookback_days`), `getTopicMistakeCounts(studentId)`), `server/actions.ts` (`createMistake` (öğrenci; yol öneki kontrolü), `updateMistake`, `setMistakeStatus` ("Çözdüm" / geri al; `solved_at`), `deleteMistake` (satır → nesne)), bileşenler: `mistake-form.tsx` (istemci; alan sırası ve C7 eki: en üstte fotoğraf alanı `<input type="file" accept="image/*" capture="environment">` + önizleme + sıkıştırma + doğrudan yükleme + ilerleme; **fotoğraf seçilmediyse not alanı hemen altında açık ve ipuçlu** ("Soruyu kısaca yaz ya da fotoğraf ekle"), fotoğraf seçilince not alanı "Not ekle" katlanır bölümüne iner — ikisi de zorunlu değil, ikisi de boşsa kayıt yine olur; ders çipleri, konu seçimi (isteğe bağlı), neden çipleri (`radiogroup`, "Bilmiyorum" seçili gelir); `?subjectId=&topicId=&mockResultId=` ön dolgu), `mistake-list.tsx` (filtre çipleri: ders, durum, neden; kart: küçük fotoğraf (yoksa ders ikonu + notun ilk satırı), `SubjectBadge`, konu, neden rozeti (nötr), tarih, "Çözdüm"; çözülen kart `clay-sm` + fosforlu onay — tamamlanan görev kuralı, 04 §5), `mistake-image-dialog.tsx`, `reason-distribution.tsx` (koç: yatay `ink-900` çubuklar + sayı · yüzde, altta cümle "Yanlışların %38'i bilgi eksiği · 21 kayıt, son 60 gün"; ders rengi yok), `topic-mistake-list.tsx`.
- Rotalar: öğrenci `app/(student)/student/mistakes/page.tsx` (+ `new/page.tsx`, `[mistakeId]/page.tsx`); "Ben" sayfasına "Yanlış defterim" bağlantısı (04 §8.2; masaüstü rayında zaten var). Koç `coach/students/[studentId]/mistakes/page.tsx` (dağılım + konu listesi + salt okunur liste, fotoğraf diyaloğu). `mock-exams` detay sayfasında işaretli konu satırına "Deftere ekle" bağlantısı (`/student/mistakes/new?subjectId=&topicId=&mockResultId=`; `mistakes` modülü açıksa; yalnızca öğrenci yüzeyinde).
- `features/topics` (karar C13 eki): `TopicMapCell.mockWrongRecent: { marks: number; exams: number } | null` (`getTopicMap` beşinci paralel okuma: `mock_exam_topic_mistakes ⋈ mock_exam_results` son `recent_count` genel deneme; görünüm gerekmez, RLS ile öğrenci/koç okur); hücre detayında satır "Deneme: 3 denemenin 2'sinde yanlış" (`data-testid="topic-mock"`; deneme yoksa satır yok). Harita hücresinde işaret **yok** (ısı haritası C13 ile sonraya).
- `features/core`: `deleteStudent` depo temizliği (admin `storage.from("mistake-images").list(prefix)` + `remove`, sonra `auth.admin.deleteUser`); `src/modules/define-module.ts` `ModuleWidgets.parentSummary?: ParentSummaryWidget[]` (`{ component, order }`, prop `{ studentId }`) + `src/modules/widgets.ts: getParentSummaryWidgets(enabled)`; veli Özet sayfası (`app/(parent)/parent/[studentId]/page.tsx`) widget'ları sırayla çizer, hiç yoksa mevcut `EmptyState` (Faz 8 diğer kartları ekler).
- `features/mock-exams` (veli): `components/widgets/parent-last-result-widget.tsx` (`parentSummary`, order 30: "Ayşe 14 Eylül'de 71,33 net yaptı · önceki denemeye göre +3,67 · Kafa Dengi Deneme 6"; deneme yoksa kart yok), `app/(parent)/parent/[studentId]/exams/page.tsx`: son deneme kartı, trend grafiği / kart listesi (`clay-calm`, `clay-sm`), ders özeti (son deneme ders netleri + değişim), deneme listesi. "Siz" dili, karşılaştırma/sıralama yok, değişim nötr sayı (V1'deki yeşil rozet 04 §4.2 gereği `ink-700`), suçlayıcı dil yok.
- `features/analytics`: `types.ts` (`TopicAlertFacts` + `mockRecentCount`, `mockWrongRecent`, `mistakesWindow`; `TopicAlert` + `topicStatus: TopicStatus | null` (ders düzeyinde null); `StudentStrategy` + `subjectMockWrong: ReadonlyMap<subjectId, { wrong: number; exams: number }>`), `lib/alerts.ts` (`AlertThresholds` + `mock_exams: Pick<OrgSettings["mock_exams"], "recent_count" | "weak_min_marks" | "weak_min_mistakes">` (`alertThresholds(settings)` ekler); `mock_weak` kuralı; `KIND_PRIORITY` mock_weak = 2, sonrakiler kayar; `groupAlerts.weak` kapsar; `alertReason` §3.4), `lib/priority.ts` (`KIND_BASE_SCORE.mock_weak = 0.85`), `lib/suggestions.ts` (`TASK_KIND.mock_weak = "topic_study"`; `strategyNoteFor` + `mockWrong?` → "son 3 denemede 7 yanlış"; sıra: hedef gecikmesi → deneme yanlışı → soru açığı), `lib/nudge.ts` (değişmez: `mock_weak` öğrenci Bugün kartında **gösterilmez**, karar A7), `server/queries.ts` (`FACT_SELECT` + 3 kolon; `getStrategyContext` `v_student_mock_subject_stats` okur, `combineGap` ile birleştirir, `subjectMockWrong` doldurur). `src/lib/strategy/mix.ts`: `mock_weak → "weak"`. `features/planner/lib/alert-pool.ts`: `mock_weak → weak` kategorisi, `topic_study`. `labels.ts`.
- e2e `mistakes.spec.ts` (mobil öğrenci + masaüstü koç): öğrenci fotoğraf seçer (`setInputFiles` `e2e/fixtures/soru.jpg`), ders/konu/neden, kaydeder → listede kart + küçük görsel → "Çözdüm" → filtre "Çözüldü" → fotoğrafsız ikinci kayıt (not alanı görünür, ipucu metni) → koç sekmesinde dağılım ve konu sayısı → öğrenci siler → `storage.objects` satırı yok (db fixture). Veli: `veli.ayse` Denemeler sekmesinde seed netleri ve Özet'te son net kartı; detaysız velide yanlış defteri rotası yok (veli nav'ında segment yok). Uyarı bağlama (okuyan test, `alerts.spec` kalıbı): seed Ayşe'de `mock_weak` (Üslü İfadeler 4 denemenin 3'ünde; konu seed'de `mastered` → sebep "Oturdu işaretli ama son 3 denemenin 2'sinde yanlış") K2 Konular "Zayıf konular"da ve K1 önerisinde "son 3 denemede N yanlış" notu; konu hücresi detayında "Deneme:" satırı.
- Ekran görüntüleri: `ogrenci-yanlislar-390`, `ogrenci-yanlis-ekle-390`, `koc-yanlislar-1440`, `veli-ozet-390`, `veli-denemeler-390`, `koc-ogrenciler-1440` (mock_weak önerisi), `ogrenci-konu-detay-390` (deneme satırı).
- Seed: Ayşe için 3 fotoğrafsız defter kaydı (Üslü İfadeler `attention`, Paragrafta Anlam `time`, Basınç `knowledge_gap`; biri `solved`) — dağılım ve filtre görüntüleri için.

**`mock_weak` kuralı (`evaluateTopic` sırası):** `knowledge_gap → low_accuracy → mock_weak → behind_school → stale → forgetting_risk → review_due → not_started`. Koşul: `mockWrongRecent >= weak_min_marks` **veya** `mistakesWindow >= weak_min_mistakes`; konu durumu fark etmez (bitmiş konuda da üretilir: "oturdu" sanılan konuda deneme yanlışı koç için en değerli sinyal). `threshold = null`, `idleDays = null`, `delayDays = 0`, `questions = questionsWindow`, `topicStatus = status`. Testler: pencere sınırı, yalnızca defter sinyali, ikisi birlikte, bitmiş konuda üretim ve sebep metni, öncelik (başarı kuralı kazanır), "Şimdi değil" 14 gün.

**Kabul:** Öğrenci telefondan fotoğraflı yanlış ekler, fotoğraf 2 MB altında ve `{org}/{student}/` yolunda, başka öğrenci/detaysız veli göremez (pgTAP depo + e2e); fotoğrafsız kayıtta not alanı ipucuyla görünür (e2e); "Çözdüm" ve filtreler (e2e); koç dağılım ve cümle (e2e); öğrenci silinince klasör boş (e2e db fixture); veli Denemeler ve Özet kartı "siz" diliyle (e2e + görüntü); `mock_weak` seed'de K2 zayıf listesinde "Oturdu işaretli ama …" sebebiyle ve öneri notunda somut sayı (e2e); hücre detayında deneme satırı (e2e); `subjectGap` birleşimi ve `mock_weak` kuralı birim testli, strateji verilmeyince Faz 4/5 testleri aynen; `pnpm check` + `pnpm db:test` yeşil.

## 3. Ortak yapılar

### 3.1 Saf fonksiyonlar

```ts
// src/lib/exam/net.ts (mevcut): calculateNet, wrongPenaltyOf, accuracyPercent
// src/lib/exam/mock.ts
export type SubjectNet = { subjectId: string; correct: number; wrong: number; blank: number; net: number; questionCount: number | null };
export type MockPoint = { resultId: string; title: string; takenOn: string; isBranch: boolean; totalNet: number; subjects: SubjectNet[] };
export function autoBlank(questionCount: number | null, correct: number, wrong: number): number | null;  // count − c − w; count yok ya da < 0 → null
export function totalNet(subjects: readonly SubjectNet[]): number;                                       // Σ net, 2 basamağa yuvarlanmış
export function netDeltas(points: readonly MockPoint[]): Map<string, number | null>;                     // genel denemeler tarih sırasıyla; ilk → null; branş → null
export function trendSummary(points: readonly MockPoint[]): string;   // "Beş denemede toplam net 13,00 arttı." · "… 2,33 düştü." · "… değişmedi." · tek deneme: "Bir deneme girildi."
export function topicMarkCounts(marks: readonly { resultId: string; topicId: string }[], recentResultIds: ReadonlySet<string>): { topicId: string; count: number }[];   // azalan, eşitlikte topicId
export function recentSubjectWrong(points: readonly MockPoint[], n: number): Map<string, { wrong: number; exams: number }>;   // son n (genel + dersin branşı)

// src/lib/exam/mistakes.ts
export function reasonDistribution(rows: readonly { reason: MistakeReason }[]): { reason: MistakeReason; count: number; percent: number }[];  // en büyük kalan, toplam 100, azalan; boş → []
export function dominantReasonSentence(dist: ReturnType<typeof reasonDistribution>, total: number): string | null;  // "Yanlışların %38'i bilgi eksiği" (en büyük dilim unknown ise null)

// src/lib/strategy/gap.ts
export function mockSubjectGap(input: { avgNet: number; questionCount: number | null }): number | undefined;   // clamp01(1 − avg / count); count yoksa undefined
export function combineGap(input: { questionGap?: number; mockGap?: number; weight: number }): number | undefined;   // ikisi varsa (1−w)q + w·m; biri varsa o; yoksa undefined

// src/lib/image/compress.ts
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number };   // oran korunur, büyütmez

// src/components/shared/line-chart/scale.ts
export function niceCeil(max: number): number;                 // 71,33 → 80; 18 → 20; 0 → 10
export function yTicks(max: number, count?: number): number[];
export function linePath(points: readonly { x: number; y: number | null }[]): string;   // null noktada çizgi kesilir
```

Tanımlar tek yerde: **genel deneme** = `subject_id` (sonuç ya da katalog) boş; **toplam net** yalnızca genel denemede; **değişim** = önceki genel denemeye göre; **son N** = `taken_on desc, created_at desc` ilk N genel deneme (ders istatistiğinde o dersin branşı da sayılır); **işaret** = `mock_exam_topic_mistakes` satırı (sayı yok); **defter penceresi** = son `alerts.lookback_days` gün. Hepsi yapısal tip alır, `features/*` import etmez, tarih hesapları `lib/dates`, metinler `lib/format`.

### 3.2 `LineChart` (ortak bileşen, karar C1)

`src/components/shared/line-chart/line-chart.tsx` (istemci): `{ points: { key: string; label: string; values: Record<string, number | null> }[]; series: { id: string; label: string; color: "ink" | SubjectColorToken; bold?: boolean; defaultOn?: boolean }[]; summary: string; yLabel: string; renderDetail: (key: string) => ReactNode }`. Saf SVG, `viewBox` ile ölçeklenir (genişlik %100, telefonda 320 px'e sığar; yükseklik 200/260). Yatay eksen denemeler **eşit aralıklı** tarih sırasıyla (zaman ölçeği değil; etiket `formatDateTr`, telefonda en fazla 6 etiket, gerisi atlanır), dikey eksen 0 → `niceCeil(görünür serilerin en büyüğü)`. Toplam net `ink-900` 3 px; ders serileri `var(--s)` 1,5 px (`subjectVars`); seri çipleri (`checkbox` rolü) açar/kapar, en az bir seri açık kalır; toplam varsayılan açık, dersler kapalı (C2). Noktaya dokunma/tıklama seçer; klavye: kap `tabindex=0`, ←/→ nokta, Home/End; seçili nokta büyür + dikey kılavuz; `renderDetail` altta `aria-live="polite"` kutuda (o denemenin adı, tarihi, toplam net ve değişim, açık derslerin netleri). Ekran okuyucu: `<figure aria-label={summary}>` + `sr-only` tablo (satır = deneme, sütun = seri); görsel SVG `aria-hidden`. Hareket yok (`prefers-reduced-motion` zaten global kapatır). Dört noktadan azsa çağıran taraf `LineChart` yerine kart listesi çizer (sayfa karar verir).

**Saf SVG mi, Recharts mı? (karar C1)**

| Ölçüt | (a) Saf SVG `LineChart` | (b) Recharts |
|---|---|---|
| Paket | 0 KB; ~250 satır bileşen + ~60 satır ölçek yardımcısı (birim testli) | Recharts 3: d3-scale/shape, victory-vendor, redux ile ~100 kB gz istemci paketi; dinamik import ile yalnızca grafik sayfasında yüklenir |
| SSR / ilk boyama | Sunucuda çizilir (`viewBox`), JS'siz görünür; etkileşim küçük istemci parçası | `ResponsiveContainer` istemcide ölçer → ilk boyamada boş alan, hidrasyon sonrası çizim; `"use client"` zorunlu |
| Erişilebilirlik | Tam kontrol: sr-only tablo, özet cümle (04 §13), ok tuşları, seçili nokta özeti `aria-live`; renk + etiket | `accessibilityLayer` klavye gezinmesi var; sr-only tablo/özet yine elle; tooltip odak/dokunma davranışı kütüphaneye bağlı, özelleştirme prop yoğun |
| Token uyumu | CSS değişkenleri doğrudan (`var(--s)`, `currentColor`), yüzey varyantları sınıfla | Renkler string prop; `stroke="var(--s)"` çalışır ama `clay:`/`flat:` varyantları geçmez |
| Maliyet | ~1 gün (çizgi + nokta + eksen + çipler + özet + testler) | ~yarım gün + görünüm/erişilebilirlik/hidrasyon düzeltmeleri |
| Tekrar kullanım | Genel bileşen: Faz 8 veli haftalık özet, Faz 9 çalışma süresi / günlük durum çizgileri; çubuklar zaten CSS | Her grafik türü hazır (alan, pasta, karma) |
| Risk | Grafik türü çeşitlenirse (yığılmış alan, ısı) elle yazım büyür | Bağımlılık güncellemeleri, boyut, Next sürümleriyle uyum |

**Karar: (a).** Mevcut CSS/SVG grafik kalıbıyla (`coach-overview.tsx`, `week-subjects-widget.tsx`, `GoalRing`) tutarlı, sıfır bağımlılık, erişilebilirlik ve token'lar elde. 02 karar #48 ve yığın tablosunda "Recharts → kullanılmadı; gerekirse karar kaydıyla".

### 3.3 Strateji bağlantısı

`StudentStrategy.subjectGap` (imza aynı): `combineGap({ questionGap: mevcut hesap, mockGap: mockSubjectGap(v_student_mock_subject_stats satırı), weight: settings.mock_exams.gap_weight })`. Deneme açığı mutlak (ders neti / soru sayısı): açıklanabilir ("son 3 denemede Matematik ortalama 8,3 / 20"), sıralamayı doğru yönde etkiler; göreli seçenek C12'de. `strategyNote` sırası: hedef gecikmesi → "son 3 denemede 7 yanlış" (ders `wrong_total`, `exams >= 1`; `formatCount` ile) → "bu derste soru hedefinin gerisinde". `Suggestion.reason` `mock_weak` için `alertReason` metni. Strateji verilmeyince Faz 4/5 sonuçları birebir.

### 3.4 Yazım ve renk

- `alertReason(mock_weak)` (karar C11 eki): konu bitmişse (`topicStatus ∈ {completed, mastered}`) **"Oturdu işaretli ama son 3 denemenin 2'sinde yanlış"** / **"Tamamlandı işaretli ama …"** (`topicStatusLabels`); bitmemişse "Son 3 denemenin 2'sinde yanlış"; yalnızca defter sinyali varsa "Yanlış defterinde 3 soru"; ikisi de varsa " · " ile birleşir. Aynı metin K1/K2 listeleri, öneri sebebi ve havuz satırında.
- Öğrenci: "sen"; net düşüşü nötr sayı ("−2,33"), kırmızı/uyarı yok; fosforlu yalnızca çözülen defter kartı; başarı dili (`mock_weak`) öğrenci Bugün kartında yok.
- Veli: "siz", tek cümle, yeşil rozet yok (`ink-700`), karşılaştırma yok ("Ayşe 14 Eylül'de 71,33 net yaptı; önceki denemeye göre +3,67").
- Koç: nötr sayısal; karşılaştırma tablosu sıralı; uyarı rengi yalnızca K1 dikkat satırı kenarında (mevcut kural).
- Ders rengi yalnızca rozet ve grafik çizgisi; toplam net, değişim, dağılım çubukları `ink-900`. Hata nedeni rozeti nötr (`bg-bg-sunken`), renk taşımaz.
- Sayılar `formatNet` (iki basamak, NBSP), `formatSigned` (U+2212), `formatPercent`, `formatCount`, `formatDateTr`.

### 3.5 Havuz ve etiketler

`TaskPoolCategoryId` değişmez; `mock_weak` → `weak` kategorisi, görev `topic_study`, sebep `alertReason`. `mix`: weak. `KIND_PRIORITY` (yeni sıra): knowledge_gap 0, low_accuracy 1, mock_weak 2, behind_school 3, neglected_subject 4, forgetting_risk 5, review_due 6, stale 7, not_started 8.

## 4. Kurum ayarı ve yeniden doğrulama

`getOrgSettings().mock_exams` core'dan; mock-exams ve analytics index üzerinden alır. `updateOrgSettings` revalidate listesi değişmez (deneme sayfaları dinamik). `saveMockResult` / `deleteMockResult` → `/student/exams`, `/student/today`, `/coach/students`, `/coach/exams`, `/parent`; `upsertMockExam` / `deleteMockExam` → `/coach/exams`, `/student/exams`; `createMistake` / `updateMistake` / `setMistakeStatus` / `deleteMistake` → `/student/mistakes`, `/student/topics`, `/coach/students`.

## 5. Faz 7+ kancası

| Yapı | Faz 6 | Sonraki ek |
|---|---|---|
| `mistakes` | ders/konu/deneme bağı | Faz 7 `section_id` (kaynak testi); tekrar sistemi `review_stage`, `next_review_at`, `mistake_status` + `reviewing`, `v_review_queue (item_type 'mistake')`, `mark_reviewed` |
| `v_coach_student_overview.last_net / prev_net` | K1 sütunu | Faz 8 `detect_alerts` "Net düşüşü" (01 §7: son 2 ort. − önceki 3 ort. ≥ eşik; ayar `alerts.net_drop_threshold`), K1 hızlı eylem "Planı gözden geçir" |
| `v_topic_alert_facts.mock_wrong_recent / mistakes_window`, `TopicMapCell.mockWrongRecent` | `mock_weak`, hücre detayı satırı | `v_topic_mastery` ısı haritası (`mastery_score` formülü 03 §6); hücrede görsel işaret |
| `parentSummary` widget kalıbı | son deneme kartı | Faz 8 veli özeti: plan uyumu, soru/süre, gidişat cümlesi (09 §5), haftalık özet üretimi aynı widget verisinden |
| `can_read_mistakes` | DB kapısı | Faz 8 koç "veliye görünürlük" anahtarı (`student_parents.can_view_details` formu) + veli defter sekmesi (C10) |
| `LineChart` | net trendi | Faz 8 veli haftalık özet, Faz 9 çalışma süresi / günlük durum çizgileri |
| `mock_exams.template_id` | tek sezon | `copy_curriculum_template(include_catalogs)` deneme kataloğunu da kopyalar |
| `mistake-images` | 1 GB ücretsiz plan | Eski sezon fotoğraf arşivleme / silme eylemi (01 §10); PWA kamera kısayolu (Faz 9) |
| Bildirimler | — | Faz 8: "deneme girildi" (koç), "koç deneme ekledi" (öğrenci) |
| `save_mock_exam_result` | ders D/Y/B + konu işareti | Soru soru cevap anahtarı istenirse `mock_exam_answers` alt tablosu; RPC imzası aynı, `p_answers` isteğe bağlı parametre |

## 6. Kararlar (2026-09-19, onaylandı)

Parça oturumları bu kararları verili kabul eder; faz sonunda 02 karar kaydına özetlenir (#48'den itibaren).

| # | Konu | Karar | Değerlendirilen alternatif |
|---|---|---|---|
| C1 | Trend grafiği kütüphanesi | **Saf SVG `LineChart`** (`components/shared/line-chart/`): 0 KB, sunucuda çizilir, sr-only tablo + özet cümle + klavye, token'lar doğrudan; karşılaştırma §3.2; 02 karar #48 + yığın satırı güncellenir | Recharts 3 (~100 kB gz, `ResponsiveContainer` hidrasyon boşluğu, erişilebilirlik yine elle) |
| C2 | Grafik serileri ve ölçek | Tüm seriler açılıp kapanır (toplam varsayılan açık, dersler kapalı; en az biri açık); dikey eksen görünür serilerin en büyüğüne göre (`niceCeil`); yatay eksen eşit aralıklı | Toplam sabit + eksen hep 0–90; zaman ölçekli x ekseni |
| C3 | Branş denemeleri | Trend, K1/K2 "son net", değişim ve veli raporunda **yalnızca genel** denemeler; branş sonuçları listede ("Branş · Mat") ve ders bazlı tabloda o dersin serisinde | Branşı toplam trende dahil |
| C4 | Boş sayısı | **Otomatik** `= ders soru sayısı − D − Y`, düzenlenebilir (12 sayı girişi → 3 dk); D+Y aşarsa satır hatası | Üç alan elle (18 giriş) |
| C5 | Sonucu olan katalog denemesi | `on delete restrict` → koç önce sonuçları siler; arayüzde "Bu denemeyi 3 öğrenci girdi; önce sonuçları sil" | `set null` + başlığı kopyalayan tetikleyici |
| C6 | Aynı katalog denemesi | Öğrenci başına tek sonuç (kısmi tekil indeks); yeniden giriş = düzenleme | Çoklu sonuç (karşılaştırma bulanır) |
| C7 | Defter fotoğrafı | **İsteğe bağlı** (`image_path` null olabilir). **Ek (onay notu):** formda fotoğraf en üstte; fotoğraf seçilmediyse not alanı hemen altında açık ve ipuçlu ("Soruyu kısaca yaz ya da fotoğraf ekle"), fotoğraf seçilince "Not ekle" katlanır bölümüne iner; ikisi de zorunlu değil | Zorunlu fotoğraf |
| C8 | Sıkıştırma | **Bağımlılıksız canvas** (`lib/image/compress.ts`: 1600 px, webp q 0,8, jpeg yedek); 02 yığın satırından `browser-image-compression` çıkarılır | `browser-image-compression` |
| C9 | Hata nedeni ve durum | 5 neden + `unknown` ("Bilmiyorum", varsayılan; çip seçmeden kayıt olur); durum yalnızca `open / solved` | Neden zorunlu; `reviewing` şimdi |
| C10 | Veli yanlış defteri | Bu fazda **DB kapısı** (`can_read_mistakes`, `is_parent_of(…, true)`), veli arayüzü yok (nav'da segment yok); koç anahtarı + veli sekmesi Faz 8 | Şimdi veli sekmesi + koç anahtarı |
| C11 | `mock_weak` kuralı | Son 3 genel denemenin ≥ 2'sinde işaret **veya** son `lookback_days` içinde ≥ 3 defter kaydı; bitmiş konuda da üretilir; öğrenci Bugün kartında gösterilmez. **Ek (onay notu):** konu `completed`/`mastered` iken sebep metni bunu açıkça söyler: "Oturdu işaretli ama son 3 denemenin 2'sinde yanlış" (`TopicAlert.topicStatus`) | Yalnızca deneme işareti; ayrı `notebook_weak` türü |
| C12 | `subjectGap` deneme bileşeni | Mutlak: `1 − ort. net / soru sayısı`, ağırlık `gap_weight` 0,5; veri olmayan bileşen ağırlığını diğerine bırakır | Göreli (dersin oranı öğrencinin genel oranının altında) |
| C13 | Tekrar sistemi ve ısı haritası | **Bu fazın dışında**; 01 yol haritasında Faz 6 tanımı daraltılır, tekrar sistemi + `v_topic_mastery` "Faz 6b (sonra)" olarak Faz 7'nin ardına yazılır. **Konu hücresi detayındaki "Deneme: 3 denemenin 2'sinde yanlış" satırı kalır** (`TopicMapCell.mockWrongRecent`, Parça 2) | Üçüncü parça olarak şimdi |
| C14 | K2 Genel bakış | Yalnızca "Son deneme neti" kutusu (`StatTile`: `71,33` · `+3,67 · 14 Eylül · Kafa Dengi 6`); trend grafiği Denemeler sekmesinde | Genel bakışa trend grafiği de |
| C15 | Veli Özet mekanizması | `ModuleWidgets.parentSummary` kalıbı şimdi (02 notu "ilk ihtiyaçla"), mock-exams tek widget; Faz 8 diğerlerini ekler | Özet sayfasına elle kart |

Verili kabul edilenler (istemden): deneme girişi ders bazında D/Y/B + konu işareti, hedef 3 dk, soru soru cevap anahtarı yok; yanlış defteri tamamen isteğe bağlı, zorlama yok; veli net raporu bu fazda; puan/yüzdelik elle ve yalnızca gösterim; LGS puanı hesaplanmaz.

**Belge güncellemeleri (parça oturumlarında):** 03 §3 (iki enum + `mock_weak`), §4.6 (bu belgenin §1.3–1.5 hali; `is_full_exam` → `subject_id`, işaret tablosu sayısız, `mistakes` sade), §5.3 matris (5 satır + `mock_exams` veli S), §5.4 test listesi, §6 görünümler (`v_coach_student_overview` + net kolonları, `v_topic_alert_facts` + 3 kolon, `v_student_mock_subject_stats`; `v_mock_exam_trend` yapılmadı), §7 RPC (`save_mock_exam_result` imzası), §8 depo (bucket + politikalar + öğrenci silme), §9 seed; 02 yığın tablosu (Recharts, browser-image-compression satırları) + karar #48 (C1–C15 özeti) + klasör yapısı (`lib/exam/mock`, `lib/image`, `components/shared/line-chart`); 01 §11 Faz 6 tanımı (C13) ve kabul; 04 §10 envanterine `LineChart`.
