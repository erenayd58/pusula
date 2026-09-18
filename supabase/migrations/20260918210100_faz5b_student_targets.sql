-- Faz 5b: öğrenci hedefi (09-faz5-strateji.md §1.4, kararlar B4, B10).
--   1. students: topics_finish_by / target_starts_on (yalnızca set_student_targets RPC yazar; kolon
--      grant'ı yok → API'den doğrudan yazılamaz), wake_start / wake_end (boşsa kurum ayarı; koç
--      Program sekmesinden yazar → kolon düzeyi UPDATE grant'ı eklenir).
--   2. student_subject_targets: sınava kadar ders başına çözülecek soru.
--   3. student_topic_targets: konu başına hedef bitirme günü (saklı çıpa; koç tek tek düzenler).
-- RLS: standart öğrenci verisi kalıbı (03 §5.2): öğrenci S, koç S I U D (is_coach_of;
-- created_by kendisi), veli S, owner tümü. Tablo yetkisi authenticated S I U D.

-- 1. students kolonları -------------------------------------------------------------------------

alter table public.students
  add column topics_finish_by date,
  add column target_starts_on date,
  add column wake_start time,
  add column wake_end time,
  add constraint students_wake_window_check check (
    (wake_start is null and wake_end is null)
    or (wake_start is not null and wake_end is not null and wake_end > wake_start)
  );

grant update (wake_start, wake_end) on table public.students to authenticated;

-- 2. student_subject_targets ----------------------------------------------------------------------

create table public.student_subject_targets (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  questions int not null check (questions > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, subject_id)
);

create index student_subject_targets_subject_id_idx on public.student_subject_targets (subject_id);

alter table public.student_subject_targets enable row level security;

create trigger student_subject_targets_set_updated_at
  before update on public.student_subject_targets
  for each row execute function private.set_updated_at();

-- 3. student_topic_targets ------------------------------------------------------------------------

create table public.student_topic_targets (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  target_on date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

create index student_topic_targets_topic_id_idx on public.student_topic_targets (topic_id);
create index student_topic_targets_created_by_idx on public.student_topic_targets (created_by);

alter table public.student_topic_targets enable row level security;

create trigger student_topic_targets_set_updated_at
  before update on public.student_topic_targets
  for each row execute function private.set_updated_at();

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------------

revoke all on table public.student_subject_targets, public.student_topic_targets from anon, authenticated;
grant select, insert, update, delete on table public.student_subject_targets, public.student_topic_targets to authenticated;
grant all on table public.student_subject_targets, public.student_topic_targets to service_role;

-- Politikalar ------------------------------------------------------------------------------------

create policy student_subject_targets_select on public.student_subject_targets
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_subject_targets_insert on public.student_subject_targets
  for insert to authenticated
  with check (private.is_coach_of(student_id));

create policy student_subject_targets_update on public.student_subject_targets
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id));

create policy student_subject_targets_delete on public.student_subject_targets
  for delete to authenticated
  using (private.is_coach_of(student_id));

create policy student_topic_targets_select on public.student_topic_targets
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_topic_targets_insert on public.student_topic_targets
  for insert to authenticated
  with check (private.is_coach_of(student_id) and created_by = (select auth.uid()));

create policy student_topic_targets_update on public.student_topic_targets
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id));

create policy student_topic_targets_delete on public.student_topic_targets
  for delete to authenticated
  using (private.is_coach_of(student_id));
