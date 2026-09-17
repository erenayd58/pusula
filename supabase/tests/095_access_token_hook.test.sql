-- custom_access_token_hook: profiles.role → claims.app_metadata.user_role.
-- Sadece supabase_auth_admin çağırabilir; profili olmayan kullanıcıda event değişmez.
begin;
select plan(7);
select tests.seed_fixture();

-- Davranış (postgres sahip olarak çağırır; supabase_auth_admin'e geçiş üyelik gerektirir,
-- yetki ayrıca has_function_privilege ile denetlenir) ---------------------------------

select is(
  (
    public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', tests.id('student_a'),
        'claims', jsonb_build_object('sub', tests.id('student_a'), 'role', 'authenticated',
                                     'app_metadata', jsonb_build_object('provider', 'email'))
      )
    )
  )->'claims'->'app_metadata'->>'user_role',
  'student',
  'öğrencinin token''ına user_role = student eklenir'
);

select is(
  (
    public.custom_access_token_hook(
      jsonb_build_object('user_id', tests.id('owner_a'), 'claims', jsonb_build_object('sub', tests.id('owner_a')))
    )
  )->'claims'->'app_metadata'->>'user_role',
  'owner',
  'app_metadata yoksa oluşturulur; owner rolü yazılır'
);

select is(
  (
    public.custom_access_token_hook(
      jsonb_build_object('user_id', tests.id('student_a'), 'claims', jsonb_build_object('app_metadata', jsonb_build_object('provider', 'email')))
    )
  )->'claims'->'app_metadata'->>'provider',
  'email',
  'mevcut app_metadata alanları korunur'
);

select ok(
  (
    public.custom_access_token_hook(
      jsonb_build_object('user_id', gen_random_uuid(), 'claims', jsonb_build_object('sub', 'x'))
    )
  )->'claims'->'app_metadata' is null,
  'profili olmayan kullanıcıda user_role claim''i eklenmez'
);

-- Diğer roller çağıramaz ----------------------------------------------------------------
select tests.authenticate_as('owner_a');
select throws_ok(
  $$select public.custom_access_token_hook('{"user_id": "00000000-0000-0000-0000-000000000000"}'::jsonb)$$,
  '42501', null,
  'authenticated hook''u çağıramaz'
);

select tests.authenticate_as_anon();
select throws_ok(
  $$select public.custom_access_token_hook('{"user_id": "00000000-0000-0000-0000-000000000000"}'::jsonb)$$,
  '42501', null,
  'anon hook''u çağıramaz'
);

select tests.clear_authentication();
select ok(
  has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'supabase_auth_admin execute yetkisine sahip'
);

select * from finish();
rollback;
