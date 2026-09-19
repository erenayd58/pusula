-- Faz 7b: video RPC'leri ve görünümleri (11-faz7-kaynaklar.md §1.3).
--   create_playlist          liste + videolar + isteğe bağlı kendine atama (security invoker; create_resource kalıbı)
--   import_playlist_videos   "Listeyi yenile" / tek video: upsert (konu korunur, çıkan video kalır; D4)
--   mark_video_watched       izleme işareti + yayınlanmış plandaki açık video görevini tamamlar (D6)
--   complete_plan_item       video türü → student_video_progress.watched_at (D6)
--   copy_weekly_plan         video_id kopyalanır
--   v_student_playlist_videos, v_student_playlist_progress

-- create_playlist ---------------------------------------------------------------------------------
-- p_playlist = {template_id, subject_id?, title, channel_name?, youtube_playlist_id?}
-- p_videos   = [{youtube_video_id, title, duration_seconds?, topic_id?, sort_order?}]
create function public.create_playlist(
  p_playlist jsonb,
  p_videos jsonb default '[]'::jsonb,
  p_assign_self boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.user_role := private.my_role();
  v_org uuid := private.my_org();
  v_template uuid := (p_playlist ->> 'template_id')::uuid;
  v_subject uuid := (p_playlist ->> 'subject_id')::uuid;
  v_student uuid;
  v_id uuid;
begin
  if v_role is null or v_org is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_role = 'student' then
    v_student := (select auth.uid());
    if not exists (
      select 1 from public.students s
      where s.profile_id = v_student and s.curriculum_template_id = v_template
    ) then
      raise exception 'invalid_template' using errcode = '22023';
    end if;
  elsif v_role not in ('coach', 'owner') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_template is null or not private.can_read_template(v_template) then
    raise exception 'invalid_template' using errcode = '22023';
  end if;
  if v_subject is not null and not exists (
    select 1 from public.subjects s where s.id = v_subject and s.template_id = v_template
  ) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;
  if p_videos is null or jsonb_typeof(p_videos) <> 'array' then
    raise exception 'invalid_videos' using errcode = '22023';
  end if;
  if jsonb_array_length(p_videos) > 200 then
    raise exception 'too_many_videos' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_videos) e
    where (e.value ->> 'topic_id') is not null
      and not exists (
        select 1 from public.topics t
        join public.subjects s on s.id = t.subject_id
        where t.id = (e.value ->> 'topic_id')::uuid and s.template_id = v_template
      )
  ) then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;

  insert into public.video_playlists (organization_id, template_id, subject_id, student_id, title, channel_name, youtube_playlist_id, imported_at, created_by)
  values (
    v_org, v_template, v_subject, v_student,
    btrim(p_playlist ->> 'title'),
    nullif(btrim(coalesce(p_playlist ->> 'channel_name', '')), ''),
    nullif(btrim(coalesce(p_playlist ->> 'youtube_playlist_id', '')), ''),
    case when (p_playlist ->> 'youtube_playlist_id') is not null then now() else null end,
    (select auth.uid())
  )
  returning id into v_id;

  insert into public.videos (playlist_id, topic_id, youtube_video_id, title, duration_seconds, sort_order)
  select v_id,
         (e.v ->> 'topic_id')::uuid,
         e.v ->> 'youtube_video_id',
         btrim(e.v ->> 'title'),
         (e.v ->> 'duration_seconds')::int,
         coalesce((e.v ->> 'sort_order')::smallint, (e.ord - 1)::smallint)
  from jsonb_array_elements(p_videos) with ordinality as e(v, ord)
  on conflict (playlist_id, youtube_video_id) do nothing;

  if v_student is not null or p_assign_self then
    insert into public.student_playlists (student_id, playlist_id, assigned_by)
    values (coalesce(v_student, (select auth.uid())), v_id, (select auth.uid()))
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

-- import_playlist_videos ---------------------------------------------------------------------------
-- Upsert: yeni video eklenir; mevcutta başlık / süre / sıra güncellenir, topic_id korunur; listeden
-- çıkan video silinmez. Döner {inserted, updated}.
create function public.import_playlist_videos(p_playlist_id uuid, p_videos jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_before int;
  v_total int;
  v_touched int;
begin
  if not private.can_edit_playlist(p_playlist_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_videos is null or jsonb_typeof(p_videos) <> 'array' then
    raise exception 'invalid_videos' using errcode = '22023';
  end if;
  if jsonb_array_length(p_videos) > 200 then
    raise exception 'too_many_videos' using errcode = '22023';
  end if;
  select count(*) into v_before from public.videos where playlist_id = p_playlist_id;

  insert into public.videos as v (playlist_id, youtube_video_id, title, duration_seconds, sort_order)
  select p_playlist_id,
         e.v ->> 'youtube_video_id',
         btrim(e.v ->> 'title'),
         (e.v ->> 'duration_seconds')::int,
         coalesce((e.v ->> 'sort_order')::smallint, (v_before + e.ord - 1)::smallint)
  from jsonb_array_elements(p_videos) with ordinality as e(v, ord)
  on conflict (playlist_id, youtube_video_id) do update
    set title = excluded.title,
        duration_seconds = coalesce(excluded.duration_seconds, v.duration_seconds),
        sort_order = excluded.sort_order;
  get diagnostics v_touched = row_count;

  select count(*) into v_total from public.videos where playlist_id = p_playlist_id;
  update public.video_playlists set imported_at = now()
  where id = p_playlist_id and youtube_playlist_id is not null;

  return jsonb_build_object('inserted', v_total - v_before, 'updated', v_touched - (v_total - v_before));
end;
$$;

-- mark_video_watched --------------------------------------------------------------------------------
-- İzleme işareti (upsert; not korunur). p_watched ise öğrencinin yayınlanmış planlarındaki
-- tamamlanmamış, bu videoya bağlı görevler tamamlanır. Geri almak plan görevine dokunmaz.
create function public.mark_video_watched(
  p_video_id uuid,
  p_watched boolean,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := coalesce(p_student_id, (select auth.uid()));
  v_playlist uuid;
  v_completed int := 0;
begin
  if v_student is null or not private.can_write_student(v_student) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select playlist_id into v_playlist from public.videos where id = p_video_id;
  if v_playlist is null or not private.can_read_playlist(v_playlist) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  insert into public.student_video_progress as pr (student_id, video_id, watched_at)
  values (v_student, p_video_id, case when p_watched then now() else null end)
  on conflict (student_id, video_id) do update
    set watched_at = case when p_watched then coalesce(pr.watched_at, now()) else null end;

  if p_watched then
    update public.plan_items i
    set completed_at = now()
    from public.weekly_plans p
    where p.id = i.plan_id
      and p.student_id = v_student
      and p.status = 'published'
      and i.video_id = p_video_id
      and i.completed_at is null;
    get diagnostics v_completed = row_count;
  end if;

  return jsonb_build_object('video_id', p_video_id, 'watched', p_watched, 'completed_items', v_completed);
end;
$$;

-- complete_plan_item (replace): video türü izlendi yazar -------------------------------------------
create or replace function public.complete_plan_item(
  p_item_id uuid,
  p_note text default null,
  p_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.plan_items%rowtype;
  v_student uuid;
  v_log_id uuid;
  v_correct int;
  v_wrong int;
  v_blank int;
begin
  select * into v_item from public.plan_items where id = p_item_id for update;
  if v_item.id is null or not private.can_act_on_plan(v_item.plan_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_student := private.plan_student(v_item.plan_id);

  if p_log is not null then
    v_correct := coalesce((p_log ->> 'correct')::int, 0);
    v_wrong := coalesce((p_log ->> 'wrong')::int, 0);
    v_blank := coalesce((p_log ->> 'blank')::int, 0);
    insert into public.question_logs (
      student_id, subject_id, topic_id, source, plan_item_id, section_id,
      total_count, correct_count, wrong_count, blank_count, duration_minutes
    ) values (
      v_student,
      coalesce((p_log ->> 'subject_id')::uuid, v_item.subject_id),
      coalesce((p_log ->> 'topic_id')::uuid, v_item.topic_id),
      'plan',
      v_item.id,
      coalesce((p_log ->> 'section_id')::uuid, v_item.section_id),
      v_correct + v_wrong + v_blank,
      v_correct, v_wrong, v_blank,
      (p_log ->> 'duration_minutes')::int
    )
    returning id into v_log_id;
  end if;

  -- Video görevi: izlendi işareti aynı transaction'da (karar D6).
  if v_item.kind = 'video' and v_item.video_id is not null then
    insert into public.student_video_progress as pr (student_id, video_id, watched_at)
    values (v_student, v_item.video_id, now())
    on conflict (student_id, video_id) do update
      set watched_at = coalesce(pr.watched_at, now());
  end if;

  update public.plan_items
  set completed_at = coalesce(completed_at, now()),
      student_note = coalesce(p_note, student_note)
  where id = v_item.id;

  return jsonb_build_object('item_id', v_item.id, 'log_id', v_log_id);
end;
$$;

-- copy_weekly_plan (replace): video_id kopyalanır -----------------------------------------------------
create or replace function public.copy_weekly_plan(
  p_source_plan_id uuid,
  p_target_student_ids uuid[],
  p_week_start date,
  p_only_incomplete boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.weekly_plans%rowtype;
  v_target uuid;
  v_plan_id uuid;
  v_existing int;
  v_added int;
  v_result jsonb := '[]'::jsonb;
begin
  select * into v_source from public.weekly_plans where id = p_source_plan_id;
  if v_source.id is null or not private.is_coach_of(v_source.student_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'invalid_week_start' using errcode = '22023';
  end if;
  if p_target_student_ids is null or cardinality(p_target_student_ids) = 0 then
    raise exception 'no_targets' using errcode = '22023';
  end if;

  foreach v_target in array p_target_student_ids loop
    if not private.is_coach_of(v_target) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if v_target = v_source.student_id and p_week_start = v_source.week_start then
      raise exception 'same_plan' using errcode = '22023';
    end if;

    insert into public.weekly_plans (student_id, week_start, created_by)
    values (v_target, p_week_start, (select auth.uid()))
    on conflict (student_id, week_start) do nothing;
    select id into v_plan_id from public.weekly_plans
    where student_id = v_target and week_start = p_week_start;
    select count(*) into v_existing from public.plan_items where plan_id = v_plan_id;

    insert into public.plan_items (
      plan_id, day_of_week, sort_order, kind, title, subject_id, topic_id, url,
      target_value, target_unit, estimated_minutes, section_id, video_id
    )
    select
      v_plan_id, i.day_of_week, v_existing + (row_number() over (order by i.day_of_week nulls last, i.sort_order, i.created_at)),
      i.kind, i.title, i.subject_id, i.topic_id, i.url, i.target_value, i.target_unit, i.estimated_minutes, i.section_id, i.video_id
    from public.plan_items i
    where i.plan_id = v_source.id
      and (not p_only_incomplete or i.completed_at is null);
    get diagnostics v_added = row_count;

    v_result := v_result || jsonb_build_object(
      'student_id', v_target, 'plan_id', v_plan_id,
      'existing_items', v_existing, 'added_items', v_added
    );
  end loop;

  return jsonb_build_object('copied', v_result);
end;
$$;

-- Görünümler ------------------------------------------------------------------------------------

-- Atanmış listelerin videoları × öğrenci; izleme ve açık plan bağı.
create view public.v_student_playlist_videos
with (security_invoker = true) as
select
  sp.student_id,
  p.id as playlist_id,
  p.title as playlist_title,
  p.subject_id,
  s.name as subject_name,
  s.short_name as subject_short_name,
  s.color as subject_color,
  v.id as video_id,
  v.youtube_video_id,
  v.title,
  v.duration_seconds,
  v.topic_id,
  t.name as topic_name,
  v.sort_order,
  pr.watched_at,
  pr.note,
  opi.open_plan_item_id
from public.student_playlists sp
join public.video_playlists p on p.id = sp.playlist_id
join public.videos v on v.playlist_id = p.id
left join public.subjects s on s.id = p.subject_id
left join public.topics t on t.id = v.topic_id
left join public.student_video_progress pr on pr.student_id = sp.student_id and pr.video_id = v.id
left join lateral (
  select i.id as open_plan_item_id
  from public.plan_items i
  join public.weekly_plans wp on wp.id = i.plan_id
  where wp.student_id = sp.student_id
    and wp.status = 'published'
    and i.video_id = v.id
    and i.completed_at is null
  order by wp.week_start desc, i.created_at desc
  limit 1
) opi on true;

-- Liste başına ilerleme: izlenen = watched_at dolu; kalan dakika = izlenmemişlerin süresi.
create view public.v_student_playlist_progress
with (security_invoker = true) as
select
  sp.student_id,
  sp.playlist_id,
  coalesce(tot.videos_total, 0)::int as videos_total,
  coalesce(d.videos_watched, 0)::int as videos_watched,
  coalesce(round(tot.seconds_total / 60.0), 0)::int as minutes_total,
  coalesce(round(d.seconds_remaining / 60.0), 0)::int as minutes_remaining,
  case
    when coalesce(tot.videos_total, 0) = 0 then null
    else round(coalesce(d.videos_watched, 0) * 100.0 / tot.videos_total)::int
  end as percent,
  d.last_watched_at
from public.student_playlists sp
left join lateral (
  select count(*) as videos_total, coalesce(sum(v.duration_seconds), 0) as seconds_total
  from public.videos v
  where v.playlist_id = sp.playlist_id
) tot on true
left join lateral (
  select count(pr.watched_at) as videos_watched,
         coalesce(sum(case when pr.watched_at is null then v.duration_seconds else 0 end), 0) as seconds_remaining,
         max(pr.watched_at) as last_watched_at
  from public.videos v
  left join public.student_video_progress pr on pr.video_id = v.id and pr.student_id = sp.student_id
  where v.playlist_id = sp.playlist_id
) d on true;

-- Yetkiler ---------------------------------------------------------------------------------------

revoke execute on function
  public.create_playlist(jsonb, jsonb, boolean),
  public.import_playlist_videos(uuid, jsonb),
  public.mark_video_watched(uuid, boolean, uuid)
from public, anon;
grant execute on function
  public.create_playlist(jsonb, jsonb, boolean),
  public.import_playlist_videos(uuid, jsonb),
  public.mark_video_watched(uuid, boolean, uuid)
to authenticated;

revoke all on table public.v_student_playlist_videos, public.v_student_playlist_progress from anon, authenticated;
grant select on table public.v_student_playlist_videos, public.v_student_playlist_progress to authenticated;
grant select on table public.v_student_playlist_videos, public.v_student_playlist_progress to service_role;
