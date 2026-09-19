-- Faz 7a: kaynak RPC'leri ve görünümleri (11-faz7-kaynaklar.md §1.2).
--   create_resource         kitap + testler + isteğe bağlı kendine atama, tek transaction (security invoker)
--   move_resource_section   test sırası ↑↓ (move_topic kalıbı)
--   complete_plan_item      p_log.section_id → question_logs.section_id (source 'plan' kalır; karar D12)
--   copy_weekly_plan        section_id kopyalanır
--   v_student_resource_sections   atanmış kaynakların testleri × öğrenci, bitmişlik ve açık plan bağı
--   v_student_resource_progress   kaynak başına ilerleme

-- create_resource -------------------------------------------------------------------------------
-- p_resource = {template_id, subject_id?, type?, title, publisher?, publish_year?}
-- p_sections = [{title, subject_id?, topic_id?, question_count?, page_start?, page_end?, sort_order}]
-- Öğrenci çağırırsa kaynak özeldir (student_id = kendisi), şablon öğrencinin şablonu olmalı ve
-- kendine atanır. Koç/owner katalog kaynağı açar; p_assign_self yalnızca öğrenci için anlamlıdır.
-- Doğrulamalar 22023: invalid_template, invalid_subject, invalid_topic, too_many_sections.
create function public.create_resource(
  p_resource jsonb,
  p_sections jsonb default '[]'::jsonb,
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
  v_template uuid := (p_resource ->> 'template_id')::uuid;
  v_subject uuid := (p_resource ->> 'subject_id')::uuid;
  v_student uuid;
  v_id uuid;
  v_count int;
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
  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'invalid_sections' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_sections);
  if v_count > 400 then
    raise exception 'too_many_sections' using errcode = '22023';
  end if;

  -- Test dersleri şablonda, konular testin (yoksa kitabın) dersine ait olmalı.
  if exists (
    select 1 from jsonb_to_recordset(p_sections) as x(subject_id uuid, topic_id uuid)
    where x.subject_id is not null
      and not exists (select 1 from public.subjects s where s.id = x.subject_id and s.template_id = v_template)
  ) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_sections) as x(subject_id uuid, topic_id uuid)
    where x.topic_id is not null
      and not exists (
        select 1 from public.topics t
        where t.id = x.topic_id and t.subject_id = coalesce(x.subject_id, v_subject)
      )
  ) then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;

  insert into public.resources (organization_id, template_id, subject_id, student_id, type, title, publisher, publish_year, created_by)
  values (
    v_org, v_template, v_subject, v_student,
    coalesce((p_resource ->> 'type')::public.resource_type, 'question_bank'),
    btrim(p_resource ->> 'title'),
    nullif(btrim(coalesce(p_resource ->> 'publisher', '')), ''),
    (p_resource ->> 'publish_year')::smallint,
    (select auth.uid())
  )
  returning id into v_id;

  insert into public.resource_sections (resource_id, subject_id, topic_id, title, question_count, page_start, page_end, sort_order)
  select v_id,
         (e.v ->> 'subject_id')::uuid,
         (e.v ->> 'topic_id')::uuid,
         btrim(e.v ->> 'title'),
         (e.v ->> 'question_count')::smallint,
         (e.v ->> 'page_start')::smallint,
         (e.v ->> 'page_end')::smallint,
         coalesce((e.v ->> 'sort_order')::smallint, (e.ord - 1)::smallint)
  from jsonb_array_elements(p_sections) with ordinality as e(v, ord);

  if v_student is not null or p_assign_self then
    insert into public.student_resources (student_id, resource_id, assigned_by)
    values (coalesce(v_student, (select auth.uid())), v_id, (select auth.uid()))
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

-- move_resource_section -------------------------------------------------------------------------
create function public.move_resource_section(p_section_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_resource_id uuid;
  v_position int;
  v_neighbor uuid;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;
  select resource_id into v_resource_id from public.resource_sections where id = p_section_id for update;
  if v_resource_id is null or not private.can_edit_resource(v_resource_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.resource_sections t
  set sort_order = ranked.rn
  from (
    select id, row_number() over (order by sort_order, created_at, id) as rn
    from public.resource_sections
    where resource_id = v_resource_id
  ) ranked
  where t.id = ranked.id and t.sort_order <> ranked.rn;

  select sort_order into v_position from public.resource_sections where id = p_section_id;
  select id into v_neighbor
  from public.resource_sections
  where resource_id = v_resource_id
    and sort_order = case when p_direction = 'up' then v_position - 1 else v_position + 1 end;
  if v_neighbor is null then
    return;
  end if;
  update public.resource_sections set sort_order = case when p_direction = 'up' then v_position - 1 else v_position + 1 end
  where id = p_section_id;
  update public.resource_sections set sort_order = v_position where id = v_neighbor;
end;
$$;

-- complete_plan_item (replace): section_id bağı --------------------------------------------------
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

  update public.plan_items
  set completed_at = coalesce(completed_at, now()),
      student_note = coalesce(p_note, student_note)
  where id = v_item.id;

  return jsonb_build_object('item_id', v_item.id, 'log_id', v_log_id);
end;
$$;

-- copy_weekly_plan (replace): section_id kopyalanır ------------------------------------------------
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
      target_value, target_unit, estimated_minutes, section_id
    )
    select
      v_plan_id, i.day_of_week, v_existing + (row_number() over (order by i.day_of_week nulls last, i.sort_order, i.created_at)),
      i.kind, i.title, i.subject_id, i.topic_id, i.url, i.target_value, i.target_unit, i.estimated_minutes, i.section_id
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

-- Atanmış kaynakların testleri × öğrenci. done_at: bu testle bağlı en son kayıt günü (null = bitmedi).
-- open_plan_item_id: öğrencinin yayınlanmış planındaki tamamlanmamış, bu teste bağlı en yeni görev.
create view public.v_student_resource_sections
with (security_invoker = true) as
select
  sr.student_id,
  r.id as resource_id,
  r.title as resource_title,
  r.type as resource_type,
  sec.id as section_id,
  sec.title as section_title,
  coalesce(sec.subject_id, r.subject_id) as subject_id,
  s.name as subject_name,
  s.short_name as subject_short_name,
  s.color as subject_color,
  sec.topic_id,
  t.name as topic_name,
  sec.question_count,
  sec.page_start,
  sec.page_end,
  sec.sort_order,
  d.done_at,
  coalesce(d.logs_count, 0)::int as logs_count,
  opi.open_plan_item_id
from public.student_resources sr
join public.resources r on r.id = sr.resource_id
join public.resource_sections sec on sec.resource_id = r.id
left join public.subjects s on s.id = coalesce(sec.subject_id, r.subject_id)
left join public.topics t on t.id = sec.topic_id
left join lateral (
  select max(l.log_date) as done_at, count(*) as logs_count
  from public.question_logs l
  where l.student_id = sr.student_id and l.section_id = sec.id
) d on true
left join lateral (
  select i.id as open_plan_item_id
  from public.plan_items i
  join public.weekly_plans p on p.id = i.plan_id
  where p.student_id = sr.student_id
    and p.status = 'published'
    and i.section_id = sec.id
    and i.completed_at is null
  order by p.week_start desc, i.created_at desc
  limit 1
) opi on true;

-- Kaynak başına ilerleme: bitmiş test = en az bir bağlı kayıt (distinct section_id).
create view public.v_student_resource_progress
with (security_invoker = true) as
select
  sr.student_id,
  sr.resource_id,
  coalesce(tot.sections_total, 0)::int as sections_total,
  coalesce(d.sections_done, 0)::int as sections_done,
  coalesce(tot.questions_total, 0)::int as questions_total,
  coalesce(d.questions_done, 0)::int as questions_done,
  case
    when coalesce(tot.sections_total, 0) = 0 then null
    else round(coalesce(d.sections_done, 0) * 100.0 / tot.sections_total)::int
  end as percent,
  d.last_log_date
from public.student_resources sr
left join lateral (
  select count(*) as sections_total, sum(x.question_count) as questions_total
  from public.resource_sections x
  where x.resource_id = sr.resource_id
) tot on true
left join lateral (
  select count(distinct l.section_id) as sections_done,
         sum(l.total_count) as questions_done,
         max(l.log_date) as last_log_date
  from public.question_logs l
  join public.resource_sections x on x.id = l.section_id
  where x.resource_id = sr.resource_id and l.student_id = sr.student_id
) d on true;

-- Yetkiler ---------------------------------------------------------------------------------------

revoke execute on function
  public.create_resource(jsonb, jsonb, boolean),
  public.move_resource_section(uuid, text)
from public, anon;
grant execute on function
  public.create_resource(jsonb, jsonb, boolean),
  public.move_resource_section(uuid, text)
to authenticated;

revoke all on table public.v_student_resource_sections, public.v_student_resource_progress from anon, authenticated;
grant select on table public.v_student_resource_sections, public.v_student_resource_progress to authenticated;
grant select on table public.v_student_resource_sections, public.v_student_resource_progress to service_role;
