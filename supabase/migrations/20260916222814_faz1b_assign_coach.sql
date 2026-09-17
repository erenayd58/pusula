-- Faz 1b: koç ataması (03-veri-modeli.md Bölüm 7). students.coach_id API'den değişmez
-- (kolon yetkisi yok); sadece owner bu fonksiyonla, aynı kurum içinde, role = 'coach' bir
-- profile atar.

create or replace function public.assign_coach(p_student_id uuid, p_coach_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if private.my_role() is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_org := private.my_org();

  if not exists (
    select 1 from public.students s
    where s.profile_id = p_student_id and s.organization_id = v_org
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_coach_id and p.organization_id = v_org and p.role = 'coach'
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.students set coach_id = p_coach_id where profile_id = p_student_id;
end;
$$;

revoke execute on function public.assign_coach(uuid, uuid) from public, anon;
grant execute on function public.assign_coach(uuid, uuid) to authenticated;
