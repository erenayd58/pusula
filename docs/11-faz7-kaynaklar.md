# Faz 7: Kaynaklar ve Videolar Tasarımı

> Faz 7'nin iki parçasının (kaynak kataloğu ve öğrenci kaynak takibi; video kataloğu, öğrenci video takibi, plan havuzu ve öneri motoruna bağlanma, sezon kopyalama) ortak tasarım belgesi. 08, 09 ve 10'un yapısını izler; 08 §5 ve 09/10 §5'teki Faz 7 kancalarını **imza değiştirmeden** doldurur. Veri modeli bölümü parça oturumlarında `03-veri-modeli.md`'ye (§3, §4.5, §5.3, §5.4, §6, §7, §9) işlenir; parça oturumları bu belgeyi okuyarak başlar. Ölçek kuralı: tek koç, birkaç öğrenci; RLS tavizsiz, gerisi en basit çalışan çözüm. Belge ile kod çelişirse dur ve sor.
>
> **Durum:** tasarım onaylandı (2026-09-19; §7 kararları önerildiği gibi, D1–D17). Uygulama tek dalda, iki parça sırayla; uygulama notları bölüm sonlarına eklenir.

## 0. Özet ve parça sırası

| Parça | Modül | Ne bitirir | Dal |
|---|---|---|---|
| 1 | `resources` (+ `question-log` sheet, `planner` tür/havuz, `core` Ben bağlantısı) | `resource_type` enum + `plan_item_kind` `section`/`video`; `resources`, `resource_sections`, `student_resources` + RLS; `question_logs.section_id`, `plan_items.section_id`; `create_resource`, `move_resource_section`; `complete_plan_item` kaynak bağı; iki görünüm; koç kataloğu (tek hamlede test üretimi, konuya eşleme, sıralama, çoklu atama, "Öğrenci ekledi" bölümü); öğrenci kaynak listesi/detayı + öğrencinin kaynak ekleyebilmesi (benzer ad önerisi); hızlı kayıt `section` ön dolgusu; plan görevi `section` türü + havuz `resources` kategorisi; K2 "Kaynaklar" sekmesi | `faz-7-kaynaklar` |
| 2 | `videos` (+ `analytics` öneri, `planner` havuz, `topics` şablon kopyalama) | `video_playlists`, `videos`, `student_playlists`, `student_video_progress` + RLS; `plan_items.video_id`; `create_playlist`, `import_playlist_videos`, `mark_video_watched`; iki görünüm; YouTube Data API içe aktarma (sunucu), tek video ekleme, konuya eşleme, atama; öğrenci liste/oynatıcı (`youtube-nocookie`), "İzledim", not; plan görevi `video` türü + havuz `videos`; öneri motoru video/kaynak görevi; `copy_curriculum_template(include_catalogs)` + owner formu; K2 "Videolar" sekmesi | `faz-7-kaynaklar` |

Tek dal, iki parça sırayla (Faz 5/6 kalıbı). Bağımlılık: Parça 2 → Parça 1 (enum değerleri, havuz altyapısı, ortak `StudentPicker`, `QuickLog` bağı kalıbı). Import yönü: `planner → resources`, `planner → videos` **yok** (havuz verisi görünümlerden, planner'ın kendi sorgu katmanında; 08 §0 kalıbı), `analytics → resources/videos` **yok** (öneri motoru medya eşlemesini görünümlerden alır), `question-log → resources` **yok** (sheet yalnızca `QuickLogRequest.section` yapısal tipini alır; açık plan bağı görünümden), `resources → videos` yok, `videos → resources` yok. Ortak istemci bileşeni `components/shared/student-picker.tsx` (Parça 1'de yazılır, Parça 2 kullanır). Saf hesaplar `src/lib/resources/`, `src/lib/youtube/`, `src/lib/text/`; hiçbir `features/*` dosyasını import etmezler.

**Kapsam dışı:** otomatik video önerisi (YouTube'da arama), izleme süresi ölçümü ve IFrame Player API ile otomatik "izlendi" (03 §4.5'teki %90 notu iptal), kitap içeriği/PDF/kapak görseli (`cover_path`, `resource-covers` bucket; D10), bildirimler (Faz 8), veli arayüzü (Faz 8 `parentSummary` kartı; §6), soru kartları ve tekrar sistemi, `mistakes.section_id`, deneme kataloğunun kopyalanması, video sıralamasını elle değiştirme (YouTube sırası / ekleme sırası), koçun öğrenci adına test kaydı girmesi. Kapsam dışı bir öğe tasarımda görünse bile eklenmez; önce sor.

## 1. Veri modeli (03'e eklenecek hali)

### 1.1 Enum'lar (Parça 1, migration `faz7a_enums`)

```sql
create type public.resource_type as enum ('lecture_book', 'question_bank', 'worksheet', 'booklet', 'mock_book', 'other');
alter type public.plan_item_kind add value 'section';
alter type public.plan_item_kind add value 'video';
```

Enum değerleri **ayrı migration dosyasında**: Postgres yeni enum değerinin aynı transaction'da kullanılmasına izin vermez ("unsafe use of new value"); iki değer Parça 1'de birlikte eklenir, `video` Parça 2'ye kadar kullanılmaz (karar #32 / A13 kalıbı). Etiketler (`src/content/labels.ts`): `resourceTypeLabels` (Konu anlatımı, Soru bankası, Yaprak test, Fasikül, Deneme kitabı, Diğer), `planItemKindLabels` + `section` "Kaynak testi", `video` "Video".

### 1.2 Parça 1: Kaynaklar (`faz7a_resources`)

```sql
resources (                                        -- kitap; kurum kataloğu ya da öğrencinin özel kaynağı
  id uuid pk,
  organization_id uuid not null references organizations(id) on delete cascade,
  template_id uuid not null references curriculum_templates(id) on delete cascade,
  subject_id uuid references subjects(id) on delete restrict,        -- null = çok dersli kitap (testler ders taşır)
  student_id uuid references students(profile_id) on delete cascade,  -- null = kurum kataloğu (paylaşılan); dolu = yalnızca o öğrenci (D1)
  type resource_type not null default 'question_bank',
  title text not null,                             -- 1–120
  publisher text,                                  -- ≤ 60
  publish_year smallint,                           -- check between 2000 and 2100
  created_by uuid references profiles(id) on delete set null,   -- kim ekledi (öğrenci ya da koç); "Öğrenci ekledi" rozeti student_id'den
  created_at, updated_at
)
-- index (organization_id, title), (template_id), (subject_id), (student_id), (created_by)

resource_sections (                                -- test / bölüm
  id uuid pk,
  resource_id uuid not null references resources(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,   -- çok dersli kitapta dolu; tek dersli kitapta null (kitabın dersi geçerli)
  topic_id uuid references topics(id) on delete set null,
  title text not null,                             -- 1–60: 'Test 12'
  question_count smallint check (question_count between 1 and 200),
  page_start smallint, page_end smallint,          -- check (page_end is null or page_start is null or page_end >= page_start)
  sort_order smallint not null default 0,
  created_at, updated_at
)
-- index (resource_id, sort_order), (subject_id), (topic_id)

student_resources (                                -- atama
  student_id uuid references students(profile_id) on delete cascade,
  resource_id uuid references resources(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (student_id, resource_id)
)
-- index (resource_id), (assigned_by)

alter table question_logs add column section_id uuid references resource_sections(id) on delete set null;  -- + indeks
alter table plan_items   add column section_id uuid references resource_sections(id) on delete set null;  -- + indeks
```

03 §4.5 taslağından farklar: `cover_path` yok (D10); `student_resources.status` yok (bitmişlik türetilir; D11); `student_id` + `created_by` çifti (D1); `assigned_by` set null.

**Tek veri kaynağı (03 §4.5 notu, değişmez):** bir testin bittiği bilgisi ayrı tutulmaz; `question_logs.section_id = test` olan **en az bir** kayıt varsa test bitmiştir (aynı test ikinci kez çözülürse ikinci kayıt da aynı `section_id`'yi taşır; ilerleme `distinct section_id` sayar). Kaydı silmek işareti kaldırır. `source` kuralı: `plan_item_id` dolu → `'plan'` (mevcut), yoksa `section_id` dolu → `'resource'`, yoksa `'free'` (D12). Bir plan görevi `section` türündeyse kayıt hem `plan_item_id` hem `section_id` taşır.

**Yardımcılar (`private`, security definer, `set search_path = ''`, `plan_student` kalıbı):**

- `private.can_read_resource(p_resource_id) returns boolean` = `organization_id = my_org() and (student_id is null or can_read_student(student_id))`.
- `private.can_edit_resource(p_resource_id) returns boolean` = `organization_id = my_org() and ((student_id is null and my_role() in ('coach','owner')) or (student_id is not null and can_write_student(student_id)))` — koç/owner kurum kataloğunu ve kendi öğrencilerinin özel kaynağını düzenler; öğrenci yalnızca kendi özel kaynağını.

**RLS:**

| Tablo | Öğrenci | Koç | Veli | Owner |
|---|---|---|---|---|
| `resources` | S (kurum kataloğu + kendi özel); I (`student_id = auth.uid()`, `created_by` kendisi, `organization_id = my_org()`); U D (kendi özel; with check `student_id = auth.uid()` — öğrenci kaynağı paylaşıma açamaz) | S (kurum kataloğu + kendi öğrencilerinin özel); I (`student_id` null, `created_by` kendisi) ; U D (`can_edit_resource`; "Katalogda tut" = `student_id → null`) | S (kurum kataloğu + çocuğunun özel; Faz 8 ilerleme kartı için) | Tümü (kurum) |
| `resource_sections` | S (`can_read_resource`); I U D (`can_edit_resource`) | S; I U D (`can_edit_resource`) | S | Tümü |
| `student_resources` | S (kendi); I (`student_id = auth.uid()`, `assigned_by` kendisi, `can_read_resource(resource_id)` — katalogdaki mevcut kitabı kendine alır) ; D **yok** (koçun atamasını kaldıramaz; kendi özel kaynağını silince cascade) | S I D (`is_coach_of`; insert `assigned_by` kendisi) | S | Tümü |

Tablo yetkisi `authenticated`: `resources`, `resource_sections` S I U D; `student_resources` S I D (update `false`; `090` matrisinde 3 tablo × 4 satır). `is_coach_of` owner'ı kapsar. Şablon/ders/konu tutarlılığı (kaynak öğrencinin/kurumun şablonunda, testin dersi kitabın şablonunda, konu o derse ait) RPC ve eylemlerde doğrulanır (22023), politikada değil.

**RPC'ler (`faz7a_resource_rpcs_views`):**

| Fonksiyon | Tür | Ne yapar |
|---|---|---|
| `create_resource(p_resource jsonb, p_sections jsonb, p_assign_self boolean default false)` | **security invoker** (RLS uygulanır), `set search_path = ''` | Tek transaction: `resources` insert (`created_by` çağıran; öğrenci çağırıyorsa `student_id = auth.uid()` ve `template_id` öğrencinin şablonu — aksi `not_allowed` 42501), `p_sections = [{title, subject_id?, topic_id?, question_count?, page_start?, page_end?, sort_order}]` (0–400 satır; `too_many_sections`), ders şablonda / konu derse ait (`invalid_subject`, `invalid_topic`), `p_assign_self` ya da çağıran öğrenciyse `student_resources` satırı. Döner `uuid` |
| `move_resource_section(p_section_id uuid, p_direction text)` | security invoker (`move_topic` kalıbı) | Kardeşleri `(sort_order, created_at, id)` ile 1..n numaralar, komşuyla takas; RLS 0 satır → `not_allowed` |
| `complete_plan_item(p_item_id, p_note, p_log jsonb)` (replace) | mevcut security definer | `p_log.section_id` (yoksa `item.section_id`) `question_logs.section_id`'ye yazılır; `source = 'plan'` (D12). Parça 2 `video` eki §1.3 |
| `copy_weekly_plan` (replace, gerekirse) | mevcut | Kopyalanan kolon listesine `section_id` (Parça 2: `video_id`) |

Toplu test ekleme sonradan (mevcut kitaba) RPC gerektirmez: `resource_sections` tek `insert` ifadesi (çok satır, tek tablo; `addPlanItems` kalıbı). Konuya toplu eşleme tek `update … where id = any(...)`. Atama: `student_resources` tek `insert … on conflict do nothing` (çoklu öğrenci). "Katalogda tut": `update resources set student_id = null` (atama satırı kalır). "Kaldır": `delete` (testler cascade, `question_logs.section_id` ve `plan_items.section_id` set null — kayıt ve görev kalır, bağ kopar; onay metni "N soru kaydının kaynak bağı kalkacak").

**Görünümler (`security_invoker`):**

| Görünüm | Kolonlar | Kullanım |
|---|---|---|
| `v_student_resource_sections` | student_id, resource_id, resource_title, resource_type, section_id, section_title, subject_id (`coalesce(section, resource)`), subject_name, subject_short_name, subject_color, topic_id, topic_name, question_count, page_start, page_end, sort_order, done_at (`max(log_date)`; null = bitmedi), logs_count, open_plan_item_id (öğrencinin **yayınlanmış** planındaki tamamlanmamış `section_id` eşleşen en yeni öğe; yoksa null) | Öğrenci kitap detayı (bitenler işaretli), K2 sekmesi, planner havuzu `resources` (bitmemişler), öneri motoru `section` görevi (Parça 2), `createQuestionLog` açık plan bağı araması. Yalnızca **atanmış** kaynakların testleri (`student_resources ⋈`) |
| `v_student_resource_progress` | student_id, resource_id, sections_total, sections_done (`count(distinct section_id)`), questions_total (`sum(question_count)`), questions_done (`sum(total_count)` bağlı kayıtlar), percent (int; `sections_total = 0` → null), last_log_date | Öğrenci kitap listesi, K2 tablo, Faz 8 veli kartı |

`01 §5` "Kaynak ilerleme yüzdeleri" veli için bu görünümden (Faz 8).

### 1.3 Parça 2: Videolar (`faz7b_videos`)

```sql
video_playlists (
  id uuid pk,
  organization_id uuid not null references organizations(id) on delete cascade,
  template_id uuid not null references curriculum_templates(id) on delete cascade,
  subject_id uuid references subjects(id) on delete restrict,        -- null = karışık liste
  student_id uuid references students(profile_id) on delete cascade,  -- null = kurum kataloğu (D1 kalıbı)
  title text not null,                             -- 1–120 (YouTube'dan gelir, düzenlenebilir)
  channel_name text,                               -- ≤ 80
  youtube_playlist_id text,                        -- check (~ '^[A-Za-z0-9_-]{10,60}$'); null = elle kurulan liste (D3)
  imported_at timestamptz,                         -- son içe aktarma / yenileme
  created_by uuid references profiles(id) on delete set null,
  created_at, updated_at,
  unique nulls not distinct (organization_id, youtube_playlist_id, student_id)   -- aynı liste aynı kapsamda iki kez yok; form benzerini önerir
)
-- index (organization_id, title), (template_id), (subject_id), (student_id), (created_by)

videos (
  id uuid pk,
  playlist_id uuid not null references video_playlists(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,                             -- 1–200
  duration_seconds int check (duration_seconds >= 0),   -- API'den; elle eklemede boş olabilir
  sort_order smallint not null default 0,          -- YouTube sırası ya da ekleme sırası; elle sıralama yok
  created_at, updated_at,
  unique (playlist_id, youtube_video_id)
)
-- index (playlist_id, sort_order), (topic_id)

student_playlists (
  student_id uuid references students(profile_id) on delete cascade,
  playlist_id uuid references video_playlists(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (student_id, playlist_id)
)
-- index (playlist_id), (assigned_by)

student_video_progress (                            -- elle işaret; izleme süresi yok (D11)
  student_id uuid references students(profile_id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  watched_at timestamptz,                          -- null = izlenmedi (satır yalnızca not için açılmış olabilir)
  note text,                                       -- ≤ 300
  created_at, updated_at,
  primary key (student_id, video_id)
)
-- index (video_id)

alter table plan_items add column video_id uuid references videos(id) on delete set null;   -- + indeks
```

03 taslağından farklar: `sort_order` listede yok; `watched_seconds` yok, `completed_at` → `watched_at`; `student_id` özel liste kalıbı; `unique nulls not distinct`.

**Yardımcılar:** `private.can_read_playlist(p_playlist_id)`, `private.can_edit_playlist(p_playlist_id)` — `can_read_resource / can_edit_resource` ile aynı tanım.

**RLS:**

| Tablo | Öğrenci | Koç | Veli | Owner |
|---|---|---|---|---|
| `video_playlists`, `videos` | `resources` / `resource_sections` ile birebir | aynı | S | Tümü |
| `student_playlists` | `student_resources` ile birebir (I kendi; D yok) | S I D | S | Tümü |
| `student_video_progress` | S I U D (`can_write_student`; standart öğrenci verisi kalıbı 03 §5.2) | S I U D | S | Tümü |

Tablo yetkisi: `video_playlists`, `videos`, `student_video_progress` S I U D; `student_playlists` S I D.

**RPC'ler (`faz7b_video_rpcs_views`):**

| Fonksiyon | Tür | Ne yapar |
|---|---|---|
| `create_playlist(p_playlist jsonb, p_videos jsonb, p_assign_self boolean default false)` | security invoker | `create_resource` kalıbı: liste + videolar (0–200; `too_many_videos`) + isteğe bağlı kendine atama; öğrenci çağırıyorsa `student_id = auth.uid()`; konu şablonda (`invalid_topic`) |
| `import_playlist_videos(p_playlist_id uuid, p_videos jsonb)` | security invoker (`can_edit_playlist` → RLS) | "Listeyi yenile" ve tek video ekleme: `insert … on conflict (playlist_id, youtube_video_id) do update set title, duration_seconds, sort_order` (**`topic_id` korunur**); listeden çıkmış videolar **silinmez** (D4); `imported_at = now()`. Döner `{inserted, updated}` |
| `mark_video_watched(p_video_id uuid, p_watched boolean, p_student_id uuid default null)` | **security definer**; ilk satır `can_write_student(coalesce(p_student_id, auth.uid()))` ve `can_read_playlist(videonun listesi)` | `student_video_progress` upsert (`watched_at = now()` ya da null; not korunur); `p_watched` ise öğrencinin **yayınlanmış** planlarındaki tamamlanmamış `video_id` eşleşen öğeleri `completed_at = now()` yapar (D6). Geri almak plan görevine dokunmaz (öğrenci plandan geri alır). Döner `{completed_items int}` |
| `complete_plan_item` (replace) | mevcut | `item.kind = 'video'` ve `video_id` doluysa `student_video_progress.watched_at` upsert (aynı transaction; D6) |

Video notu tek tablo upsert (RLS), RPC gerektirmez. Tek video elle ekleme: sunucu eylemi anahtar varsa `videos.list` ile başlık/süre çeker, yoksa başlık zorunlu; `import_playlist_videos` ile tek satır yazar.

**Görünümler:**

| Görünüm | Kolonlar | Kullanım |
|---|---|---|
| `v_student_playlist_videos` | student_id, playlist_id, playlist_title, subject_id, subject_name, subject_short_name, subject_color, video_id, youtube_video_id, title, duration_seconds, topic_id, topic_name, sort_order, watched_at, note, open_plan_item_id | Öğrenci liste detayı/oynatıcı, K2 sekmesi, havuz `videos` (izlenmemişler), öneri motoru `video` görevi. Yalnızca atanmış listeler |
| `v_student_playlist_progress` | student_id, playlist_id, videos_total, videos_watched, minutes_total, percent (int; 0 video → null) | Öğrenci liste kartları, K2, Faz 8 veli kartı ("izlenen video sayısı") |

### 1.4 Parça 2: Sezon kopyalama (`faz7b_copy_template`; D7)

```sql
copy_curriculum_template(p_template_id uuid, p_new_name text, p_new_season text, p_include_catalogs boolean default false) returns uuid
```

Security definer; ilk satır `my_role() = 'owner'` ve `can_read_template(p_template_id)` (sistem şablonu ya da kendi kurumu), değilse `not_allowed` 42501. Tek transaction: yeni `curriculum_templates` satırı (`organization_id = my_org()`, `based_on_id = p_template_id`, `is_published = false`, `exam_date` **null**, `scoring / exam_type / grade` kopya); `subjects` kopyalanır (eski→yeni eşleme geçici tablo); `topics` iki geçişte (önce üst konular, sonra `parent_id` yeniden eşlenir), `school_finish_on` **null** (owner "Sıradan dağıt" ile 30 saniyede doldurur; 09 §1.3), `sort_order / importance / semester / estimated_minutes / external_code` kopya. `p_include_catalogs` ise şablona bağlı **kurum kataloğu** (`student_id is null`) `resources` + `resource_sections` (konu/ders yeniden eşlenir) ve `video_playlists` + `videos` kopyalanır; özel kaynaklar, atamalar, `mock_exams`, öğrenci verisi kopyalanmaz. Döner yeni şablon id. Ad tekrarı `unique (organization_id, name)` yoksa yalnızca form uyarısı.

### 1.5 pgTAP

| Dosya | Kapsam |
|---|---|
| `240_resources.test.sql` (P1) | 3 tablo 5 senaryo; özel kaynak: öğrenci A kendi özel kaynağını görür/düzenler, öğrenci B görmez (0 satır), A `student_id`'yi null yapamaz (with check), koç X A'nın özelini görür ve "Katalogda tut" yapar, koç Y göremez; öğrenci katalog kitabını kendine atar (insert), koçun atamasını silemez (0 satır), koç siler; veli çocuğunun atamasını ve katalog kitabını görür; `anon` 42501; `create_resource` (öğrenci → özel + atama; koç → katalog; başka şablon 42501; geçersiz konu 22023 ve atomik; 401 test 22023); `move_resource_section` sıralama ve yetki; `question_logs.section_id` set null; `complete_plan_item(p_log.section_id)` kaydı `section_id + plan_item_id` ile açar; iki görünüm RLS + `done_at` / `percent` / `open_plan_item_id` (taslak plan sayılmaz) |
| `250_videos.test.sql` (P2) | 4 tablo 5 senaryo (240 kalıbı); `unique nulls not distinct` 23505; `youtube_video_id` check 23514; `create_playlist`, `import_playlist_videos` (yeniden içe aktarmada `topic_id` korunur, çıkan video kalır), `mark_video_watched` (upsert, yayınlanmış plan öğesi tamamlanır, taslak dokunulmaz, geri alma planı geri almaz, koç öğrencisi için çağırır, başka koç 42501), `complete_plan_item` video → `watched_at`; görünümler RLS + `percent` |
| `255_copy_template.test.sql` (P2) | Owner kopyalar (ders/konu sayıları eşit, `parent_id` yeni şablona işaret eder, `school_finish_on` ve `exam_date` null, `based_on_id`), `include_catalogs` ile kaynak/test/liste/video sayıları eşit ve konu eşlemesi yeni şablonda, özel kaynak kopyalanmaz; koç 42501; başka kurumun şablonu 42501 |
| `090_schema_guards` | 7 tablo × 4 satır (`student_resources`, `student_playlists` update `false`); RPC execute grant'ları; görünümler otomatik |
| `110_cascade` | Öğrenci silinince özel kaynağı/listesi, atamaları ve izleme satırları gider; katalog kalır, `created_by` set null; kaynak silinince `question_logs.section_id` set null |

## 2. Parça sınırları

### Parça 1: Kaynak kataloğu ve öğrenci kaynak takibi (`resources`, `question-log`, `planner`, `core`)

**Dosyalar**

- Migration: `faz7a_enums` (§1.1), `faz7a_resources` (tablolar, yardımcılar, grant + politikalar, indeksler, iki `alter table`), `faz7a_resource_rpcs_views` (§1.2 RPC'ler + görünümler + `complete_plan_item` / `copy_weekly_plan` replace); testler `240`, `090`, `110`; `db:types`.
- `src/lib/resources/sections.ts` (+test): `generateSections`, `resourceProgress` (§3.1). `src/lib/text/similar.ts` (+test): `normalizeTitle`, `similarTitles`. `src/lib/plan/task-title.ts`: `section` ("Tonguç Mat SB · Test 12 · 20 soru") ve `video` ("Video: Üslü İfadeler 1 · 12 dk") dalları (exhaustive switch zorlar).
- `src/components/shared/quick-log-context.tsx`: `QuickLogSection = { id; title; resourceTitle; subjectId: string | null; topicId: string | null; questionCount: number | null }`, `QuickLogRequest + section?`. `src/components/shared/student-picker.tsx` (istemci; `ResponsiveSheet`, öğrenci onay kutuları, atanmışlar işaretli + devre dışı, "N öğrenciye ata"; Parça 2 aynı bileşeni kullanır).
- `features/question-log`: `schemas.ts` `createQuestionLogSchema + sectionId?`, `updateQuestionLogSchema` `section_id`'ye dokunmaz; `actions.ts createQuestionLog`: `planItemId` doluysa RPC (`p_log.section_id`); yoksa `sectionId` doluysa `v_student_resource_sections.open_plan_item_id` bakılır → varsa RPC, yoksa insert `{ section_id, source: 'resource' }`; `revalidate` + `/student/resources`; `quick-log-sheet.tsx`: `section` gelince ders/konu ön dolu (ders çipleri kilitlenmez, plan kalıbı), başlık "Testi kaydet", açıklama "Tonguç Mat SB · Test 12 · 20 soru"; `questionCount` varsa **Boş otomatik** (`autoBlank`, `lib/exam/mock`; düzenlenebilir; D14); D+Y+B > sayı ise satır hatası; gönderim `{ sectionId, planItemId }`. Kayıt listesi (`/student/logs`, K2 Sorular) satırında "Tonguç Mat SB · Test 12" (embed `resource_sections(title, resources(title))`; RLS okur).
- `features/resources/`: `module.ts` (mevcut manifest + `coachStudentTabs: [{ segment: "resources", label: "Kaynaklar", order: 70 }]`, `dependsOn: ["topics", "question-log"]`), `index.ts`, `schemas.ts` (`resourceSchema`: title 1–120, publisher ≤ 60, publishYear 2000–2100 | null, type, subjectId | null; `sectionBatchSchema`: prefix (varsayılan "Test", 1–20), from ≥ 1, to ≥ from, `to − from + 1 ≤ 200`, questionCount 1–200 | null, pageStart | null, pagesPerSection | null, subjectId (çok dersli kitapta zorunlu); `createResourceSchema` = resource + batches[] (kitap başına ≤ 400 test); `sectionSchema` (tek satır düzenleme); `addSectionsSchema`; `setSectionTopicsSchema` `{ resourceId, sectionIds[], topicId | null }`; `assignResourceSchema` `{ resourceId, studentIds[] }`; `keepInCatalogSchema`), `types.ts` (`Resource`, `ResourceSection`, `CatalogRow`, `StudentResourceRow`, `SectionRow`), `server/queries.ts` (`listCatalog()` → `{ shared: CatalogRow[]; studentAdded: (CatalogRow & { studentName })[] }` (koç: kendi öğrencileri; owner: hepsi), `getResource(id)` + testler + atanmış öğrenciler, `listCatalogTitles()` (benzer ad önerisi için; öğrenci: kurum kataloğu + kendi özel), `listStudentResources(studentId)` (`v_student_resource_progress`), `getStudentResource(studentId, resourceId)` (`v_student_resource_sections`), `listStudentsForAssign(resourceId)`), `server/actions.ts` (`createResource` → RPC; öğrenci: özel + kendine atama, koç/owner: katalog; `updateResource`, `deleteResource`, `addSections` (batch → `generateSections` → tek insert), `updateSection`, `deleteSection`, `setSectionTopics`, `moveSection` → RPC, `assignResource` (tek insert `on conflict do nothing`), `unassignResource`, `keepInCatalog`, `selfAssignResource` (öğrenci; öneriden mevcut kitabı seçince)), bileşenler: `resource-form.tsx` (istemci, `ResponsiveSheet` ya da sayfa; ad alanının altında `similarTitles` ile canlı öneri kutusu "Bunu mu demek istedin: Tonguç Matematik Soru Bankası → Seç" — öğrenci seçince `selfAssignResource` + detaya gider, koç seçince mevcut kaydı açar; yayınevi, yıl, tür çipleri, ders çipi + "Çok dersli"), `section-batch-form.tsx` ("Test 1 – 40 · her biri 20 soru · sayfa başlangıcı / test başına sayfa (isteğe bağlı)"; çok dersli kitapta ders çipi; canlı önizleme "40 test · 800 soru · s. 12–171"; yeni kitap formunda birden fazla parti eklenebilir (çok dersli), mevcut kitapta "Test ekle"), `section-editor.tsx` (koç ve kendi özel kaynağında öğrenci: satır = onay kutusu · başlık · ders rozeti · konu · soru · sayfa · ↑↓ · düzenle; çoklu seçim → "Konuya eşle" (seçili satırların dersine göre ünite konuları, `NativeSelect`) ve "Sil"; satır düzenleme `ResponsiveSheet`), `resource-catalog.tsx` (koç tablo: ad, yayınevi, tür, ders, test sayısı, atanan öğrenci; telefonda kart; altında "Öğrenci ekledi" bölümü: öğrenci adı, kitap, test sayısı, "Katalogda tut" / "Kaldır" (onaylı)), `assign-button.tsx` (`StudentPicker` sarmalayıcı → `assignResource`; toast "3 öğrenciye atandı"), `student-resource-list.tsx` (clay kartlar: `SubjectBadge`/"Çok dersli", ad, yayınevi, `ProgressBar` (`ink-900` doluluk; ders rengi yok, fosforlu yok) + "%42 · 17 / 40 test"; "+ Kaynak ekle"), `student-resource-detail.tsx` (istemci; test satırları: bitenler `Check` ikonu + tarih, bitmemişler dokununca `useQuickLog().open({ section })` (`open_plan_item_id` doluysa `planItem` da geçirilir → tek RPC ile görev tamamlanır); çok dersli kitapta ders rozeti satırda; kendi özel kaynağıysa "Düzenle" → `section-editor`), `resource-progress-table.tsx` (K2: kitap satırı `%` + `details` ile test ızgarası; "Kaynak ata" düğmesi).
- Rotalar (her segmentte `loading.tsx` + `error.tsx`): öğrenci `app/(student)/student/resources/page.tsx`, `resources/new/page.tsx`, `resources/[resourceId]/page.tsx` (`?edit=1` kendi özel kaynağında); koç `app/(coach)/coach/resources/page.tsx`, `resources/new/page.tsx`, `resources/[resourceId]/page.tsx` (test editörü + atama), K2 `coach/students/[studentId]/resources/page.tsx`. "Ben" sayfasına "Kaynaklarım" bağlantısı (`enabled.has("resources")`; masaüstü rayı zaten var). `[section]` yer tutucusu bu rotaların önüne düşer.
- `features/planner`: `lib/kinds.ts` + `section` (`BookOpenIcon`, `questions`, `completeMode: "quick-log"`) ve `video` (`PlayIcon`, `minutes`, `completeMode: "watch"` — yeni değer; Parça 2 kart davranışı); `KIND_ORDER` değişmez (bu iki tür formdaki tür çiplerinde **yok**; havuzdan ve öneriden gelir, düzenlemede tür sabit); `types.ts` `PoolTask + sectionId?: string; videoId?: string`, `PlanItem + sectionId, videoId, videoPlaylistId (null)`, `TaskPoolCategoryId + "resources" | "videos"`; `lib/pool.ts` sıra: öneriler, okulun gerisinde, zayıf, başlanmamış, tekrar zamanı, **kaynaklar, videolar**, sık kullanılan; `lib/media-pool.ts` (+test): `sectionsToPoolItems(rows, { alertTopicIds: Map<topicId, priority>, pace, defaults })` (bitmemiş testler; konu eşleşmesi zayıf/gecikmiş uyarıda olanlar `KIND_PRIORITY` sırasıyla öne, sonra kitap/test sırası; `reason` "Zayıf konu: Üslü İfadeler"; en fazla 40 öğe, arama havuzda var), Parça 2 `videosToPoolItems`; `schemas.ts` `planItemKindValues` + 2, `itemFields + sectionId | null, videoId | null`, `refineItem`: `section → sectionId` zorunlu; `server/actions.ts` (`resolveTitle` tür birliği, `addPlanItems` / `updatePlanItem` / `prepareSuggestedPlan` kolonlar), `server/queries.ts` (`getWeekPlan` seçimine iki kolon; `getResourcePoolRows(studentId)` `v_student_resource_sections` bitmemişler), `components/plan-task-card.tsx` (`section` → `open({ planItem, section })`), `plan-item-card.tsx` / `task-pool.tsx` ikon; `plan/page.tsx` havuza `resources` kategorisi (`enabled.has("resources")`; kapalıysa kategori boş metin "Kaynaklar modülü kapalı").
- `features/core`: Ben bağlantısı; `student-admin-actions` değişmez (cascade yeter).
- `content/labels.ts`: `resourceTypeLabels`, `planItemKindLabels` (+2), havuz başlıkları.
- e2e `resources.spec.ts` (masaüstü koç + mobil öğrenci; teardown `deleteE2EResources` "E2E Kaynak%"): koç katalogda "E2E Kaynak Mat" tanımlar (Test 1–10 × 20 soru, sayfa 10'dan 4'er) → Test 1–3'ü Üslü İfadeler'e eşler → e2e öğrencisine atar → öğrenci listede %0 → detay → Test 2'ye dokunur → hızlı kayıt ders Mat / konu Üslü / "Boş 0" otomatik → D 18 Y 2 → kaydeder → satır işaretli, %10 → koç K2 %10 ve kayıt listesinde "Test 2"; koç havuz "Kaynaklar" kategorisinden Test 5'i güne ekler → yayınlar → öğrenci plan kartı "E2E Kaynak Mat · Test 5 · 20 soru" → tamamlar (hızlı kayıt) → kaynak detayında Test 5 bitti, `question_logs` satırı `plan_item_id + section_id`; öğrenci "+ Kaynak ekle": "E2E Kaynak" yazınca öneri kutusunda "E2E Kaynak Mat" çıkar → yine de yeni kitap "E2E Kaynak Fen" (Test 1–5) kaydeder → listesinde görünür → koç kataloğunda "Öğrenci ekledi" bölümünde → "Katalogda tut" → üst tabloya geçer → "Kaldır". Bağımlılık: kurum kataloğu; `desktop-chromium`'da benzersiz adla (`e2e/shared` gerekmez).
- `pnpm screenshots --only 7` → `docs/tasarim/uygulama-7/`: `ogrenci-kaynaklar-390`, `ogrenci-kaynak-detay-390`, `ogrenci-kaynak-ekle-390` (öneri kutusu açık), `koc-kaynak-katalog-1440`, `koc-kaynak-detay-1440`, `koc-kaynaklar-sekmesi-1440`, `koc-plan-havuz-kaynaklar-1440`.
- Seed (`f0…`/`f1…` kimlikler): "Demo Yayınları Matematik Soru Bankası" (MAT, 20 test × 20 soru, Test 1–4 → ilk iki Mat konusu; Ayşe ve Mehmet'e atanmış); Ayşe'nin **mevcut** Matematik kayıtlarından 6'sına `section_id` yazılır (yeni kayıt eklenmez; uyarı/e2e sayımları değişmez) → %30; Mehmet için özel "Fen Fasikülü" (`student_id` Mehmet, 8 test; "Öğrenci ekledi" görüntüsü).

**Kaynak ekleme akışı (koç, hedef 3–4 dk):** ad (öneri kutusu) → yayınevi/yıl/tür/ders → "Test 1–40, 20 soru" partisi (çok dersli kitapta ders başına parti) → kaydet (RPC) → detayda konuya eşleme: satırları seç → "Konuya eşle" → ata. Öğrenci aynı formu clay yüzeyde kullanır; kaydettiğinde kitap kendisine atanmış olarak listesinde belirir.

**Kabul:** koç 40 testlik kitabı tek partide tanımlar, konuya eşler, 2 öğrenciye tek tıkla atar (e2e); öğrenci testi işaretleyince hızlı kayıt ön dolu açılır ve kaynak yüzdesi güncellenir (e2e; 01 Faz 7 kabulü); plan görevi `section` türü hızlı kayıtla tamamlanır ve kayıt iki bağı taşır (e2e + pgTAP); öğrencinin eklediği kaynak yalnızca kendisine görünür, koç "Katalogda tut" yapar (pgTAP + e2e); benzer ad önerisi (birim + e2e); `generateSections`, `resourceProgress`, `similarTitles`, `sectionsToPoolItems` birim testli; `pnpm check` + `pnpm db:test` yeşil.

### Parça 2: Video kataloğu, öğrenci video takibi, havuz/öneri bağı, sezon kopyalama (`videos`, `analytics`, `planner`, `topics`)

**Dosyalar**

- Migration: `faz7b_videos`, `faz7b_video_rpcs_views` (+ `complete_plan_item` / `copy_weekly_plan` replace), `faz7b_copy_template`; testler `250`, `255`, `090`, `110`; `db:types`.
- `src/lib/env.ts`: `serverEnv.youtubeApiKey: string | null` (isteğe bağlı; yoksa içe aktarma kapalı, elle ekleme açık). `.env.example` yorumu "Faz 5" → "Faz 7".
- `src/lib/youtube/url.ts` (+test): `parseYoutubeUrl`; `duration.ts` (+test): `parseIsoDuration`; `progress.ts` (+test): `playlistProgress`, `videoMinutes` (§3.1).
- `features/videos/server/youtube.ts` (`import "server-only"`): `fetchPlaylist(playlistId, { apiKey, fetchImpl?, maxVideos = 200 })` → `playlists.list` (başlık, kanal) + `playlistItems.list` (sayfalı, `maxResults 50`) + `videos.list` (`contentDetails.duration`; 50'lik gruplar) → `{ title, channelName, videos: [{ youtubeVideoId, title, durationSeconds, sortOrder }] }`; özel/silinmiş videolar (`privacyStatus` ≠ public/unlisted ya da `videos.list`'te dönmeyen) atlanır; `fetchVideo(videoId)`. Hatalar `YoutubeError(code: "no_key" | "not_found" | "quota" | "forbidden" | "network" | "invalid_url")`; eylem Türkçe'ye çevirir: "YouTube API anahtarı tanımlı değil (YOUTUBE_API_KEY); videoyu elle ekleyebilirsin" · "Liste bulunamadı; bağlantıyı ve listenin herkese açık ya da liste dışı olduğunu kontrol et" · "YouTube günlük kotası doldu; yarın tekrar dene ya da videoyu elle ekle" · "YouTube'a ulaşılamadı; tekrar dene". 200'den uzun listede ilk 200 alınır ve toast "İlk 200 video alındı" (D9). Birim test: `fetchImpl` ile 2 sayfalı fixture JSON (`src/features/videos/server/__fixtures__/`), kota hatası eşlemesi, özel video atlama, süre ayrıştırma.
- `features/videos/`: `module.ts` (+ `coachStudentTabs: [{ segment: "videos", label: "Videolar", order: 75 }]`), `index.ts`, `schemas.ts` (`importPlaylistSchema` `{ url, subjectId | null }`; `playlistSchema` (elle liste: title, subjectId); `addVideoSchema` `{ playlistId, url, title?, topicId? }` (anahtar yoksa `title` zorunlu — sunucu karar verir); `updateVideoSchema`; `setVideoTopicsSchema` `{ playlistId, videoIds[], topicId | null }`; `assignPlaylistSchema`; `markWatchedSchema` `{ videoId, watched }`; `videoNoteSchema` `{ videoId, note ≤ 300 }`), `types.ts`, `server/queries.ts` (`listCatalog()`, `getPlaylist(id)`, `listCatalogTitles()`, `listStudentPlaylists(studentId)` (progress görünümü), `getStudentPlaylist(studentId, playlistId)` (videos görünümü), `resolveWatch(videoId)` → `{ playlistId }` (RLS)), `server/actions.ts` (`importPlaylist` (url → `fetchPlaylist` → `create_playlist`; öğrenci: özel + kendine atama; aynı liste zaten varsa 23505 → "Bu liste zaten katalogda: … → Aç/Kendine ata"), `refreshPlaylist` → `fetchPlaylist` → `import_playlist_videos`, `createManualPlaylist`, `addVideo` (url → anahtar varsa `fetchVideo` → `import_playlist_videos` tek satır), `updateVideo`, `deleteVideo`, `setVideoTopics`, `assignPlaylist`, `unassignPlaylist`, `keepInCatalog`, `deletePlaylist`, `selfAssignPlaylist`, `markVideoWatched` → RPC, `setVideoNote` (upsert)), bileşenler: `playlist-import-form.tsx` (istemci; URL alanı + ders çipi; "İçe aktar" → bekleme durumu "YouTube'dan alınıyor…" → sonuç toast "32 video alındı"; anahtar yoksa alanın altında nötr not + "Elle liste kur" bağlantısı; benzer ad önerisi `similarTitles` (Parça 1 ortak)), `playlist-form.tsx` (elle liste), `video-editor.tsx` (satır: onay kutusu · sıra · başlık · süre (`formatDuration`) · konu · düzenle/sil; çoklu seçim → "Konuya eşle"; "Video ekle" (URL + isteğe bağlı başlık); "Listeyi yenile" (YouTube listesi); küçük resim **yok** — `i.ytimg.com` isteği gitmesin; D15), `video-catalog.tsx` (koç tablo + "Öğrenci ekledi" bölümü, Parça 1 kalıbı), `assign-button.tsx` (`StudentPicker`), `student-playlist-list.tsx` (clay kartlar: ad, kanal, `ProgressBar` + "%40 · 4 / 10 video · 1 sa 20 dk kaldı"; "+ Liste ekle"), `student-playlist-player.tsx` (istemci; üstte oynatıcı `<iframe src="https://www.youtube-nocookie.com/embed/{id}?rel=0&modestbranding=1" title=… allow="…" loading="lazy">` 16:9, `?v=` parametresiyle seçili video (varsayılan ilk izlenmemiş); altında "İzledim" (toggle; fosforlu **yok** — tamamlanan görev kuralı plan kartında kalır, izlenen video satırı `Check` + `ink-500`), not alanı ("Not", 300, kaydet), "Sonraki video"; video listesi satırları (izlenenler işaretli, süre); klavye: liste düğmeleri, oynatıcı iframe kendi odağı), `video-progress-table.tsx` (K2).
- Rotalar: öğrenci `app/(student)/student/videos/page.tsx`, `videos/new/page.tsx`, `videos/[playlistId]/page.tsx` (`?v=`), `videos/watch/[videoId]/page.tsx` (`resolveWatch` → `redirect('/student/videos/[playlistId]?v=')`; plan kartı bunu kullanır), koç `coach/videos/page.tsx`, `videos/new`, `videos/[playlistId]`, K2 `coach/students/[studentId]/videos/page.tsx`. "Ben" sayfasına "Videolarım".
- `features/planner`: `plan-task-card.tsx` `video` türü: birincil eylem "İzle" (`Link` → `/student/videos/watch/[videoId]`; `video_id` boşsa (silinmiş) "Tamamla" dokunuşu), tamamlama oynatıcıdaki "İzledim" ile RPC'den gelir (D6), kartta ayrıca "Tamamla" ikincil (izlemeden işaretleme); `lib/media-pool.ts videosToPoolItems` (izlenmemiş videolar, aynı öne çıkarma kuralı; `estimatedMinutes = videoMinutes(duration)`; `reason` "Zayıf konu: …"); `getVideoPoolRows(studentId)`; `plan/page.tsx` `videos` kategorisi; `copy_weekly_plan` `video_id`.
- `features/analytics`: `types.ts` `TopicMedia = { video?: { videoId; title; minutes }; section?: { sectionId; title; questionCount | null; resourceTitle } }`; `lib/suggestions.ts` `buildSuggestions({ …, media?: ReadonlyMap<`${studentId}:${topicId}`, TopicMedia> })` ve `alertToTask(alert, planner, media?)`: `knowledge_gap | not_started | behind_school` + `media.video` → `{ kind: "video", videoId, estimatedMinutes: videoMinutes, targetUnit: "minutes", title: "Video: …" }`; `low_accuracy | mock_weak` + `media.section` → `{ kind: "section", sectionId, targetValue: questionCount, targetUnit: "questions", title }` (D5); medya yoksa mevcut tablo → Faz 4/5/6 testleri aynen; `SuggestionTask + sectionId?, videoId?`; `strategyNote` değişmez; `server/queries.ts getSuggestions`: modüller açıksa `v_student_playlist_videos` (izlenmemiş, konu dolu; liste/sıra ile ilk) ve `v_student_resource_sections` (bitmemiş, konu dolu; ilk) → `media` haritası; `suggestionsToPoolItems` ve `AddSuggestionButton` / `prepareSuggestedPlan` `sectionId/videoId` geçirir; `SuggestionList` satırında tür ikonu (`KIND_SPECS` planner'da → analytics ikon alamaz; etiket metni `planItemKindLabels` yeter: "Video · 12 dk").
- `features/topics` (D7): `schemas.ts copyTemplateSchema` `{ templateId, name 1–60, season 'YYYY-YYYY', includeCatalogs }`, `actions.ts copyTemplate` → RPC (owner), `components/template-copy-form.tsx` (`ResponsiveSheet`: ad (varsayılan "LGS 2028"), sezon, onay kutusu "Kaynak ve video kataloglarını da kopyala"; sonuç toast "Şablon kopyalandı; sınav tarihi ve okul takvimi boş"), `/coach/templates?template=<id>` seçici (kurumda birden fazla şablon varsa `NativeSelect`; `getTemplateEditor(templateId?)` varsayılan mevcut davranış); yeni öğrenci formu zaten kurum şablonlarını listeler (`listCatalogTemplates` / mevcut şablon seçimi — doğrulanır).
- `content/labels.ts`: havuz `videos` başlığı, YouTube hata metinleri eylemde (etiket değil).
- e2e `videos.spec.ts` (masaüstü koç + mobil öğrenci; YouTube API **çağrılmaz** — CI'da anahtar yok, D17; teardown `deleteE2EPlaylists` "E2E Liste%"): koç "Elle liste kur" → "E2E Liste Mat" → "Video ekle" (URL `https://youtu.be/dQw4w9WgXcQ`, başlık "E2E Video 1"; ikinci `watch?v=…`) → Video 1'i Üslü İfadeler'e eşler → e2e öğrencisine atar → öğrenci listede %0 → detay: `iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]` → "İzledim" → satır işaretli, %50 → not yazar → koç K2 %50 ve not; koç havuz "Videolar" → Video 2'yi güne ekler → yayınlar → öğrenci plan kartı "İzle" → oynatıcı `?v=` → "İzledim" → plan kartı tamamlandı (RPC bağı); öneri: yeni e2e öğrencisine liste atanır → K1 önerilerinde ilk başlanmamış Mat konusu için "Video · …" görevi (`not_started` + eşleme) → "Plana ekle" → taslakta `video` türü; owner "Şablonu kopyala" (ad "E2E Şablon", kataloglarla) → `/coach/templates?template=` seçicide görünür, ders/konu sayısı eşit, kaynak/liste sayısı eşit → teardown şablonu siler (`deleteE2ETemplates`; cascade). Kurum ayarı/sistem şablonu değişmediği için `e2e/shared` gerekmez.
- Yerel elle doğrulama (anahtarla, kabul ölçütü): gerçek bir herkese açık liste bağlantısı → başlık/süre/sıra dolu; yeniden içe aktarma konuyu korur; kota/404 mesajları anahtarı bozarak / sahte id ile görülür.
- `pnpm screenshots --only 7`: `ogrenci-videolar-390`, `ogrenci-video-oynatici-390`, `ogrenci-video-ekle-390`, `koc-video-katalog-1440`, `koc-video-detay-1440`, `koc-videolar-sekmesi-1440`, `koc-plan-havuz-videolar-1440`, `koc-oneriler-video-1440`, `koc-sablon-kopyala-1440`.
- Seed: "Demo Matematik Video Dersleri" (elle liste, `youtube_playlist_id` null; 6 video, ilk üçü ilk Mat konularına eşli; kimlikler `demo0000001`… biçiminde **yer tutucu** — yerelde oynatıcı "video kullanılamıyor" gösterir, owner gerçek liste içe aktarır; D16), Ayşe ve Mehmet'e atanmış, Ayşe 2 izlemiş (biri notlu).

**Kabul:** koç bir YouTube liste bağlantısı yapıştırınca videolar başlık/süre/sırayla gelir (yerel elle + birim fixture; 01 Faz 7 kabulü); anahtar yokken elle liste ve video eklenir (e2e); öğrenci uygulama içinde izler, "İzledim" yüzdeyi ve bağlı plan görevini günceller (e2e + pgTAP); havuz `videos`/`resources` kategorileri ve zayıf konu öne çıkarma (birim); bilgi eksiği / başlanmamış konuya eşli video varsa öneri `video` türünde (birim + e2e); owner şablonu kataloglarla kopyalar (pgTAP + e2e); `parseYoutubeUrl`, `parseIsoDuration`, `playlistProgress`, `videosToPoolItems`, `alertToTask(media)` birim testli; `pnpm check` + `pnpm db:test` yeşil.

## 3. Ortak yapılar

### 3.1 Saf fonksiyonlar

```ts
// src/lib/resources/sections.ts
export type SectionDraft = { title: string; questionCount: number | null; pageStart: number | null; pageEnd: number | null; sortOrder: number; subjectId: string | null };
export function generateSections(input: {
  prefix: string; from: number; to: number;                // "Test", 1, 40 → "Test 1" … "Test 40"
  questionCount: number | null;
  pageStart: number | null; pagesPerSection: number | null; // ikisi doluysa sayfa aralığı: [start + i·n, start + (i+1)·n − 1]
  startSortOrder: number; subjectId: string | null;
}): SectionDraft[];                                          // to < from ya da > 200 → boş dizi (form zaten engeller)
export function resourceProgress(sections: readonly { id: string; questionCount: number | null }[], doneIds: ReadonlySet<string>)
  : { total: number; done: number; percent: number | null; questionsTotal: number };   // percent = round(done/total×100); total 0 → null

// src/lib/text/similar.ts
export function normalizeTitle(s: string): string;          // küçük harf (Türkçe: İ→i, I→ı), noktalama/çoklu boşluk sadeleştirme, "yayınları/yayınevi/yay." gibi dolgu sözcükler atılır
export function similarTitles<T extends { title: string }>(query: string, candidates: readonly T[], opts?: { limit?: number; minScore?: number }): T[];
// skor = ortak token / birleşim (Jaccard) + önek eşleşmesi; query < 3 karakter → []; varsayılan limit 3, minScore 0,34

// src/lib/youtube/url.ts
export function parseYoutubeUrl(input: string): { kind: "playlist"; id: string } | { kind: "video"; id: string; listId?: string } | null;
// youtube.com/playlist?list=, watch?v=…&list=… (liste öncelikli değil: kind "video" + listId), youtu.be/ID, youtube.com/shorts/ID, embed/ID; çıplak 11 karakterlik id de video

// src/lib/youtube/duration.ts
export function parseIsoDuration(iso: string): number | null;   // "PT1H2M3S" → 3723; "P0D" (canlı) → 0; geçersiz → null

// src/lib/youtube/progress.ts
export function playlistProgress(videos: readonly { id: string; durationSeconds: number | null }[], watchedIds: ReadonlySet<string>)
  : { total: number; watched: number; percent: number | null; remainingMinutes: number };
export function videoMinutes(durationSeconds: number | null, fallback: number): number;   // max(5, ceil(s/60)); süre yoksa fallback (planner.link_minutes)

// features/planner/lib/media-pool.ts (features import etmez; yapısal tipler)
export function rankByAlerts<T extends { topicId: string | null }>(items: readonly T[], alertPriority: ReadonlyMap<string, number>): T[];
// eşleşen konu önce (küçük öncelik sayısı önce), sonra dizi sırası; kararlı
export function sectionsToPoolItems(rows, opts): TaskPoolItem[];   // kind "section", targetValue = question_count, estimatedMinutes = estimateMinutes(questions)
export function videosToPoolItems(rows, opts): TaskPoolItem[];     // kind "video", targetUnit "minutes", estimatedMinutes = videoMinutes
```

Tanımlar tek yerde: **bitmiş test** = öğrencinin o `section_id`'li en az bir `question_logs` kaydı; **izlenmiş video** = `student_video_progress.watched_at` dolu; **ilerleme** = bitmiş / toplam (kaynakta test, listede video; soru sayısına ağırlık yok); **kalan süre** = izlenmemiş videoların süre toplamı. Hepsi yapısal tip alır, tarih `lib/dates`, metin `lib/format`.

### 3.2 Havuz kategorileri ve görev türü sunumu

`TaskPoolCategoryId = "suggestions" | "behind" | "weak" | "not_started" | "review_due" | "resources" | "videos" | "frequent"`; sıra: öneriler, okulun gerisinde, zayıf konular, hiç başlanmamış, tekrar zamanı, **kaynaklar**, **videolar**, sık kullanılan. Boş metinler: `resources` "Atanmış kaynaklarda bitmemiş test yok" (modül kapalıysa "Kaynaklar modülü bu öğrencide kapalı"), `videos` "Atanmış listelerde izlenmemiş video yok". Öğe anahtarları `resources:${sectionId}`, `videos:${videoId}`. `KIND_SPECS` (08 §3.2): `section` → `{ icon: BookOpenIcon, defaultTargetUnit: "questions", needsTopic: false, needsUrl: false, completeMode: "quick-log" }`, `video` → `{ icon: PlayIcon, defaultTargetUnit: "minutes", needsTopic: false, needsUrl: false, completeMode: "watch" }`. `frequent` kategorisi `section`/`video` öğelerini **dışarıda bırakır** (`distinct (kind, title, …)` sorgusu iki türü eler; bağlı kimlik olmadan anlamsız).

### 3.3 Öneri motoru bağı

`buildSuggestions` imzası değişmez; `media` isteğe bağlı (09/10 kalıbı). Eşleme kuralı `alertToTask` içinde tek yerde: yeni konu / bilgi eksiği kategorisinde (`knowledge_gap`, `not_started`, `behind_school`) konuya eşli **izlenmemiş** video varsa görev `video`; pratik kategorisinde (`low_accuracy`, `mock_weak`) konuya eşli **bitmemiş** test varsa görev `section` (D5); `review_due / forgetting_risk / stale / neglected_subject` değişmez. Aynı konuda birden fazla eşleşme: listenin/kitabın sırasında ilk. Puan ve kota etkilenmez (tür değişir, öncelik değişmez). `strategyNote`'a ek yok; `reason` mevcut `alertReason`.

### 3.4 Yazım ve renk

- Öğrenci: "sen"; boş durumlar eylem önerir ("Henüz kaynağın yok. Koçun atadığında burada görünür; istersen kendi kitabını da ekleyebilirsin."); ilerleme çubukları `ink-900` (ders dışı metrik değil ama kitap ilerlemesi de ders rengi taşımaz — ders yalnızca rozet/şerit; 04 §4.2), fosforlu yalnızca tamamlanan plan görevi; "izledim" satırı nötr onay ikonu.
- Koç: nötr; "Öğrenci ekledi" rozeti `Badge` nötr (`bg-bg-sunken`), uyarı rengi yok; YouTube hataları sistem hatası kuralına göre ikon + metin + eylem ("Tekrar dene" / "Elle ekle").
- Veli: bu fazda ekran yok.
- Sayılar `formatPercent`, `formatCount(…, "test" | "video" | "soru")`, `formatDuration` (video süresi "12 dk", "1 sa 20 dk"), NBSP.
- Erişilebilirlik: test/video satırları 44 px; oynatıcı `iframe` `title` = video başlığı; "İzledim" `aria-pressed`; konu eşleme çoklu seçimi klavyeyle (onay kutuları + düğme); `prefers-reduced-motion` global.
- Gizlilik: oynatıcı `youtube-nocookie.com` (gelişmiş gizlilik modu), küçük resim/harici görsel yüklenmez (D15); YouTube'a giden istek aydınlatma metnine eklenir (§6 Faz 8 kancası).

## 4. YouTube Data API kurulumu (kullanıcının yapacağı)

1. **Google Cloud Console** → proje oluştur (ör. `pusula`) → *APIs & Services → Library* → **YouTube Data API v3** → *Enable*.
2. *APIs & Services → Credentials → Create credentials → API key* → anahtarı düzenle: *API restrictions → Restrict key → YouTube Data API v3* (yalnızca bu API); *Application restrictions: None* (sunucudan çağrılır; Vercel çıkış IP'leri sabit değil, HTTP referrer yok).
3. **Yerel:** `.env.local` → `YOUTUBE_API_KEY=<anahtar>`. `pnpm env:local` dosyayı yeniden yazıyorsa (`scripts/write-local-env.mjs`) anahtar korunmalı — Parça 2'de script mevcut ek anahtarları koruyacak şekilde düzeltilir (Parça 2 görevi); `.env.example` satırı kalır.
4. **Vercel:** *Settings → Environment Variables* → `YOUTUBE_API_KEY` (Production + Preview, *Sensitive*). `docs/07-bulut-kurulum.md` §3 tablosuna satır eklenir (Parça 2).
5. **Kota:** varsayılan 10.000 birim/gün; `playlists.list` + `playlistItems.list` + `videos.list` her biri 1 birim/çağrı → 200 videoluk liste ≈ 9 birim. Kota artırımı gerekmez. Kota dolunca uygulama anlaşılır mesaj verir, elle ekleme çalışmaya devam eder.
6. **CI / e2e:** anahtar gerekmez (D17). Anahtar yoksa içe aktarma düğmesi devre dışı + not; elle liste/video açık.
7. **KVKK:** oynatıcı Google sunucularından yüklenir; aydınlatma metninin sonraki sürümüne "video dersler YouTube (Google) üzerinden gösterilir" cümlesi (Faz 8 onay metni sürümü, `config/constants`).

## 5. Yeniden doğrulama

`createResource / updateResource / deleteResource / addSections / updateSection / deleteSection / setSectionTopics / moveSection / assignResource / unassignResource / keepInCatalog / selfAssignResource` → `/student/resources`, `/coach/resources`, `/coach/students`, `/coach/plans` (havuz); `createQuestionLog` (+ `sectionId`) → mevcut liste + `/student/resources`; video eylemleri → `/student/videos`, `/coach/videos`, `/coach/students`, `/coach/plans`; `markVideoWatched` → + `/student/plan`, `/student/today`; `copyTemplate` → `/coach/templates`, `/coach/students`. Dinamik sayfalar (`[resourceId]`, `[playlistId]`, K2 sekmeleri) `createAction` statik yol sınırı nedeniyle listede değil (09 uygulama notu kalıbı; dinamik render).

## 6. Faz 8+ kancası

| Yapı | Faz 7 | Sonraki ek |
|---|---|---|
| `v_student_resource_progress`, `v_student_playlist_progress` | Öğrenci/K2 | Faz 8 veli `parentSummary` kartı ("3 kitapta %42 · bu hafta 4 video"), haftalık özet; 01 §5 veli sütunları |
| `student_video_progress.watched_at` | Elle işaret | `v_student_daily_summary.videos_completed` + `goal_metric` `'videos'` (Faz 9 hedef türü); `study_sessions.kind = 'video'` süre kaydı (Faz 9 odak sayacı) |
| `resource_sections.topic_id`, `videos.topic_id` | Havuz/öneri eşlemesi | Konu hücresi detayında "Kaynak: 3 test (1 bitti) · Video: 2 (1 izlendi)" satırı (04 §9 masaüstü detay; `TopicMapCell` + iki sayım) |
| `mistakes` | — | `mistakes.section_id` (10 §5): hızlı kayıttan "yanlış ekle" kısayolu testi taşır |
| `copy_curriculum_template` | Şablon + kataloglar | Deneme kataloğu kopyası (10 §5) — tarihli olduğu için varsayılan dışı; okul tarihlerini yıl farkıyla kaydırma seçeneği |
| `create_playlist / import_playlist_videos` | Elle bağlantı | Faz 9+ otomatik öneri (`search.list`, 100 birim/çağrı — kota nedeniyle kapsam dışı) |
| Oynatıcı | `youtube-nocookie` iframe | IFrame Player API ile %90 otomatik işaret (istenirse; izleme süresi ölçümü kapsam dışı kararı değişirse) |
| Bildirimler | — | Faz 8: "koç kaynak/liste atadı" (öğrenci), "öğrenci kaynak ekledi" (koç) |
| `student_resources`/`student_playlists` | Atama | Öğrenci "listemden gizle" (`hidden_at`) ihtiyaç doğarsa |

## 7. Kararlar (2026-09-19, onaylandı)

Her satırda seçilen karar **kalın**; parça oturumları bunları verili kabul eder, faz sonunda 02 karar kaydına özetlenir (#49).

| # | Konu | Seçenekler | Öneri ve gerekçe |
|---|---|---|---|
| D1 | Öğrencinin eklediği kaynağın sahiplik/görünürlük alanı | (a) `student_id uuid null → students cascade` (null = kurum kataloğu) + `created_by` (denetim); (b) `is_shared boolean` + `created_by` | **(a)**: tek kolon hem sahibi hem görünürlüğü söyler; öğrenci silinince özel kaynağı cascade ile gider (b'de `created_by` set null → sahipsiz özel kaynak kalır); RLS `can_read_student(student_id)` ile mevcut yardımcılara oturur; "Katalogda tut" = `student_id → null`. `created_by` yine tutulur (koç mu öğrenci mi ekledi) |
| D2 | Test sıralaması | (a) `move_resource_section` RPC (↑↓, `move_topic` kalıbı); (b) sıralama yok (toplu üretim sırası) | **(a)**: istemde "sıralama" var; RPC ~30 satır, kalıp hazır. Video sıralaması yok (YouTube/ekleme sırası) |
| D3 | Tek video (liste dışı) | (a) elle kurulan liste kabı (`youtube_playlist_id` null), videolar her zaman bir listede; (b) `videos.playlist_id` nullable + ayrı atama tablosu | **(a)**: atama/ilerleme/havuz tek yoldan; koç "Kendi listem: Mat ek videolar" gibi bir kap açar |
| D4 | "Listeyi yenile" davranışı | (a) upsert: yeni eklenir, başlık/süre/sıra güncellenir, konu korunur, listeden çıkan video **kalır**; (b) çıkanlar silinir (izleme ve plan bağı gider) | **(a)**: veri kaybı yok; çıkan video izlenmediyse listede kalır, koç elle siler |
| D5 | Öneri motorunda `section` görevi | (a) yalnızca istemdeki kural (bilgi eksiği/başlanmamış → video); (b) ek olarak pratik türlerine (`low_accuracy`, `mock_weak`) eşli bitmemiş test varsa `section` | **(b)**: aynı `media` parametresi, `alertToTask`'ta bir dal daha; "40 soru çöz" yerine "Test 12'yi çöz" daha somut |
| D6 | Plan ↔ video çift yönlü bağ | (a) `mark_video_watched` açık plan görevini tamamlar **ve** `complete_plan_item(video)` izlendi yazar; (b) tek yön (plan → izlendi) | **(a)**: iki ekran tutarlı; geri alma tek yön (izlendi kaldırılınca plan görevi kalır, öğrenci plandan geri alır) |
| D7 | `copy_curriculum_template` | (a) Parça 2'de RPC + owner formu + `/coach/templates?template=` seçici; (b) yalnızca RPC (arayüz sonra); (c) Faz 7 dışı, sezon geçişi mini fazı (2027 yazı) | **(a)**: kapsam maddesi 6 bunu istiyor, fonksiyon yok; seçici olmadan kopya düzenlenemez. Kopyada `exam_date` ve `school_finish_on` boş bırakılır (owner doldurur), `mock_exams` kopyalanmaz |
| D8 | K2 sekmeleri | (a) iki sekme "Kaynaklar" (70) ve "Videolar" (75), registry'den; (b) tek "Kaynaklar" sekmesi altında iki bölüm (videos modülü resources'a sekme ekleyemez → kural bozulur) | **(a)**: registry kuralı; 11 sekme `TabNav` yatay kayar (telefonda zaten) |
| D9 | Öğrencinin YouTube içe aktarması | (a) açık (sunucu anahtarıyla; liste başına 200 video, kota 10k/gün); (b) öğrenci yalnızca elle liste/video | **(a)**: istem "video ekleme öğrenciye de açık"; kota bu ölçekte sorun değil; özel liste kalıbı aynı |
| D10 | Kapak görseli | (a) `cover_path` ve `resource-covers` bucket'ı **yok**; (b) 03 taslağındaki gibi | **(a)**: istemde yok, depo politikası + sıkıştırma maliyeti gereksiz; 03 §8 satırı silinir |
| D11 | Türetilen alanlar | `student_resources.status` ve `student_video_progress.watched_seconds` kaldırılır | **Kaldır**: tek veri kaynağı; "bitti" görünümden, izleme süresi kapsam dışı |
| D12 | `question_logs.source` | `plan_item_id` → `'plan'` (mevcut) · yoksa `section_id` → `'resource'` · yoksa `'free'` | **Bu kural**; kayıt listesinde kaynak etiketi `section_id` üzerinden, `source` bilgi amaçlı |
| D13 | Öğrenci nav | Masaüstü rayı (zaten var) + "Ben" bağlantıları "Kaynaklarım" / "Videolarım"; alt menü değişmez (04 §8.2) | **Böyle**; karar değil, teyit |
| D14 | Hızlı kayıtta test ön dolgusu | (a) ders/konu ön dolu + `question_count` varsa **Boş otomatik** (`autoBlank`, C4 kalıbı); (b) yalnızca ders/konu, üç alan elle | **(a)**: "3 dokunuş" hedefi; test soru sayısı biliniyor; D+Y aşarsa satır hatası |
| D15 | Video küçük resimleri | (a) yok (yalnızca metin + süre); (b) `i.ytimg.com` görselleri (`next/image` remotePatterns) | **(a)**: öğrenci sayfasında Google'a ek istek yok, koç editöründe gerek yok; gerekirse sonra |
| D16 | Seed video kimlikleri | (a) yer tutucu 11 karakter (`demo0000001`; yerelde "video kullanılamıyor"); (b) gerçek herkese açık eğitim videosu kimlikleri (kullanıcı verir) | **(a)** varsayılan; kullanıcı (b) için 6 bağlantı verirse seed onları kullanır |
| D17 | YouTube testi | (a) e2e elle liste/video yolu (anahtarsız), içe aktarma birim testte fixture JSON ile, gerçek API yerelde elle; (b) e2e'de gerçek API (CI secret) | **(a)**: CI'da dış bağımlılık ve kota yok; kabul ölçütü yerel elle doğrulama + fixture |

Verili kabul edilenler (istemden): tek koç ölçeği; öğrenci de kaynak/liste ekler ve eklediği kendine atanır; özel kaynak yalnızca o öğrenciye + koça görünür; koç "Katalogda tut" / "Kaldır"; benzer ad önerisi; tek veri kaynağı (`question_logs.section_id`); YouTube anahtarı yalnızca sunucuda; oynatıcı `youtube-nocookie`; izleme süresi yok; havuz `resources` / `videos` ve öneri motoru bağı; en fazla iki parça.

**Belge güncellemeleri (parça oturumlarında):** 03 §3 (`resource_type`, `plan_item_kind` +2), §4.5 (bu belgenin §1.2–1.3 hali; `cover_path`, `status`, `watched_seconds` kaldırıldı; `completed_at` → `watched_at`; %90 otomatik işaret notu iptal), §5.1 (4 yardımcı), §5.3 matris (7 satır; veli S), §5.4 test listesi, §6 görünümler (4 görünüm), §7 RPC (`create_resource`, `move_resource_section`, `create_playlist`, `import_playlist_videos`, `mark_video_watched`, `complete_plan_item` eki, `copy_curriculum_template` imzası), §8 depo (`resource-covers` satırı silinir), §9 seed; 02 klasör yapısı (`lib/resources`, `lib/youtube`, `lib/text`, `components/shared/student-picker`, iki modülün dosyaları) + karar #49 (D1–D17 özeti) + yığın notu (YouTube Data API v3, `fetch`, bağımlılık yok); 01 §11 Faz 7 (parça satırları, kabul) ve §5 (7/8 satırları "Veli" sütunu Faz 8 notu); 04 §10 envanteri (`StudentPicker`, `SectionEditor`, `PlaylistPlayer`); 07 §3 (`YOUTUBE_API_KEY`); 08 §5 / 09 §5 / 10 §5 Faz 7 satırları "✅ 11'de" notu; `.env.example` yorumu.
