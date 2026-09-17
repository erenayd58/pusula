-- Faz 1b: öğrenci hesabı RPC'leri (03-veri-modeli.md Bölüm 7; 02 karar #17).
-- Öğrenci oluşturma/silme API'den değil, Server Action'da secret key ile yapılır; bu
-- fonksiyonlar yetkiyi veritabanında doğrular ve çok tablolu yazmayı tek transaction'da tutar.

-- create_student_account -----------------------------------------------------------
-- Sadece service_role çağırır (Server Action, Auth kullanıcısını admin API ile oluşturduktan
-- sonra). Çağıran kimliği (p_actor_id) sunucuda doğrulanmış oturumdan gelir; yetki burada
-- yeniden denetlenir: aktör koç/owner olmalı, koç yalnızca kendine, owner kurumundaki bir
-- koça/owner'a atayabilir. profiles + students tek transaction; hata → Server Action Auth
-- kullanıcısını siler (telafi).

create or replace function public.create_student_account(
  p_actor_id uuid,
  p_auth_user_id uuid,
  p_coach_id uuid,
  p_full_name text,
  p_username text,
  p_season text,
  p_exam_date date
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

  if not exists (select 1 from auth.users where id = p_auth_user_id) then
    raise exception 'auth_user_missing' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, organization_id, role, full_name, username)
  values (p_auth_user_id, v_actor.organization_id, 'student', p_full_name, p_username);

  insert into public.students (profile_id, organization_id, coach_id, season, exam_date)
  values (p_auth_user_id, v_actor.organization_id, p_coach_id, p_season, p_exam_date);

  return p_auth_user_id;
end;
$$;

revoke execute on function public.create_student_account(uuid, uuid, uuid, text, text, text, date)
  from public, anon, authenticated;
grant execute on function public.create_student_account(uuid, uuid, uuid, text, text, text, date)
  to service_role;

-- Yetki sorguları (authenticated): admin API'li işlemlerden önce Server Action çağırır. --------

-- Öğrencinin koçu ya da kurumunun owner'ı mı? (şifre sıfırlama, davet kodu)
create or replace function public.can_manage_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_coach_of(p_student_id)
$$;

-- Öğrencinin kurumunun owner'ı mı? (öğrenci silme)
create or replace function public.can_delete_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    join public.profiles me on me.id = (select auth.uid())
    where s.profile_id = p_student_id
      and s.organization_id = me.organization_id
      and me.role = 'owner'
  )
$$;

revoke execute on function public.can_manage_student(uuid) from public, anon;
revoke execute on function public.can_delete_student(uuid) from public, anon;
grant execute on function public.can_manage_student(uuid) to authenticated;
grant execute on function public.can_delete_student(uuid) to authenticated;
