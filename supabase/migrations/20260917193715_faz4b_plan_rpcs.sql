-- Faz 4b: plan RPC'leri (08 §1.4). Öğrencinin plan_items/weekly_plans üzerinde doğrudan UPDATE
-- politikası yoktur (03 §5.3 seçenek (a)); tamamlama, geri alma, erteleme, not ve değerlendirme
-- burada, yetki kontrolü ilk satırda. Çok tablolu iş (tamamlama + soru kaydı) tek transaction.
-- "Bugün" her yerde Europe/Istanbul günüdür.

-- Öğrenci kendi YAYINLANMIŞ planında ya da koç/owner her durumda.
create or replace function private.can_act_on_plan(p_plan_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.weekly_plans p
    where p.id = p_plan_id
      and (
        (p.student_id = (select auth.uid()) and p.status = 'published')
        or private.is_coach_of(p.student_id)
      )
  )
$$;

revoke execute on function private.can_act_on_plan(uuid) from public, anon;
grant execute on function private.can_act_on_plan(uuid) to authenticated;

-- complete_plan_item --------------------------------------------------------------------
-- p_log: {subject_id?, topic_id?, correct, wrong, blank, duration_minutes?}; verilirse soru
-- kaydı aynı transaction'da açılır (plan_item_id + source = 'plan'). Tekrar çağrı idempotent.
create function public.complete_plan_item(
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
      student_id, subject_id, topic_id, source, plan_item_id,
      total_count, correct_count, wrong_count, blank_count, duration_minutes
    ) values (
      v_student,
      coalesce((p_log ->> 'subject_id')::uuid, v_item.subject_id),
      coalesce((p_log ->> 'topic_id')::uuid, v_item.topic_id),
      'plan',
      v_item.id,
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

-- uncomplete_plan_item ------------------------------------------------------------------
-- Tamamlamayı geri alır; bağlı soru kayıtları silinmez, bağ kopar (arayüz öğrenciye söyler).
create function public.uncomplete_plan_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_unlinked int;
begin
  select plan_id into v_plan_id from public.plan_items where id = p_item_id for update;
  if v_plan_id is null or not private.can_act_on_plan(v_plan_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.question_logs set plan_item_id = null where plan_item_id = p_item_id;
  get diagnostics v_unlinked = row_count;
  update public.plan_items set completed_at = null where id = p_item_id;
  return jsonb_build_object('item_id', p_item_id, 'unlinked_logs', v_unlinked);
end;
$$;

-- postpone_plan_item --------------------------------------------------------------------
-- Görev başına bir kez. Hedef gün: greatest(gün + 1, bugünün günü) (plan bu haftaysa),
-- 7'yi aşarsa "bu hafta içinde" (null). Gün atanmamış ya da tamamlanmış görev ertelenemez.
create function public.postpone_plan_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.plan_items%rowtype;
  v_week_start date;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_target int;
begin
  select * into v_item from public.plan_items where id = p_item_id for update;
  if v_item.id is null or not private.can_act_on_plan(v_item.plan_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_item.day_of_week is null or v_item.postponed_at is not null or v_item.completed_at is not null then
    raise exception 'cannot_postpone' using errcode = 'P0001';
  end if;
  select week_start into v_week_start from public.weekly_plans where id = v_item.plan_id;
  v_target := v_item.day_of_week + 1;
  if v_week_start = (date_trunc('week', v_today))::date then
    v_target := greatest(v_target, extract(isodow from v_today)::int);
  end if;
  if v_target > 7 then
    v_target := null;
  end if;
  update public.plan_items
  set day_of_week = v_target,
      postponed_from = v_item.day_of_week,
      postponed_at = now(),
      sort_order = coalesce((
        select max(sort_order) + 1 from public.plan_items
        where plan_id = v_item.plan_id and day_of_week is not distinct from v_target
      ), 0)
  where id = v_item.id;
  return jsonb_build_object('item_id', v_item.id, 'day_of_week', v_target);
end;
$$;

-- set_plan_item_note --------------------------------------------------------------------
create function public.set_plan_item_note(p_item_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  select plan_id into v_plan_id from public.plan_items where id = p_item_id;
  if v_plan_id is null or not private.can_act_on_plan(v_plan_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.plan_items set student_note = nullif(btrim(p_note), '') where id = p_item_id;
end;
$$;

-- set_plan_reflection -------------------------------------------------------------------
-- "Haftam nasıl geçti?": hafta kapanana kadar (karar A9); kapanınca week_closed.
create function public.set_plan_reflection(p_plan_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date;
begin
  if not private.can_act_on_plan(p_plan_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select week_start into v_week_start from public.weekly_plans where id = p_plan_id;
  if v_week_start + 7 <= (now() at time zone 'Europe/Istanbul')::date then
    raise exception 'week_closed' using errcode = 'P0001';
  end if;
  update public.weekly_plans set student_reflection = nullif(btrim(p_text), '') where id = p_plan_id;
end;
$$;

-- move_plan_item ------------------------------------------------------------------------
-- Görevi güne (null = bu hafta içinde) ve o gün içinde p_index konumuna taşır; hedef günün
-- sırası 0..n yeniden numaralanır. security invoker: RLS uygulanır; yetkisiz 42501.
create function public.move_plan_item(p_item_id uuid, p_day smallint, p_index int)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_count int;
begin
  select plan_id into v_plan_id from public.plan_items where id = p_item_id for update;
  if v_plan_id is null or not private.can_write_plan(v_plan_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_day is not null and (p_day < 1 or p_day > 7) then
    raise exception 'invalid_day' using errcode = '22023';
  end if;
  update public.plan_items set day_of_week = p_day where id = p_item_id;
  -- Diğer öğeler 0..n-1; p_index ve sonrası bir kaydırılır.
  update public.plan_items t
  set sort_order = case when ranked.rn >= greatest(p_index, 0) then ranked.rn + 1 else ranked.rn end
  from (
    select id, (row_number() over (order by sort_order, created_at, id)) - 1 as rn
    from public.plan_items
    where plan_id = v_plan_id and day_of_week is not distinct from p_day and id <> p_item_id
  ) ranked
  where t.id = ranked.id;
  select count(*) into v_count from public.plan_items
  where plan_id = v_plan_id and day_of_week is not distinct from p_day and id <> p_item_id;
  update public.plan_items set sort_order = least(greatest(p_index, 0), v_count) where id = p_item_id;
end;
$$;

-- copy_weekly_plan ----------------------------------------------------------------------
-- Kaynak planın görevlerini hedef öğrencilerin p_week_start haftasına kopyalar. Hedefte plan
-- yoksa taslak açılır; varsa görevler sona eklenir (karar A3). Tamamlama/not/erteleme sıfırlanır.
-- p_only_incomplete: yalnızca tamamlanmamışlar (tamamlanmayanları aktar). Aynı öğrenciye aynı
-- haftaya kopya (kaynak = hedef) reddedilir.
create function public.copy_weekly_plan(
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
      target_value, target_unit, estimated_minutes
    )
    select
      v_plan_id, i.day_of_week, v_existing + (row_number() over (order by i.day_of_week nulls last, i.sort_order, i.created_at)),
      i.kind, i.title, i.subject_id, i.topic_id, i.url, i.target_value, i.target_unit, i.estimated_minutes
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

-- Yetkiler: fonksiyon başına authenticated (anon/PUBLIC yok) ------------------------------

revoke execute on function
  public.complete_plan_item(uuid, text, jsonb),
  public.uncomplete_plan_item(uuid),
  public.postpone_plan_item(uuid),
  public.set_plan_item_note(uuid, text),
  public.set_plan_reflection(uuid, text),
  public.move_plan_item(uuid, smallint, int),
  public.copy_weekly_plan(uuid, uuid[], date, boolean)
from public, anon;

grant execute on function
  public.complete_plan_item(uuid, text, jsonb),
  public.uncomplete_plan_item(uuid),
  public.postpone_plan_item(uuid),
  public.set_plan_item_note(uuid, text),
  public.set_plan_reflection(uuid, text),
  public.move_plan_item(uuid, smallint, int),
  public.copy_weekly_plan(uuid, uuid[], date, boolean)
to authenticated;
