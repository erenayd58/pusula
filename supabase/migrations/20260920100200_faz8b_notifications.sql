-- Faz 8b: bildirimler (12-faz8-veli-bildirim.md §1.2).
--   notification_type enum'u; notifications (alıcı, ilgili öğrenci, tür, olgu jsonb, okunma).
--   Metin ve bağlantı veritabanında DEĞİL: uygulama tür + data'dan üretir (karar E2).
--   profiles.notification_prefs: {"<tür>": false} → o tür kapalı; anahtar yoksa açık.
--   RLS: her rol yalnızca kendi satırını okur ve read_at'ini günceller; insert/delete yok —
--   satırlar yalnızca private.notify (tercih + tekrar önleme) ile tetikleyici/cron'dan yazılır.
--   Tetikleyiciler (security definer, execute verilmez): plan yayını → öğrenci; koç notu →
--   görünürlüğe göre öğrenci/veliler; duyuru → hedef kitle (metin kopyalanır, E3); öğrencinin
--   girdiği deneme → koç; öğrenci görev notu / hafta değerlendirmesi → koç.

-- 1. Enum ve tablo --------------------------------------------------------------------------

create type public.notification_type as enum (
  'plan_published', 'note_added', 'announcement', 'mock_result_added',
  'student_note', 'review_due', 'student_inactive', 'weekly_summary'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- İlgili öğrenci; koç haftalık özetinde null.
  student_id uuid references public.students (profile_id) on delete cascade,
  type public.notification_type not null,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc);
create index notifications_student_id_idx on public.notifications (student_id);

alter table public.notifications enable row level security;

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- 2. Tercihler: profiles.notification_prefs -------------------------------------------------

alter table public.profiles
  add column notification_prefs jsonb not null default '{}'
    check (jsonb_typeof(notification_prefs) = 'object');

grant update (notification_prefs) on table public.profiles to authenticated;

-- 3. private.notify: tek yazma noktası --------------------------------------------------------
-- Alıcının tercihi kapalıysa ya da p_dedupe penceresinde aynı (alıcı, tür, öğrenci) satırı varsa
-- yazmaz ve null döner; yoksa ekler ve id döner.

create or replace function private.notify(
  p_recipient uuid,
  p_type public.notification_type,
  p_student uuid,
  p_data jsonb,
  p_dedupe interval default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_id uuid;
begin
  select coalesce((p.notification_prefs ->> p_type::text)::boolean, true)
    into v_enabled
  from public.profiles p
  where p.id = p_recipient;
  if v_enabled is not true then
    return null;
  end if;

  if p_dedupe is not null and exists (
    select 1 from public.notifications n
    where n.recipient_id = p_recipient
      and n.type = p_type
      and n.student_id is not distinct from p_student
      and n.created_at > now() - p_dedupe
  ) then
    return null;
  end if;

  insert into public.notifications (recipient_id, student_id, type, data)
  values (p_recipient, p_student, p_type, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.notify(uuid, public.notification_type, uuid, jsonb, interval)
  from public, anon, authenticated;

-- 4. Tetikleyiciler -------------------------------------------------------------------------

-- Plan ilk kez yayınlandı → öğrenci.
create or replace function private.notify_plan_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(
    new.student_id,
    'plan_published',
    new.student_id,
    jsonb_build_object(
      'plan_id', new.id,
      'week_start', new.week_start,
      'items_count', (select count(*) from public.plan_items i where i.plan_id = new.id),
      'has_message', coalesce(new.coach_message, '') <> ''
    )
  );
  return new;
end;
$$;

create trigger weekly_plans_notify_published
  after update of status on public.weekly_plans
  for each row
  when (old.status = 'draft' and new.status = 'published')
  execute function private.notify_plan_published();

-- Koç görünür not yazdı → öğrenci ve/veya velileri.
create or replace function private.notify_note_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_parent uuid;
begin
  if new.visibility = 'coach_only' then
    return new;
  end if;
  v_data := jsonb_build_object(
    'note_id', new.id,
    'author_name', (select p.full_name from public.profiles p where p.id = new.author_id),
    'excerpt', left(new.body, 120)
  );
  if new.visibility in ('student', 'student_and_parent') then
    perform private.notify(new.student_id, 'note_added', new.student_id, v_data);
  end if;
  if new.visibility in ('parent', 'student_and_parent') then
    for v_parent in
      select sp.parent_id from public.student_parents sp where sp.student_id = new.student_id
    loop
      perform private.notify(v_parent, 'note_added', new.student_id, v_data);
    end loop;
  end if;
  return new;
end;
$$;

create trigger coach_notes_notify_added
  after insert on public.coach_notes
  for each row execute function private.notify_note_added();

-- Duyuru → hedef kitle. Koç yalnızca kendi öğrencilerine (owner kurumun tümüne); student_ids
-- verilmişse onlarla kesişim. Veli satırı çocuk başına (student_id dolu).
create or replace function private.notify_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_roles jsonb := new.audience -> 'roles';
  v_ids jsonb := new.audience -> 'student_ids';
  v_data jsonb := jsonb_build_object('announcement_id', new.id, 'title', new.title, 'body', new.body);
  r record;
begin
  select p.role into v_role from public.profiles p where p.id = new.author_id;

  for r in
    select s.profile_id as student_id
    from public.students s
    where s.organization_id = new.organization_id
      and s.status = 'active'
      and (v_role = 'owner' or s.coach_id = new.author_id)
      and (
        v_ids is null or jsonb_typeof(v_ids) = 'null'
        or s.profile_id::text in (select jsonb_array_elements_text(v_ids))
      )
  loop
    if v_roles ? 'student' then
      perform private.notify(r.student_id, 'announcement', r.student_id, v_data);
    end if;
    if v_roles ? 'parent' then
      perform private.notify(sp.parent_id, 'announcement', r.student_id, v_data)
      from public.student_parents sp
      where sp.student_id = r.student_id;
    end if;
  end loop;
  return new;
end;
$$;

create trigger announcements_notify
  after insert on public.announcements
  for each row execute function private.notify_announcement();

-- Öğrenci deneme sonucu girdi → koç (koç kendi girdiğinde bildirim yok).
create or replace function private.notify_mock_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid;
  v_title text;
  v_branch boolean;
begin
  select s.coach_id into v_coach from public.students s where s.profile_id = new.student_id;
  select e.title, e.subject_id is not null
    into v_title, v_branch
  from public.mock_exams e
  where e.id = new.mock_exam_id;
  if not found then
    v_title := new.custom_title;
    v_branch := new.subject_id is not null;
  end if;
  perform private.notify(
    v_coach,
    'mock_result_added',
    new.student_id,
    jsonb_build_object(
      'result_id', new.id,
      'taken_on', new.taken_on,
      'title', v_title,
      'is_branch', coalesce(v_branch, false)
    )
  );
  return new;
end;
$$;

create trigger mock_exam_results_notify
  after insert on public.mock_exam_results
  for each row
  when (new.created_by = new.student_id)
  execute function private.notify_mock_result();

-- Öğrenci görev notu bıraktı → koç.
create or replace function private.notify_plan_item_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan record;
begin
  select p.id, p.student_id, p.week_start, s.coach_id
    into v_plan
  from public.weekly_plans p
  join public.students s on s.profile_id = p.student_id
  where p.id = new.plan_id;
  perform private.notify(
    v_plan.coach_id,
    'student_note',
    v_plan.student_id,
    jsonb_build_object(
      'kind', 'item',
      'plan_id', v_plan.id,
      'week_start', v_plan.week_start,
      'item_id', new.id,
      'item_title', new.title,
      'excerpt', left(new.student_note, 120)
    )
  );
  return new;
end;
$$;

create trigger plan_items_notify_note
  after update of student_note on public.plan_items
  for each row
  when (coalesce(old.student_note, '') = '' and coalesce(new.student_note, '') <> '')
  execute function private.notify_plan_item_note();

-- Öğrenci haftasını değerlendirdi → koç.
create or replace function private.notify_plan_reflection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid;
begin
  select s.coach_id into v_coach from public.students s where s.profile_id = new.student_id;
  perform private.notify(
    v_coach,
    'student_note',
    new.student_id,
    jsonb_build_object(
      'kind', 'reflection',
      'plan_id', new.id,
      'week_start', new.week_start,
      'excerpt', left(new.student_reflection, 120)
    )
  );
  return new;
end;
$$;

create trigger weekly_plans_notify_reflection
  after update of student_reflection on public.weekly_plans
  for each row
  when (coalesce(old.student_reflection, '') = '' and coalesce(new.student_reflection, '') <> '')
  execute function private.notify_plan_reflection();
