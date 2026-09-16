-- Faz 1a: private şemasındaki yardımcı fonksiyonlar (03-veri-modeli.md Bölüm 5.1).
-- Hepsi security definer + set search_path = '' + şema önekli tablo adları.
-- Yetkiler (execute) faz1a_privileges migration'ında verilir.

-- Oturumdaki kullanıcının profili -------------------------------------------

create or replace function private.my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function private.my_org()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select organization_id from public.profiles where id = (select auth.uid())
$$;

-- Koç mu (veya aynı kurumun sahibi mi)? ---------------------------------------

create or replace function private.is_coach_of(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    join public.profiles me on me.id = (select auth.uid())
    where s.profile_id = p_student_id
      and s.organization_id = me.organization_id
      and (s.coach_id = me.id or me.role = 'owner')
  )
$$;

-- Veli mi? p_details = true ise can_view_details de aranır. -------------------

create or replace function private.is_parent_of(p_student_id uuid, p_details boolean default false)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.student_parents sp
    where sp.student_id = p_student_id
      and sp.parent_id = (select auth.uid())
      and (not p_details or sp.can_view_details)
  )
$$;

create or replace function private.can_read_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_student_id = (select auth.uid())
      or private.is_coach_of(p_student_id)
      or private.is_parent_of(p_student_id)
$$;

create or replace function private.can_write_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_student_id = (select auth.uid())
      or private.is_coach_of(p_student_id)
$$;

-- Profil görünürlüğü ----------------------------------------------------------
-- Kendisi; owner kendi kurumundaki herkes; koç kendi öğrencileri ve onların
-- velileri; öğrenci kendi koçu ve kendi velileri; veli kendi çocuğu ve çocuğun koçu.

create or replace function private.can_see_profile(p_target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  with me as (
    select id, organization_id, role
    from public.profiles
    where id = (select auth.uid())
  )
  select exists (
    select 1 from me where me.id = p_target
  )
  or exists (
    select 1
    from me
    join public.profiles t on t.id = p_target
    where me.role = 'owner'
      and t.organization_id = me.organization_id
  )
  or exists (                                   -- koç: hedef benim öğrencim
    select 1
    from me
    join public.students s on s.coach_id = me.id
    where s.profile_id = p_target
  )
  or exists (                                   -- koç: hedef benim öğrencimin velisi
    select 1
    from me
    join public.students s on s.coach_id = me.id
    join public.student_parents sp on sp.student_id = s.profile_id
    where sp.parent_id = p_target
  )
  or exists (                                   -- öğrenci: hedef benim koçum
    select 1
    from me
    join public.students s on s.profile_id = me.id
    where s.coach_id = p_target
  )
  or exists (                                   -- öğrenci: hedef benim velim
    select 1
    from me
    join public.student_parents sp on sp.student_id = me.id
    where sp.parent_id = p_target
  )
  or exists (                                   -- veli: hedef benim çocuğum
    select 1
    from me
    join public.student_parents sp on sp.parent_id = me.id
    where sp.student_id = p_target
  )
  or exists (                                   -- veli: hedef çocuğumun koçu
    select 1
    from me
    join public.student_parents sp on sp.parent_id = me.id
    join public.students s on s.profile_id = sp.student_id
    where s.coach_id = p_target
  )
$$;

-- Hedef profil, oturum sahibinin kurumunda role = 'parent' olan bir profil mi?
-- student_parents INSERT/UPDATE with check'inde kullanılır.

create or replace function private.is_parent_profile_in_my_org(p_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles t
    join public.profiles me on me.id = (select auth.uid())
    where t.id = p_profile
      and t.role = 'parent'
      and t.organization_id = me.organization_id
  )
$$;
