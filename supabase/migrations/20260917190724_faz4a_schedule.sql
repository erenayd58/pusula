-- Faz 4a: haftalık program (08-faz4-plan-sistemi.md §1.3).
-- busy_slots: öğrencinin sabit meşguliyetleri (gün + saat aralığı, tür).
-- schedule_exceptions: belirli tarihe bağlı tek seferlik istisnalar (yazılı, gezi; saat
-- çifti boşsa tüm gün). Standart öğrenci verisi kalıbı (03 §5.2): öğrenci ve koç yazar,
-- veli okur. Müsait süre veritabanında değil uygulamada hesaplanır (lib/availability).

create type public.busy_slot_kind as enum ('school', 'tutoring_center', 'private_lesson', 'course', 'other');

-- Tablolar -------------------------------------------------------------------------

create table public.busy_slots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),   -- 1 = pazartesi
  starts_at time not null,
  ends_at time not null,
  kind public.busy_slot_kind not null default 'other',
  note text check (char_length(note) <= 120),
  -- Yazar profili silinince (öğrenci kendi satırını yazmış olabilir) satır kalır, yazar boşalır.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Gece yarısını aşan aralık yok.
  check (ends_at > starts_at)
);

create index busy_slots_student_day_idx on public.busy_slots (student_id, day_of_week);
create index busy_slots_created_by_idx on public.busy_slots (created_by);

alter table public.busy_slots enable row level security;

create trigger busy_slots_set_updated_at
  before update on public.busy_slots
  for each row execute function private.set_updated_at();

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  on_date date not null,
  starts_at time,
  ends_at time,
  title text not null check (char_length(title) between 1 and 80),
  note text check (char_length(note) <= 120),
  -- Yazar profili silinince (öğrenci kendi satırını yazmış olabilir) satır kalır, yazar boşalır.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- İkisi birlikte boş (tüm gün) ya da ikisi dolu ve bitiş başlangıçtan sonra.
  check (
    (starts_at is null and ends_at is null)
    or (starts_at is not null and ends_at is not null and ends_at > starts_at)
  )
);

create index schedule_exceptions_student_date_idx on public.schedule_exceptions (student_id, on_date);
create index schedule_exceptions_created_by_idx on public.schedule_exceptions (created_by);

alter table public.schedule_exceptions enable row level security;

create trigger schedule_exceptions_set_updated_at
  before update on public.schedule_exceptions
  for each row execute function private.set_updated_at();

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------

revoke all on table public.busy_slots, public.schedule_exceptions from anon, authenticated;
grant select, insert, update, delete on table public.busy_slots to authenticated;
grant select, insert, update, delete on table public.schedule_exceptions to authenticated;
grant all on table public.busy_slots, public.schedule_exceptions to service_role;

-- Politikalar ------------------------------------------------------------------------

create policy busy_slots_select on public.busy_slots
  for select to authenticated
  using (private.can_read_student(student_id));

create policy busy_slots_insert on public.busy_slots
  for insert to authenticated
  with check (private.can_write_student(student_id) and created_by = (select auth.uid()));

create policy busy_slots_update on public.busy_slots
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));

create policy busy_slots_delete on public.busy_slots
  for delete to authenticated
  using (private.can_write_student(student_id));

create policy schedule_exceptions_select on public.schedule_exceptions
  for select to authenticated
  using (private.can_read_student(student_id));

create policy schedule_exceptions_insert on public.schedule_exceptions
  for insert to authenticated
  with check (private.can_write_student(student_id) and created_by = (select auth.uid()));

create policy schedule_exceptions_update on public.schedule_exceptions
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));

create policy schedule_exceptions_delete on public.schedule_exceptions
  for delete to authenticated
  using (private.can_write_student(student_id));
