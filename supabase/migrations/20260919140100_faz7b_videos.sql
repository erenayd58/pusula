-- Faz 7b: videolar (11-faz7-kaynaklar.md §1.3).
--   video_playlists          oynatma listesi; youtube_playlist_id null = elle kurulan liste (karar D3);
--                            student_id null = kurum kataloğu, dolu = öğrencinin özel listesi (D1 kalıbı)
--   videos                   listedeki video (YouTube kimliği 11 karakter); sort_order YouTube/ekleme sırası
--   student_playlists        atama
--   student_video_progress   elle "izledim" işareti (watched_at) + not; izleme süresi yok (D11)
--   plan_items.video_id      plan görevi bağı (on delete set null)
-- RLS: resources / resource_sections / student_resources ile birebir; izleme satırları standart
-- öğrenci verisi kalıbı (03 §5.2).

-- 1. video_playlists -----------------------------------------------------------------------------

create table public.video_playlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null references public.curriculum_templates (id) on delete cascade,
  -- null = karışık liste.
  subject_id uuid references public.subjects (id) on delete restrict,
  -- null = kurum kataloğu; dolu = öğrencinin özel listesi.
  student_id uuid references public.students (profile_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  channel_name text check (channel_name is null or char_length(channel_name) <= 80),
  -- null = elle kurulan liste.
  youtube_playlist_id text check (youtube_playlist_id is null or youtube_playlist_id ~ '^[A-Za-z0-9_-]{10,60}$'),
  imported_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Aynı YouTube listesi aynı kapsamda (katalog ya da aynı öğrencinin özeli) iki kez yok.
  constraint video_playlists_youtube_scope_uniq unique nulls not distinct (organization_id, youtube_playlist_id, student_id)
);

create index video_playlists_org_title_idx on public.video_playlists (organization_id, title);
create index video_playlists_template_id_idx on public.video_playlists (template_id);
create index video_playlists_subject_id_idx on public.video_playlists (subject_id);
create index video_playlists_student_id_idx on public.video_playlists (student_id);
create index video_playlists_created_by_idx on public.video_playlists (created_by);

alter table public.video_playlists enable row level security;

create trigger video_playlists_set_updated_at
  before update on public.video_playlists
  for each row execute function private.set_updated_at();

-- 2. videos --------------------------------------------------------------------------------------

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.video_playlists (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (char_length(title) between 1 and 200),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playlist_id, youtube_video_id)
);

create index videos_playlist_sort_idx on public.videos (playlist_id, sort_order);
create index videos_topic_id_idx on public.videos (topic_id);

alter table public.videos enable row level security;

create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function private.set_updated_at();

-- 3. student_playlists ---------------------------------------------------------------------------

create table public.student_playlists (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  playlist_id uuid not null references public.video_playlists (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (student_id, playlist_id)
);

create index student_playlists_playlist_id_idx on public.student_playlists (playlist_id);
create index student_playlists_assigned_by_idx on public.student_playlists (assigned_by);

alter table public.student_playlists enable row level security;

-- 4. student_video_progress ----------------------------------------------------------------------

create table public.student_video_progress (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  -- null = izlenmedi (satır yalnızca not için açılmış olabilir).
  watched_at timestamptz,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, video_id)
);

create index student_video_progress_video_id_idx on public.student_video_progress (video_id);

alter table public.student_video_progress enable row level security;

create trigger student_video_progress_set_updated_at
  before update on public.student_video_progress
  for each row execute function private.set_updated_at();

-- 5. plan_items.video_id -------------------------------------------------------------------------

alter table public.plan_items
  add column video_id uuid references public.videos (id) on delete set null;
create index plan_items_video_id_idx on public.plan_items (video_id);

-- Yardımcılar -----------------------------------------------------------------------------------

create or replace function private.can_read_playlist(p_playlist_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.video_playlists p
    where p.id = p_playlist_id
      and p.organization_id = private.my_org()
      and (p.student_id is null or private.can_read_student(p.student_id))
  )
$$;

create or replace function private.can_edit_playlist(p_playlist_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.video_playlists p
    where p.id = p_playlist_id
      and p.organization_id = private.my_org()
      and (
        (p.student_id is null and private.my_role() in ('coach', 'owner'))
        or (p.student_id is not null and private.can_write_student(p.student_id))
      )
  )
$$;

revoke execute on function private.can_read_playlist(uuid), private.can_edit_playlist(uuid) from public, anon;
grant execute on function private.can_read_playlist(uuid), private.can_edit_playlist(uuid) to authenticated;

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------------

revoke all on table
  public.video_playlists, public.videos, public.student_playlists, public.student_video_progress
from anon, authenticated;
grant select, insert, update, delete on table
  public.video_playlists, public.videos, public.student_video_progress
to authenticated;
grant select, insert, delete on table public.student_playlists to authenticated;
grant all on table
  public.video_playlists, public.videos, public.student_playlists, public.student_video_progress
to service_role;

-- Politikalar: video_playlists -----------------------------------------------------------------

create policy video_playlists_select on public.video_playlists
  for select to authenticated
  using (
    organization_id = private.my_org()
    and (student_id is null or private.can_read_student(student_id))
  );

create policy video_playlists_insert on public.video_playlists
  for insert to authenticated
  with check (
    organization_id = private.my_org()
    and created_by = (select auth.uid())
    and (
      (student_id is null and private.my_role() in ('coach', 'owner'))
      or student_id = (select auth.uid())
    )
  );

create policy video_playlists_update on public.video_playlists
  for update to authenticated
  using (private.can_edit_playlist(id))
  with check (
    organization_id = private.my_org()
    and (
      (student_id is null and private.my_role() in ('coach', 'owner'))
      or student_id = (select auth.uid())
      or (student_id is not null and private.is_coach_of(student_id))
    )
  );

create policy video_playlists_delete on public.video_playlists
  for delete to authenticated
  using (private.can_edit_playlist(id));

-- Politikalar: videos --------------------------------------------------------------------------

create policy videos_select on public.videos
  for select to authenticated
  using (private.can_read_playlist(playlist_id));

create policy videos_insert on public.videos
  for insert to authenticated
  with check (private.can_edit_playlist(playlist_id));

create policy videos_update on public.videos
  for update to authenticated
  using (private.can_edit_playlist(playlist_id))
  with check (private.can_edit_playlist(playlist_id));

create policy videos_delete on public.videos
  for delete to authenticated
  using (private.can_edit_playlist(playlist_id));

-- Politikalar: student_playlists ---------------------------------------------------------------

create policy student_playlists_select on public.student_playlists
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_playlists_insert on public.student_playlists
  for insert to authenticated
  with check (
    private.can_write_student(student_id)
    and assigned_by = (select auth.uid())
    and private.can_read_playlist(playlist_id)
  );

create policy student_playlists_delete on public.student_playlists
  for delete to authenticated
  using (private.is_coach_of(student_id));

-- Politikalar: student_video_progress (standart öğrenci verisi kalıbı) ---------------------------

create policy student_video_progress_select on public.student_video_progress
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_video_progress_insert on public.student_video_progress
  for insert to authenticated
  with check (private.can_write_student(student_id));

create policy student_video_progress_update on public.student_video_progress
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));

create policy student_video_progress_delete on public.student_video_progress
  for delete to authenticated
  using (private.can_write_student(student_id));
