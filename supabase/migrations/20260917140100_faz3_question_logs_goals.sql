-- Faz 3: soru kayıtları ve hedefler (03-veri-modeli.md Bölüm 4.3, 5.2, 5.3).
-- question_logs: tek veri kaynağı (02 karar #4). section_id / plan_item_id kolonları
-- ilgili fazlarda eklenir. goals: metric yalnızca 'questions', period daily/weekly;
-- öğrenci başına dönem başına tek aktif hedef (kısmi tekil indeks).
-- "Bugün" her zaman Europe/Istanbul günüdür; current_date kullanılmaz.

create type public.question_source as enum ('resource', 'plan', 'school', 'online', 'free');
create type public.goal_metric as enum ('questions');
create type public.goal_period as enum ('daily', 'weekly');

-- Şablon sınav tarihi: yeni öğrenci formunun varsayılanı (koda gömülü tarih yok).
alter table public.curriculum_templates add column exam_date date;
update public.curriculum_templates
  set exam_date = date '2027-06-13'
  where id = 'c0000000-0000-4000-8000-000000000001' and exam_date is null;

-- Tablolar -------------------------------------------------------------------------

create table public.question_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  log_date date not null default (now() at time zone 'Europe/Istanbul')::date,
  subject_id uuid not null references public.subjects (id),
  topic_id uuid references public.topics (id),
  source public.question_source not null default 'free',
  total_count int not null check (total_count > 0 and total_count <= 500),
  correct_count int check (correct_count >= 0),
  wrong_count int check (wrong_count >= 0),
  blank_count int check (blank_count >= 0),
  duration_minutes int check (duration_minutes between 1 and 600),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(correct_count, 0) + coalesce(wrong_count, 0) + coalesce(blank_count, 0) <= total_count),
  -- Gelecek tarihe kayıt yok (İstanbul gününe göre).
  check (log_date <= (now() at time zone 'Europe/Istanbul')::date)
);

create index question_logs_student_date_idx on public.question_logs (student_id, log_date desc);
create index question_logs_student_subject_date_idx on public.question_logs (student_id, subject_id, log_date);
create index question_logs_subject_id_idx on public.question_logs (subject_id);
create index question_logs_topic_id_idx on public.question_logs (topic_id);

alter table public.question_logs enable row level security;

create trigger question_logs_set_updated_at
  before update on public.question_logs
  for each row execute function private.set_updated_at();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text,
  metric public.goal_metric not null default 'questions',
  subject_id uuid references public.subjects (id),          -- null = tüm dersler
  period public.goal_period not null,
  target_value numeric not null check (target_value > 0),
  starts_on date not null default (now() at time zone 'Europe/Istanbul')::date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_student_id_idx on public.goals (student_id);
create index goals_created_by_idx on public.goals (created_by);
create index goals_subject_id_idx on public.goals (subject_id);
-- Öğrenci başına dönem başına tek aktif hedef.
create unique index goals_one_active_per_period_idx on public.goals (student_id, period) where is_active;

alter table public.goals enable row level security;

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function private.set_updated_at();

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------

revoke all on table public.question_logs, public.goals from anon, authenticated;
grant select, insert, update, delete on table public.question_logs to authenticated;
grant select, insert, update, delete on table public.goals to authenticated;
grant all on table public.question_logs, public.goals to service_role;

-- Politikalar ------------------------------------------------------------------------

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

-- Hedefi yalnızca koç/owner yazar; öğrenci ve veli okur.
create policy goals_select on public.goals
  for select to authenticated
  using (private.can_read_student(student_id));

create policy goals_insert on public.goals
  for insert to authenticated
  with check (private.is_coach_of(student_id) and created_by = (select auth.uid()));

create policy goals_update on public.goals
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id));

create policy goals_delete on public.goals
  for delete to authenticated
  using (private.is_coach_of(student_id));
