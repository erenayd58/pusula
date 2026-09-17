-- Faz 2: create_student_account şablon parametresi alır; move_topic sıralama RPC'si.

-- create_student_account ------------------------------------------------------------
-- Eski imza kaldırılır (overload kalmasın); yeni imza p_curriculum_template_id alır.
-- Şablon sistem şablonu ya da aktörün kurumuna ait olmalı.

drop function public.create_student_account(uuid, uuid, uuid, text, text, text, date);

create function public.create_student_account(
  p_actor_id uuid,
  p_auth_user_id uuid,
  p_coach_id uuid,
  p_full_name text,
  p_username text,
  p_season text,
  p_exam_date date,
  p_curriculum_template_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_coach public.profiles%rowtype;
begin
  -- Yetki: aktör koç ya da owner.
  select * into v_actor from public.profiles where id = p_actor_id;
  if v_actor.id is null or v_actor.role not in ('coach', 'owner') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- Hedef koç: koç sadece kendine; owner kurumundaki koç/owner'a.
  select * into v_coach from public.profiles where id = p_coach_id;
  if v_coach.id is null
     or v_coach.organization_id <> v_actor.organization_id
     or v_coach.role not in ('coach', 'owner')
     or (v_actor.role = 'coach' and v_coach.id <> v_actor.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- Şablon: sistem şablonu ya da aktörün kurumu.
  if not exists (
    select 1 from public.curriculum_templates t
    where t.id = p_curriculum_template_id
      and (t.organization_id is null or t.organization_id = v_actor.organization_id)
  ) then
    raise exception 'template_not_allowed' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users where id = p_auth_user_id) then
    raise exception 'auth_user_missing' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, organization_id, role, full_name, username)
  values (p_auth_user_id, v_actor.organization_id, 'student', p_full_name, p_username);

  insert into public.students (profile_id, organization_id, coach_id, season, exam_date, curriculum_template_id)
  values (p_auth_user_id, v_actor.organization_id, p_coach_id, p_season, p_exam_date, p_curriculum_template_id);

  return p_auth_user_id;
end;
$$;

revoke execute on function public.create_student_account(uuid, uuid, uuid, text, text, text, date, uuid)
  from public, anon, authenticated;
grant execute on function public.create_student_account(uuid, uuid, uuid, text, text, text, date, uuid)
  to service_role;

-- move_topic --------------------------------------------------------------------------
-- Konuyu kardeşleri arasında bir yukarı/aşağı taşır. security invoker: RLS uygulanır
-- (düzenleme yetkisi olmayan kullanıcı satırı göremez → 42501). Kardeşler önce
-- (sort_order, created_at, id) sırasıyla 1..n yeniden numaralanır; böylece eşit
-- sort_order değerlerinde de sonuç deterministiktir. Uçta ise işlem yapılmaz.

create function public.move_topic(p_topic_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_subject_id uuid;
  v_parent_id uuid;
  v_position int;
  v_neighbor uuid;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  -- Yetki: okuyabilen ama düzenleyemeyen (öğrenci) sessiz no-op yerine 42501 alsın.
  if not coalesce(private.can_edit_template(private.topic_template(p_topic_id)), false) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select subject_id, parent_id into v_subject_id, v_parent_id
  from public.topics where id = p_topic_id for update;

  -- Kardeşleri deterministik sırayla yeniden numarala.
  update public.topics t
  set sort_order = ranked.rn
  from (
    select id, row_number() over (order by sort_order, created_at, id) as rn
    from public.topics
    where subject_id = v_subject_id and parent_id is not distinct from v_parent_id
  ) ranked
  where t.id = ranked.id and t.sort_order <> ranked.rn;

  select sort_order into v_position from public.topics where id = p_topic_id;

  select id into v_neighbor
  from public.topics
  where subject_id = v_subject_id
    and parent_id is not distinct from v_parent_id
    and sort_order = case when p_direction = 'up' then v_position - 1 else v_position + 1 end;

  if v_neighbor is null then
    return;
  end if;

  update public.topics set sort_order = case when p_direction = 'up' then v_position - 1 else v_position + 1 end
  where id = p_topic_id;
  update public.topics set sort_order = v_position where id = v_neighbor;
end;
$$;

revoke execute on function public.move_topic(uuid, text) from public, anon;
grant execute on function public.move_topic(uuid, text) to authenticated;
