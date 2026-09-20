-- Faz 8a: koç notları ve duyurular (12-faz8-veli-bildirim.md §1.1). 03 §4.4c taslakları
-- sadeleştirilerek uygulanır.
--   note_visibility enum'u; coach_notes (öğrenci, yazar, gövde, görünürlük, sabitleme).
--   RLS: öğrenci S (görünürlük student / student_and_parent), veli S (parent / student_and_parent),
--   koç S I U D (is_coach_of; insert author_id kendisi), owner koç gibi (is_coach_of kapsar).
--   announcements: kurum düzeyi duyuru; hedef kitle jsonb {"roles": [...], "student_ids": null | [...]}.
--   Duyuru taslaksız (published_at yok), düzenlenemez (U yok); öğrenci ve veli tabloyu OKUMAZ,
--   duyuru metni bildirime kopyalanır (karar E3). Koç/owner S I D (kendi kurumu).

-- 1. Enum -----------------------------------------------------------------------------------

create type public.note_visibility as enum ('coach_only', 'student', 'parent', 'student_and_parent');

-- 2. coach_notes ----------------------------------------------------------------------------

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  -- Koç silinince not kalsın (03 taslağında not null idi).
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  visibility public.note_visibility not null default 'coach_only',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_notes_student_created_at_idx on public.coach_notes (student_id, created_at desc);
create index coach_notes_author_id_idx on public.coach_notes (author_id);

alter table public.coach_notes enable row level security;

create trigger coach_notes_set_updated_at
  before update on public.coach_notes
  for each row execute function private.set_updated_at();

revoke all on table public.coach_notes from anon, authenticated;
grant select, insert, update, delete on table public.coach_notes to authenticated;
grant all on table public.coach_notes to service_role;

create policy coach_notes_select on public.coach_notes
  for select to authenticated
  using (
    private.is_coach_of(student_id)
    or (student_id = (select auth.uid()) and visibility in ('student', 'student_and_parent'))
    or (private.is_parent_of(student_id) and visibility in ('parent', 'student_and_parent'))
  );

create policy coach_notes_insert on public.coach_notes
  for insert to authenticated
  with check (private.is_coach_of(student_id) and author_id = (select auth.uid()));

create policy coach_notes_update on public.coach_notes
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id));

create policy coach_notes_delete on public.coach_notes
  for delete to authenticated
  using (private.is_coach_of(student_id));

-- 3. announcements --------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 1000),
  audience jsonb not null,
  created_at timestamptz not null default now(),
  constraint announcements_audience_check check (
    jsonb_typeof(audience -> 'roles') = 'array'
    and jsonb_array_length(audience -> 'roles') > 0
    and (audience -> 'roles') <@ '["student", "parent"]'::jsonb
    and (
      (audience -> 'student_ids') is null
      or jsonb_typeof(audience -> 'student_ids') in ('null', 'array')
    )
  )
);

create index announcements_org_created_at_idx on public.announcements (organization_id, created_at desc);
create index announcements_author_id_idx on public.announcements (author_id);

alter table public.announcements enable row level security;

revoke all on table public.announcements from anon, authenticated;
grant select, insert, delete on table public.announcements to authenticated;
grant all on table public.announcements to service_role;

create policy announcements_select on public.announcements
  for select to authenticated
  using (organization_id = private.my_org() and private.my_role() in ('coach', 'owner'));

create policy announcements_insert on public.announcements
  for insert to authenticated
  with check (
    organization_id = private.my_org()
    and private.my_role() in ('coach', 'owner')
    and author_id = (select auth.uid())
  );

create policy announcements_delete on public.announcements
  for delete to authenticated
  using (organization_id = private.my_org() and private.my_role() in ('coach', 'owner'));
