# Veri Modeli

> Bu belge referanstır; gerçek şema `supabase/migrations/` altındaki dosyalardır. Tablolar fazlara göre ayrı migration dosyalarında oluşturulur. Buradaki DDL taslakları kolon adları, tipler ve kısıtlar için bağlayıcıdır; küçük iyileştirmeler yapılabilir ama belge de güncellenmelidir.

## 1. Genel Kurallar

- Tüm tablolar `public` şemasında; yardımcı güvenlik fonksiyonları `private` şemasında.
- Birincil anahtar: `id uuid primary key default gen_random_uuid()` (bağlantı tabloları hariç, onlarda bileşik anahtar).
- Her tabloda `created_at timestamptz not null default now()`; değişebilen tablolarda `updated_at` + `set_updated_at` tetikleyicisi.
- Tablo ve kolon adları İngilizce, `snake_case`, tablo adları çoğul.
- Enum değerleri İngilizce; Türkçe karşılıkları `src/content/labels.ts` içinde.
- Öğrenciye bağlı her tablo `student_id uuid not null references students(profile_id) on delete cascade` içerir → öğrenci silinince tüm verisi gider (KVKK silme hakkı).
- Her yabancı anahtar kolonuna indeks eklenir.
- **Her tabloda RLS açıktır.** RLS'si olmayan tablo migration incelemesinden geçmez.
- Politikalarda `auth.uid()` doğrudan değil `(select auth.uid())` biçiminde yazılır (Postgres sorgu başına bir kez hesaplar, performans için).

## 2. İlişki Diyagramı (özet)

```mermaid
erDiagram
  organizations ||--o{ profiles : has
  profiles ||--o| students : "is (role=student)"
  profiles ||--o{ students : "coaches"
  students ||--o{ student_parents : has
  profiles ||--o{ student_parents : "is parent"
  curriculum_templates ||--o{ subjects : has
  subjects ||--o{ topics : has
  topics ||--o{ topics : "parent"
  students }o--|| curriculum_templates : uses
  students ||--o{ student_topic_progress : tracks
  topics ||--o{ student_topic_progress : ""
  students ||--o{ question_logs : logs
  resources ||--o{ resource_sections : has
  resource_sections ||--o{ question_logs : "optional source"
  video_playlists ||--o{ videos : has
  students ||--o{ student_video_progress : watches
  students ||--o{ goals : has
  students ||--o{ weekly_plans : has
  weekly_plans ||--o{ plan_items : has
  mock_exams ||--o{ mock_exam_results : "taken as"
  students ||--o{ mock_exam_results : takes
  mock_exam_results ||--o{ mock_exam_subject_results : has
  mock_exam_results ||--o{ mock_exam_topic_mistakes : has
  students ||--o{ mistakes : records
  students ||--o{ coach_notes : about
  students ||--o{ student_modules : configures
```

## 3. Enum Tipleri

```sql
create type user_role            as enum ('owner', 'coach', 'student', 'parent');
create type student_status       as enum ('active', 'paused', 'archived');
create type parent_relation      as enum ('mother', 'father', 'guardian', 'other');
create type consent_type         as enum ('privacy_notice', 'explicit_consent', 'photo_upload');
create type topic_status         as enum ('not_started', 'studying', 'completed', 'needs_review', 'mastered');
create type resource_type        as enum ('lecture_book', 'question_bank', 'worksheet', 'mock_book', 'booklet', 'other');
create type question_source      as enum ('resource', 'plan', 'school', 'online', 'free');
create type goal_metric          as enum ('questions', 'correct', 'study_minutes', 'videos', 'topics_completed', 'sections_completed', 'mock_net', 'reading_pages');
create type goal_period          as enum ('daily', 'weekly', 'monthly', 'custom');
create type plan_status          as enum ('draft', 'published');
create type plan_item_kind       as enum ('topic_study', 'questions', 'section', 'video', 'mock_exam', 'review', 'reading', 'custom');
create type mistake_reason       as enum ('knowledge_gap', 'attention', 'time', 'misread_question', 'calculation', 'unknown');
create type mistake_status       as enum ('open', 'reviewing', 'solved');
create type note_visibility      as enum ('coach_only', 'student', 'parent', 'student_and_parent');
create type session_kind         as enum ('pomodoro', 'free', 'video', 'review', 'reading');
```

## 4. Tablolar

### 4.1 Kimlik ve Kurum (Faz 1)

```sql
organizations (
  id uuid pk,
  name text not null,
  slug text unique not null,
  settings jsonb not null default '{}',   -- uyarı eşikleri, tekrar aralıkları, sıralama tablosu açık mı
  created_at, updated_at
)

profiles (
  id uuid pk references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role user_role not null,
  full_name text not null,
  username text unique,                   -- sadece öğrenciler için dolu, küçük harf, [a-z0-9._]
  avatar_url text,
  phone text,
  last_seen_at timestamptz,
  created_at, updated_at
)

students (
  profile_id uuid pk references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  coach_id uuid not null references profiles(id),
  curriculum_template_id uuid not null references curriculum_templates(id),
  season text not null,                   -- '2026-2027'
  grade smallint not null default 8,
  school_name text,
  class_section text,
  exam_date date,                         -- LGS tarihi (geri sayım)
  target_percentile numeric(5,2),
  status student_status not null default 'active',
  created_at, updated_at
)

student_parents (
  student_id uuid references students(profile_id) on delete cascade,
  parent_id uuid references profiles(id) on delete cascade,
  relation parent_relation not null,
  can_view_details boolean not null default false,  -- yanlış defteri, günlük durum vb.
  created_at,
  primary key (student_id, parent_id)
)

invitations (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  code text unique not null,              -- 8 karakter, karışması kolay karakterler hariç
  role user_role not null check (role in ('coach', 'parent')),
  student_id uuid references students(profile_id) on delete cascade,  -- veli davetinde dolu
  created_by uuid not null references profiles(id),
  expires_at timestamptz not null,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at
)

consents (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  given_by uuid references profiles(id),  -- veli; kâğıt onayda null + recorded_by dolu
  recorded_by uuid references profiles(id),
  type consent_type not null,
  document_version text not null,         -- 'aydinlatma-v1'
  given_at timestamptz not null default now(),
  revoked_at timestamptz
)

student_modules (
  student_id uuid references students(profile_id) on delete cascade,
  module_id text not null,                -- manifest id
  enabled boolean not null,
  settings jsonb not null default '{}',
  updated_at,
  primary key (student_id, module_id)
)
```

Yeni Auth kullanıcısı oluştuğunda `profiles` satırı Server Action içinde (secret key ile) transaction olarak oluşturulur; `auth.users` üzerinde tetikleyici kullanılmaz (hata ayıklaması zor).

### 4.2 Müfredat Şablonları (Faz 2)

```sql
curriculum_templates (
  id uuid pk,
  organization_id uuid references organizations(id),  -- null = sistem şablonu
  name text not null,                     -- 'LGS 2027'
  exam_type text not null,                -- 'LGS'
  grade smallint not null,
  season text not null,
  scoring jsonb not null,                 -- {"wrong_penalty": 3, "sections": [...]}
  based_on_id uuid references curriculum_templates(id),
  is_published boolean not null default false,
  created_at, updated_at
)

subjects (
  id uuid pk,
  template_id uuid not null references curriculum_templates(id) on delete cascade,
  code text not null,                     -- 'MAT' — sezonlar arası eşleştirme için
  name text not null,                     -- 'Matematik'
  short_name text not null,               -- 'Mat'
  color text not null,                    -- token öneki: 'subject-math' (04 Bölüm 4.2)
  icon text not null,                     -- lucide ikon adı
  exam_section text,                      -- 'sayisal' | 'sozel'
  exam_question_count smallint,
  sort_order smallint not null,
  unique (template_id, code)
)

topics (
  id uuid pk,
  subject_id uuid not null references subjects(id) on delete cascade,
  parent_id uuid references topics(id) on delete cascade,  -- ünite > konu > alt konu
  name text not null,
  semester smallint check (semester in (1, 2)),
  importance smallint not null default 2 check (importance between 1 and 3),
  estimated_minutes int,
  external_code text,                     -- MEB kazanım kodu (varsa)
  sort_order smallint not null,
  created_at, updated_at
)

student_topic_progress (
  student_id uuid references students(profile_id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  status topic_status not null default 'not_started',
  confidence smallint check (confidence between 1 and 5),
  completed_at timestamptz,
  review_stage smallint not null default 0,
  last_reviewed_at timestamptz,
  next_review_at date,
  updated_at,
  primary key (student_id, topic_id)
)
```

`student_topic_progress` satırları **tembel (lazy)** oluşur: satır yoksa durum `not_started` kabul edilir. Böylece şablona konu eklemek için öğrenci başına satır üretmek gerekmez.

Konu `completed` işaretlendiğinde `next_review_at = bugün + aralık[0]` atanır. Tekrar yapıldıkça `review_stage` artar. Aralıklar `organizations.settings.review_intervals` (varsayılan `[1, 3, 7, 15, 30]`).

### 4.3 Soru Takibi ve Hedefler (Faz 3)

```sql
question_logs (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  log_date date not null default (now() at time zone 'Europe/Istanbul')::date,
  subject_id uuid not null references subjects(id),
  topic_id uuid references topics(id),
  section_id uuid references resource_sections(id),   -- Faz 5'te FK eklenir
  plan_item_id uuid references plan_items(id) on delete set null,  -- Faz 4'te FK eklenir
  source question_source not null default 'free',
  total_count int not null check (total_count > 0 and total_count <= 500),
  correct_count int check (correct_count >= 0),
  wrong_count int check (wrong_count >= 0),
  blank_count int check (blank_count >= 0),
  duration_minutes int check (duration_minutes between 1 and 600),
  note text,
  created_at, updated_at,
  check (coalesce(correct_count,0) + coalesce(wrong_count,0) + coalesce(blank_count,0) <= total_count)
)
-- index (student_id, log_date desc), (student_id, subject_id, log_date), (section_id)

goals (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text,
  metric goal_metric not null,
  subject_id uuid references subjects(id),  -- null = tüm dersler
  period goal_period not null,
  target_value numeric not null check (target_value > 0),
  starts_on date not null,
  ends_on date,                             -- null = süresiz tekrarlayan
  is_active boolean not null default true,
  created_at, updated_at
)
```

Hedef ilerlemesi saklanmaz, hesaplanır: `private.goal_progress(goal_id, on_date)` fonksiyonu ilgili dönemin başlangıç ve bitişini bulup metriğe göre toplar.

### 4.4 Plan, Notlar, Duyurular (Faz 4)

```sql
weekly_plans (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),  -- pazartesi
  created_by uuid not null references profiles(id),
  status plan_status not null default 'draft',
  coach_message text,
  student_reflection text,                -- öğrencinin hafta sonu değerlendirmesi
  published_at timestamptz,
  created_at, updated_at,
  unique (student_id, week_start)
)

plan_items (
  id uuid pk,
  plan_id uuid not null references weekly_plans(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  sort_order smallint not null,
  kind plan_item_kind not null,
  title text not null,                    -- otomatik üretilir, düzenlenebilir
  subject_id uuid references subjects(id),
  topic_id uuid references topics(id),
  section_id uuid references resource_sections(id),
  video_id uuid references videos(id),
  target_value int,                       -- ör. 40
  target_unit text,                       -- 'questions' | 'minutes' | 'pages' | 'videos'
  estimated_minutes int,
  completed_at timestamptz,
  student_note text,
  created_at, updated_at
)

plan_templates (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  created_by uuid not null references profiles(id),
  name text not null,
  items jsonb not null,                   -- plan_items şeklinde, tarihsiz
  created_at, updated_at
)

coach_notes (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  visibility note_visibility not null default 'coach_only',
  is_pinned boolean not null default false,
  created_at, updated_at
)

meetings (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  coach_id uuid not null references profiles(id),
  scheduled_at timestamptz not null,
  with_parent boolean not null default false,
  agenda text,
  summary text,
  action_items jsonb not null default '[]',   -- [{text, done}]
  created_at, updated_at
)

announcements (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  author_id uuid not null references profiles(id),
  title text not null,
  body text not null,
  audience jsonb not null,                -- {"roles": ["student"], "student_ids": null}
  published_at timestamptz,
  created_at
)
```

### 4.5 Kaynaklar ve Videolar (Faz 5)

```sql
resources (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  template_id uuid not null references curriculum_templates(id),
  subject_id uuid references subjects(id),     -- null = çok dersli kitap
  type resource_type not null,
  title text not null,
  publisher text,
  publish_year smallint,
  cover_path text,                             -- storage
  created_at, updated_at
)

resource_sections (
  id uuid pk,
  resource_id uuid not null references resources(id) on delete cascade,
  subject_id uuid references subjects(id),
  topic_id uuid references topics(id),
  title text not null,                         -- 'Test 12'
  question_count smallint,
  page_start smallint, page_end smallint,
  sort_order smallint not null
)

student_resources (
  student_id uuid references students(profile_id) on delete cascade,
  resource_id uuid references resources(id) on delete cascade,
  assigned_by uuid references profiles(id),
  status text not null default 'active' check (status in ('active','completed','dropped')),
  assigned_at timestamptz not null default now(),
  primary key (student_id, resource_id)
)

video_playlists (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  template_id uuid not null references curriculum_templates(id),
  subject_id uuid references subjects(id),
  title text not null,
  channel_name text,
  youtube_playlist_id text,
  imported_at timestamptz,
  sort_order smallint,
  created_at, updated_at
)

videos (
  id uuid pk,
  playlist_id uuid not null references video_playlists(id) on delete cascade,
  topic_id uuid references topics(id),
  youtube_video_id text not null,
  title text not null,
  duration_seconds int,
  sort_order smallint not null,
  unique (playlist_id, youtube_video_id)
)

student_playlists (
  student_id uuid references students(profile_id) on delete cascade,
  playlist_id uuid references video_playlists(id) on delete cascade,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (student_id, playlist_id)
)

student_video_progress (
  student_id uuid references students(profile_id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  watched_seconds int not null default 0,
  completed_at timestamptz,
  note text,
  updated_at,
  primary key (student_id, video_id)
)
```

**Tek veri kaynağı kuralı:** Bir testin "bitti" sayılması ayrı bir tabloda tutulmaz. `question_logs.section_id` dolu bir kaydın varlığı o testin bittiği anlamına gelir. Kaynak ilerleme yüzdesi `v_student_resource_progress` görünümüyle hesaplanır.

**YouTube içe aktarma:** Sunucu tarafında YouTube Data API v3 `playlistItems.list` (sayfalı) + `videos.list` (süreler için) çağrılır. API anahtarı istemciye gitmez. Video oynatma `youtube-nocookie.com` embed'i ile yapılır; %90 izlenince `completed_at` otomatik atanabilir (IFrame Player API), öğrenci elle de işaretleyebilir.

### 4.6 Denemeler, Yanlış Defteri (Faz 6)

```sql
mock_exams (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  template_id uuid not null references curriculum_templates(id),
  title text not null,                    -- 'X Yayınları Türkiye Geneli 3'
  publisher text,
  exam_date date,
  is_full_exam boolean not null default true,   -- false = branş denemesi
  created_by uuid references profiles(id),
  created_at, updated_at
)

mock_exam_results (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  mock_exam_id uuid references mock_exams(id) on delete set null,  -- katalog dışı deneme: null
  custom_title text,
  taken_on date not null,
  duration_minutes int,
  score numeric(6,3),                     -- yayınevinin verdiği puan (isteğe bağlı, elle)
  percentile numeric(5,2),                -- yayınevinin verdiği yüzdelik (isteğe bağlı)
  note text,
  created_at, updated_at,
  check (mock_exam_id is not null or custom_title is not null)
)

mock_exam_subject_results (
  result_id uuid references mock_exam_results(id) on delete cascade,
  subject_id uuid references subjects(id),
  correct_count smallint not null default 0,
  wrong_count smallint not null default 0,
  blank_count smallint not null default 0,
  wrong_penalty smallint not null,        -- kayıt anında şablondan kopyalanır (0 = ceza yok)
  net numeric(5,2) generated always as (
    correct_count - coalesce(wrong_count::numeric / nullif(wrong_penalty, 0), 0)
  ) stored,
  primary key (result_id, subject_id)
)

mock_exam_topic_mistakes (
  result_id uuid references mock_exam_results(id) on delete cascade,
  topic_id uuid references topics(id),
  wrong_count smallint not null default 0,
  blank_count smallint not null default 0,
  primary key (result_id, topic_id)
)

mistakes (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  subject_id uuid not null references subjects(id),
  topic_id uuid references topics(id),
  mock_result_id uuid references mock_exam_results(id) on delete set null,
  section_id uuid references resource_sections(id) on delete set null,
  question_image_path text,
  solution_image_path text,
  reason mistake_reason not null default 'unknown',
  note text,
  status mistake_status not null default 'open',
  review_stage smallint not null default 0,
  last_reviewed_at timestamptz,
  next_review_at date,
  created_at, updated_at
)
```

LGS puanı standart sapmaya dayalı olarak ÖSYM/MEB tarafından hesaplandığı için uygulama **puan hesaplamaz**; sadece net hesaplar. Yayınevinin verdiği puan ve yüzdelik isteğe bağlı olarak elle girilir.

Deneme sonucu kaydı (sonuç + ders sonuçları + konu yanlışları) `public.save_mock_exam_result(payload jsonb)` fonksiyonuyla tek transaction'da yapılır.

### 4.7 Bildirimler (Faz 7)

```sql
notifications (
  id uuid pk,
  recipient_id uuid not null references profiles(id) on delete cascade,
  student_id uuid references students(profile_id) on delete cascade,
  type text not null,                     -- 'plan_published' | 'note_added' | 'review_due' | 'alert_inactive' | 'weekly_summary'
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at
)
-- index (recipient_id, read_at, created_at desc)

push_subscriptions (                      -- Faz 8
  id uuid pk,
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  created_at
)
```

### 4.8 Zenginleştirme Modülleri (Faz 8)

```sql
study_sessions (
  id uuid pk, student_id … cascade,
  started_at timestamptz not null, ended_at timestamptz,
  duration_minutes int not null,
  kind session_kind not null,
  subject_id uuid references subjects(id), topic_id uuid references topics(id),
  focus_rating smallint check (focus_rating between 1 and 5),
  note text, created_at
)

daily_checkins (
  student_id … cascade, checkin_date date not null,
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 16),
  note text, created_at, updated_at,
  primary key (student_id, checkin_date)
)

reading_logs (
  id uuid pk, student_id … cascade,
  log_date date not null, book_title text not null,
  pages smallint not null check (pages > 0), minutes smallint,
  created_at
)

schools (
  id uuid pk, organization_id uuid not null references organizations(id),
  name text not null, city text, district text, school_type text,
  reference_year smallint, base_percentile numeric(5,2), base_score numeric(6,3),
  created_at, updated_at
)

student_target_schools (
  student_id … cascade, school_id uuid references schools(id) on delete cascade,
  priority smallint not null,
  primary key (student_id, school_id)
)

achievements (
  id uuid pk, code text unique not null, name text not null,
  description text not null, icon text not null,
  rule jsonb not null                     -- {"metric":"questions_total","gte":1000}
)

student_achievements (
  student_id … cascade, achievement_id uuid references achievements(id),
  earned_at timestamptz not null default now(),
  primary key (student_id, achievement_id)
)

school_exam_grades (
  id uuid pk, student_id … cascade,
  subject_id uuid references subjects(id), term smallint, exam_no smallint,
  grade numeric(5,2) check (grade between 0 and 100),
  exam_date date, created_at
)
```

## 5. Güvenlik: RLS

### 5.1 Yardımcı fonksiyonlar

```sql
create schema if not exists private;
grant usage on schema private to authenticated;

-- Oturumdaki kullanıcının profili
create or replace function private.my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function private.my_org()
returns uuid
language sql stable security definer set search_path = ''
as $$ select organization_id from public.profiles where id = (select auth.uid()) $$;

-- Koç mu (veya aynı kurumun sahibi mi)?
create or replace function private.is_coach_of(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    join public.profiles me on me.id = (select auth.uid())
    where s.profile_id = p_student_id
      and s.organization_id = me.organization_id
      and (s.coach_id = me.id or me.role = 'owner')
  )
$$;

create or replace function private.is_parent_of(p_student_id uuid, p_details boolean default false)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.student_parents sp
    where sp.student_id = p_student_id
      and sp.parent_id = (select auth.uid())
      and (not p_details or sp.can_view_details)
  )
$$;

create or replace function private.can_read_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_student_id = (select auth.uid())
      or private.is_coach_of(p_student_id)
      or private.is_parent_of(p_student_id)
$$;

create or replace function private.can_write_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_student_id = (select auth.uid())
      or private.is_coach_of(p_student_id)
$$;

grant execute on all functions in schema private to authenticated;
```

### 5.2 Standart politika kalıbı (öğrenci verisi)

```sql
alter table public.question_logs enable row level security;

create policy question_logs_select on public.question_logs
  for select to authenticated
  using (private.can_read_student(student_id));

create policy question_logs_insert on public.question_logs
  for insert to authenticated
  with check (private.can_write_student(student_id));

create policy question_logs_update on public.question_logs
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));

create policy question_logs_delete on public.question_logs
  for delete to authenticated
  using (private.can_write_student(student_id));
```

### 5.3 RLS matrisi

S: select, I: insert, U: update, D: delete. "Kendi" = kendi öğrenci satırı.

| Tablo | Öğrenci | Koç (kendi öğrencileri) | Veli | Owner (kurum) |
|---|---|---|---|---|
| organizations | S (kendi) | S | S | S U |
| profiles | S U (kendi, sınırlı kolon) | S (öğrenci + velileri) | S (kendi + çocuk + koç adı) | S I U |
| students | S (kendi) | S U | S (çocuk) | S I U D |
| student_parents | S (kendi) | S I U D | S (kendi) | Tümü |
| invitations | – | S I D | – | Tümü |
| consents | S | S I | S I (kendi çocuğu) | S |
| student_modules | S | S I U D | S | Tümü |
| curriculum_templates, subjects, topics | S (kendi şablonu) | S | S | Tümü |
| student_topic_progress | S I U | S I U | S | Tümü |
| question_logs | S I U D | S I U D | S | Tümü |
| goals | S (öğrenci hedefi açıksa I U D) | S I U D | S | Tümü |
| weekly_plans | S (sadece published), U (sadece reflection) | S I U D | S (published) | Tümü |
| plan_items | S, U (sadece completed_at, student_note) | S I U D | S | Tümü |
| plan_templates | – | S I U D (kurum) | – | Tümü |
| coach_notes | S (visibility ∈ student, student_and_parent) | S I U D | S (visibility ∈ parent, student_and_parent) | Tümü |
| meetings | S (kendi görüşmeleri) | S I U D | S (with_parent=true olanlar) | Tümü |
| announcements | S (hedef kitlede ise) | S I (kendi) | S (hedef kitlede ise) | Tümü |
| resources, resource_sections, video_playlists, videos, mock_exams, schools | S (kurum) | S I U | – | Tümü |
| student_resources, student_playlists | S | S I U D | S | Tümü |
| student_video_progress | S I U | S | S | Tümü |
| mock_exam_results (+ alt tablolar) | S I U D | S I U D | S | Tümü |
| mistakes | S I U D | S U | S (can_view_details) | Tümü |
| notifications | S U (kendi) | S U (kendi) | S U (kendi) | S U (kendi) |
| study_sessions, reading_logs, school_exam_grades | S I U D | S | S | Tümü |
| daily_checkins | S I U | S | S (can_view_details) | Tümü |

Kolon düzeyinde kısıt gereken yerlerde (öğrencinin `plan_items` üzerinde sadece `completed_at` ve `student_note` güncelleyebilmesi gibi) iki yol vardır: (a) `update` yetkisini tabloya değil fonksiyona vermek (`public.complete_plan_item(item_id, note)` security definer), (b) tetikleyiciyle diğer kolonların değişmediğini doğrulamak. **Tercih: (a) fonksiyon**, çünkü niyeti açık.

### 5.4 RLS test kalıbı (pgTAP)

Her tablo için en az şu testler yazılır:

1. Öğrenci A kendi satırını görür.
2. Öğrenci A, öğrenci B'nin satırını **göremez** ve ekleyemez.
3. Koç X kendi öğrencisinin satırını görür, başka koçun öğrencisini göremez.
4. Veli sadece kendi çocuğunun satırını görür; `can_view_details=false` ise detay tablolarını göremez.
5. Oturumsuz (`anon`) kullanıcı hiçbir şey göremez.

## 6. Görünümler (Views)

Tüm görünümler `with (security_invoker = true)` ile oluşturulur, böylece alttaki tabloların RLS'si uygulanır.

| Görünüm | Kolonlar (özet) | Kullanım |
|---|---|---|
| `v_student_daily_summary` | student_id, day, questions, correct, wrong, blank, study_minutes, videos_completed, reading_pages | Bugün ekranı, grafikler |
| `v_student_subject_weekly` | student_id, week_start, subject_id, questions, accuracy | Haftalık ders dağılımı |
| `v_topic_mastery` | student_id, topic_id, subject_id, status, confidence, questions, accuracy, mock_wrong_total, mistakes_open, mastery_score | **Konu haritası** |
| `v_student_resource_progress` | student_id, resource_id, sections_total, sections_done, questions_done, percent | Kaynak ilerlemesi |
| `v_student_playlist_progress` | student_id, playlist_id, videos_total, videos_done, percent | Video ilerlemesi |
| `v_mock_exam_trend` | student_id, result_id, taken_on, total_net, subject nets (jsonb) | Net grafiği |
| `v_review_queue` | student_id, item_type ('topic'/'mistake'), item_id, due_on, overdue_days | Tekrar listesi |
| `v_coach_student_overview` | student_id, coach_id, full_name, last_activity_at, week_questions, week_goal_percent, last_net, net_delta, plan_completion_last_week, overdue_reviews, alerts (text[]) | **Koç ana ekranı** (tek sorgu) |

`mastery_score` (0-100) başlangıç formülü, kurum ayarlarından ağırlıklandırılabilir:

```
mastery_score = 0.4 * durum_puanı          (not_started 0, studying 30, completed 60, needs_review 40, mastered 100)
              + 0.4 * soru_başarı_yüzdesi  (son 60 gün, en az 20 soru yoksa durum_puanı kullanılır)
              + 0.2 * (100 - deneme_yanlış_cezası)
```

## 7. Fonksiyonlar (RPC)

| Fonksiyon | Tür | Ne yapar |
|---|---|---|
| `private.goal_progress(goal_id, on_date)` | stable | Hedefin dönem içindeki mevcut değeri ve yüzdesi |
| `public.student_streak(student_id)` | stable | Ardışık aktif gün sayısı (herhangi bir kayıt = aktif) |
| `public.save_mock_exam_result(payload jsonb)` | security invoker | Sonuç + ders + konu yanlışlarını tek transaction'da yazar |
| `public.complete_plan_item(item_id, note, create_log jsonb)` | security definer + yetki kontrolü | Görevi tamamlar, isteğe bağlı soru kaydı oluşturur |
| `public.copy_weekly_plan(source_plan_id, target_student_ids uuid[], week_start)` | security definer + koç kontrolü | Planı çoğaltır |
| `public.copy_curriculum_template(template_id, new_name, new_season, include_catalogs boolean)` | security definer + owner kontrolü | Şablonu (ve isteğe bağlı kaynak/video kataloglarını) kopyalar |
| `public.mark_reviewed(item_type, item_id, result)` | security definer | Tekrar aşamasını ilerletir, sonraki tarihi hesaplar |
| `public.accept_invitation(code)` | security definer | Daveti doğrular, `student_parents` bağlantısını kurar |
| `private.refresh_review_queue()` | cron | Günlük |
| `private.detect_alerts()` | cron | Günlük, bildirim üretir |
| `private.generate_weekly_summaries()` | cron | Haftalık |

Security definer fonksiyonların tamamı: `set search_path = ''`, ilk satırda yetki kontrolü, tüm tablo adları şema önekli (`public.…`).

## 8. Depolama (Storage)

| Bucket | Erişim | Yol kalıbı | Sınır |
|---|---|---|---|
| `mistake-images` | private | `{organization_id}/{student_id}/{uuid}.webp` | 2 MB, sadece image/webp, image/jpeg |
| `avatars` | private | `{organization_id}/{profile_id}.webp` | 512 KB |
| `resource-covers` | private | `{organization_id}/{resource_id}.webp` | 512 KB |

Politika örneği:

```sql
create policy mistake_images_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mistake-images'
    and private.can_read_student(((storage.foldername(name))[2])::uuid)
  );
```

Yüklemeden önce istemcide en uzun kenar 1600 px'e indirilir ve WebP'ye çevrilir (hedef ~150 KB). Öğrenci silindiğinde klasörü bir Server Action ile temizlenir.

## 9. Seed Verisi

- `supabase/seed.sql` (sadece yerel): 1 kurum, 1 owner, 1 koç, 3 öğrenci (farklı performans profilleri), 2 veli, LGS 2027 şablonu, 2 kaynak, 1 oynatma listesi, 3 haftalık rastgele soru kaydı, 4 deneme sonucu. Kullanıcı şifreleri `.env.example` içinde belirtilen demo değer.
- `supabase/seeds/lgs-2027-template.sql`: Üretimde bir kez çalıştırılan sistem şablonu (`05-lgs-2027-sablonu.md` içeriği).
