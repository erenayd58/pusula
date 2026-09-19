-- Faz 7b: copy_curriculum_template (11-faz7-kaynaklar.md §1.4, karar D7).
-- Owner (yalnızca) okuyabildiği bir şablonu (sistem ya da kendi kurumu) kurumuna kopyalar:
--   curriculum_templates  → yeni satır (based_on_id = kaynak, is_published false, exam_date NULL)
--   subjects              → kopya (eski → yeni eşleme)
--   topics                → iki geçiş (önce üst konular, sonra parent_id yeniden eşlenir); school_finish_on NULL
--   p_include_catalogs    → kurum kataloğu (student_id null) resources + resource_sections ve
--                           video_playlists + videos (ders/konu yeniden eşlenir). Özel kaynaklar,
--                           atamalar, mock_exams ve öğrenci verisi kopyalanmaz.
-- Tek transaction; hata → hiçbir şey yazılmaz. Döner: yeni şablon id.

create function public.copy_curriculum_template(
  p_template_id uuid,
  p_new_name text,
  p_new_season text,
  p_include_catalogs boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := private.my_org();
  v_src public.curriculum_templates%rowtype;
  v_new uuid;
  v_actor uuid := (select auth.uid());
begin
  if private.my_role() is distinct from 'owner' or v_org is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_src from public.curriculum_templates where id = p_template_id;
  if v_src.id is null or not private.can_read_template(p_template_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_new_name, '')), '') is null or nullif(btrim(coalesce(p_new_season, '')), '') is null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  insert into public.curriculum_templates (organization_id, name, exam_type, grade, season, scoring, based_on_id, is_published, exam_date)
  values (v_org, btrim(p_new_name), v_src.exam_type, v_src.grade, btrim(p_new_season), v_src.scoring, v_src.id, false, null)
  returning id into v_new;

  -- Ders eşlemesi.
  if to_regclass('pg_temp.tmp_subject_map') is not null then drop table pg_temp.tmp_subject_map; end if;
  create temporary table tmp_subject_map (old_id uuid primary key, new_id uuid not null) on commit drop;
  insert into pg_temp.tmp_subject_map (old_id, new_id)
  select s.id, gen_random_uuid() from public.subjects s where s.template_id = v_src.id;
  insert into public.subjects (id, template_id, code, name, short_name, color, icon, exam_section, exam_question_count, sort_order)
  select m.new_id, v_new, s.code, s.name, s.short_name, s.color, s.icon, s.exam_section, s.exam_question_count, s.sort_order
  from public.subjects s join pg_temp.tmp_subject_map m on m.old_id = s.id;

  -- Konu eşlemesi (üst konular ve alt konular tek eşleme tablosunda; önce hepsi parent'sız yazılır).
  if to_regclass('pg_temp.tmp_topic_map') is not null then drop table pg_temp.tmp_topic_map; end if;
  create temporary table tmp_topic_map (old_id uuid primary key, new_id uuid not null) on commit drop;
  insert into pg_temp.tmp_topic_map (old_id, new_id)
  select t.id, gen_random_uuid()
  from public.topics t join public.subjects s on s.id = t.subject_id
  where s.template_id = v_src.id;
  insert into public.topics (id, subject_id, parent_id, name, semester, importance, estimated_minutes, external_code, sort_order, school_finish_on)
  select tm.new_id, sm.new_id, null, t.name, t.semester, t.importance, t.estimated_minutes, t.external_code, t.sort_order, null
  from public.topics t
  join pg_temp.tmp_topic_map tm on tm.old_id = t.id
  join pg_temp.tmp_subject_map sm on sm.old_id = t.subject_id;
  update public.topics n
  set parent_id = pm.new_id
  from public.topics t
  join pg_temp.tmp_topic_map tm on tm.old_id = t.id
  join pg_temp.tmp_topic_map pm on pm.old_id = t.parent_id
  where n.id = tm.new_id and t.parent_id is not null;

  if p_include_catalogs then
    if to_regclass('pg_temp.tmp_resource_map') is not null then drop table pg_temp.tmp_resource_map; end if;
    create temporary table tmp_resource_map (old_id uuid primary key, new_id uuid not null) on commit drop;
    insert into pg_temp.tmp_resource_map (old_id, new_id)
    select r.id, gen_random_uuid() from public.resources r
    where r.template_id = v_src.id and r.organization_id = v_org and r.student_id is null;
    insert into public.resources (id, organization_id, template_id, subject_id, student_id, type, title, publisher, publish_year, created_by)
    select m.new_id, v_org, v_new, sm.new_id, null, r.type, r.title, r.publisher, r.publish_year, v_actor
    from public.resources r
    join pg_temp.tmp_resource_map m on m.old_id = r.id
    left join pg_temp.tmp_subject_map sm on sm.old_id = r.subject_id;
    insert into public.resource_sections (resource_id, subject_id, topic_id, title, question_count, page_start, page_end, sort_order)
    select m.new_id, sm.new_id, tm.new_id, x.title, x.question_count, x.page_start, x.page_end, x.sort_order
    from public.resource_sections x
    join pg_temp.tmp_resource_map m on m.old_id = x.resource_id
    left join pg_temp.tmp_subject_map sm on sm.old_id = x.subject_id
    left join pg_temp.tmp_topic_map tm on tm.old_id = x.topic_id;

    if to_regclass('pg_temp.tmp_playlist_map') is not null then drop table pg_temp.tmp_playlist_map; end if;
    create temporary table tmp_playlist_map (old_id uuid primary key, new_id uuid not null) on commit drop;
    insert into pg_temp.tmp_playlist_map (old_id, new_id)
    select p.id, gen_random_uuid() from public.video_playlists p
    where p.template_id = v_src.id and p.organization_id = v_org and p.student_id is null;
    -- Aynı YouTube listesi kurum kataloğunda tek olabilir (unique); kopya bağlantısız (elle) liste olur.
    insert into public.video_playlists (id, organization_id, template_id, subject_id, student_id, title, channel_name, youtube_playlist_id, imported_at, created_by)
    select m.new_id, v_org, v_new, sm.new_id, null, p.title, p.channel_name, null, null, v_actor
    from public.video_playlists p
    join pg_temp.tmp_playlist_map m on m.old_id = p.id
    left join pg_temp.tmp_subject_map sm on sm.old_id = p.subject_id;
    insert into public.videos (playlist_id, topic_id, youtube_video_id, title, duration_seconds, sort_order)
    select m.new_id, tm.new_id, v.youtube_video_id, v.title, v.duration_seconds, v.sort_order
    from public.videos v
    join pg_temp.tmp_playlist_map m on m.old_id = v.playlist_id
    left join pg_temp.tmp_topic_map tm on tm.old_id = v.topic_id;
  end if;

  return v_new;
end;
$$;

revoke execute on function public.copy_curriculum_template(uuid, text, text, boolean) from public, anon;
grant execute on function public.copy_curriculum_template(uuid, text, text, boolean) to authenticated;
