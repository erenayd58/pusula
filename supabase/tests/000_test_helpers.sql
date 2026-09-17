-- Sadece yerel ve CI; uzak projede `supabase test db --linked` çalıştırılmaz.
--
-- pgTAP test yardımcıları. Bu dosya transaction kullanmaz: `tests` şemasını ve
-- fonksiyonlarını commit eder, sonraki dosyalar (begin … rollback) onları kullanır.
-- pg_prove dosyaları alfabetik çalıştırdığı için adı 000_ ile başlar.
--
-- Fixture kimlikleri sabittir: tests.id('student_a') her çağrıda aynı uuid'yi verir,
-- böylece testler ad ile okunur.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- Sabit kimlik --------------------------------------------------------------

create or replace function tests.id(p_name text)
returns uuid
language sql immutable
as $$
  select md5('pusula-test:' || p_name)::uuid
$$;

-- Kullanıcı: auth.users + public.profiles ---------------------------------
-- E-posta <ad>@test.pusula.local; şifre önemsiz (giriş testi yok).

create or replace function tests.create_user(
  p_name text,
  p_role public.user_role,
  p_org uuid,
  p_full_name text,
  p_username text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := tests.id(p_name);
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_name || '@test.pusula.local', 'not-a-real-hash', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  )
  on conflict (id) do nothing;

  -- created_at/updated_at 1 gün geride: set_updated_at tetikleyicisi testte ölçülebilsin
  -- (now() transaction boyunca sabittir).
  insert into public.profiles (id, organization_id, role, full_name, username, created_at, updated_at)
  values (v_id, p_org, p_role, p_full_name, p_username, now() - interval '1 day', now() - interval '1 day')
  on conflict (id) do nothing;

  return v_id;
end;
$$;

-- Sadece auth.users satırı (profilsiz): RPC'lerin profil oluşturmasını test etmek için --

create or replace function tests.create_auth_user(p_name text, p_email text default null)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := tests.id(p_name);
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    coalesce(p_email, p_name || '@test.pusula.local'), 'not-a-real-hash', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  )
  on conflict (id) do nothing;
  return v_id;
end;
$$;

-- Öğrenci satırı (profil önceden create_user ile oluşturulmuş olmalı) ---------

create or replace function tests.create_student(p_name text, p_org uuid, p_coach_name text)
returns uuid
language plpgsql
as $$
begin
  insert into public.students (profile_id, organization_id, coach_id, season, exam_date)
  values (tests.id(p_name), p_org, tests.id(p_coach_name), '2026-2027', date '2027-06-13')
  on conflict (profile_id) do nothing;
  return tests.id(p_name);
end;
$$;

-- Veli bağlantısı -------------------------------------------------------------

create or replace function tests.link_parent(
  p_student_name text,
  p_parent_name text,
  p_relation public.parent_relation default 'mother',
  p_can_view_details boolean default false
)
returns void
language plpgsql
as $$
begin
  insert into public.student_parents (student_id, parent_id, relation, can_view_details)
  values (tests.id(p_student_name), tests.id(p_parent_name), p_relation, p_can_view_details)
  on conflict do nothing;
end;
$$;

-- Ortak fixture ---------------------------------------------------------------
-- Kurum A: owner_a; koçlar coach_x, coach_y; öğrenciler student_a (X), student_b (Y),
--          student_c (X); veliler parent_p1 → a (details=true), parent_p2 → a
--          (details=false), parent_p3 → b (details=true).
-- Kurum B: owner_b; coach_z; student_z (Z); parent_pz → z.

create or replace function tests.seed_fixture()
returns void
language plpgsql
as $$
begin
  insert into public.organizations (id, name, slug)
  values
    (tests.id('org_a'), 'Test Kurum A', 'test-kurum-a'),
    (tests.id('org_b'), 'Test Kurum B', 'test-kurum-b')
  on conflict (id) do nothing;

  perform tests.create_user('owner_a',   'owner',   tests.id('org_a'), 'Owner A');
  perform tests.create_user('coach_x',   'coach',   tests.id('org_a'), 'Koç X');
  perform tests.create_user('coach_y',   'coach',   tests.id('org_a'), 'Koç Y');
  perform tests.create_user('student_a', 'student', tests.id('org_a'), 'Öğrenci A', 'student.a');
  perform tests.create_user('student_b', 'student', tests.id('org_a'), 'Öğrenci B', 'student.b');
  perform tests.create_user('student_c', 'student', tests.id('org_a'), 'Öğrenci C', 'student.c');
  perform tests.create_user('parent_p1', 'parent',  tests.id('org_a'), 'Veli P1');
  perform tests.create_user('parent_p2', 'parent',  tests.id('org_a'), 'Veli P2');
  perform tests.create_user('parent_p3', 'parent',  tests.id('org_a'), 'Veli P3');

  perform tests.create_user('owner_b',   'owner',   tests.id('org_b'), 'Owner B');
  perform tests.create_user('coach_z',   'coach',   tests.id('org_b'), 'Koç Z');
  perform tests.create_user('student_z', 'student', tests.id('org_b'), 'Öğrenci Z', 'student.z');
  perform tests.create_user('parent_pz', 'parent',  tests.id('org_b'), 'Veli PZ');

  perform tests.create_student('student_a', tests.id('org_a'), 'coach_x');
  perform tests.create_student('student_b', tests.id('org_a'), 'coach_y');
  perform tests.create_student('student_c', tests.id('org_a'), 'coach_x');
  perform tests.create_student('student_z', tests.id('org_b'), 'coach_z');

  perform tests.link_parent('student_a', 'parent_p1', 'mother', true);
  perform tests.link_parent('student_a', 'parent_p2', 'father', false);
  perform tests.link_parent('student_b', 'parent_p3', 'guardian', true);
  perform tests.link_parent('student_z', 'parent_pz', 'mother', true);
end;
$$;

-- Etkilenen/dönen satır sayısı --------------------------------------------------
-- p_sql: bir select ya da `... returning 1` ile biten yazma ifadesi. Mevcut rolle
-- çalışır; RLS'nin sessizce filtrelediği yazma işlemlerini (0 satır) ölçmek için.

create or replace function tests.row_count(p_sql text)
returns bigint
language plpgsql
as $$
declare
  v_count bigint;
begin
  execute 'with q as (' || p_sql || ') select count(*) from q' into v_count;
  return v_count;
end;
$$;

-- Oturum simülasyonu ----------------------------------------------------------
-- set_config(..., true): transaction kapsamı; test dosyası rollback ile temizlenir.
-- Rol değişimi oturum kullanıcısı (postgres) üyeliğine dayanır, o yüzden anon
-- iken de authenticated'a geçilebilir.

create or replace function tests.authenticate_as(p_name text)
returns void
language plpgsql
as $$
declare
  v_id uuid := tests.id(p_name);
  v_email text := p_name || '@test.pusula.local';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.email', v_email, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated', 'email', v_email)::text,
    true
  );
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claim.email', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- service_role: Server Action'ın admin istemcisi (RLS'yi atlar).
create or replace function tests.authenticate_as_service_role()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.email', '', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claim.email', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Yetkiler: rol değiştiren üç fonksiyon, row_count ve saf id() anon/authenticated'dan
-- da çağrılabilir (bir testte roller arası geçiş için); fixture fonksiyonları sadece postgres.

grant usage on schema tests to anon, authenticated, service_role;
revoke execute on all functions in schema tests from public, anon, authenticated;
grant execute on function
  tests.authenticate_as(text),
  tests.authenticate_as_anon(),
  tests.authenticate_as_service_role(),
  tests.clear_authentication(),
  tests.row_count(text),
  tests.id(text)
to anon, authenticated, service_role;

-- pg_prove'un sayacağı en az bir test ---------------------------------------

select plan(1);
select has_function('tests', 'seed_fixture', 'tests.seed_fixture yardımcısı hazır');
select * from finish();
