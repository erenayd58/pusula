-- accept_invitation: kod geçerli/süresi dolmamış/kullanılmamış; profilsiz kullanıcıya veli
-- profili + bağlantı; mevcut veli ikinci çocuğa bağlanır; öğrenci/koç/başka kurum reddedilir;
-- tek kullanımlık; tüm hatalar aynı mesaj.
begin;
select plan(17);
select tests.seed_fixture();

-- Davetler (koç X, öğrenci A ve C için; owner B kurum B'de öğrenci Z için)
insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at) values
  (tests.id('org_a'), 'VALIDAAA', 'parent', tests.id('student_a'), tests.id('coach_x'), now() + interval '7 days'),
  (tests.id('org_a'), 'VALIDCCC', 'parent', tests.id('student_c'), tests.id('coach_x'), now() + interval '7 days'),
  (tests.id('org_a'), 'VALIDBBB', 'parent', tests.id('student_b'), tests.id('coach_y'), now() + interval '7 days'),
  (tests.id('org_a'), 'EXPIRED1', 'parent', tests.id('student_a'), tests.id('coach_x'), now() - interval '1 hour'),
  (tests.id('org_a'), 'USEDCODE', 'parent', tests.id('student_a'), tests.id('coach_x'), now() + interval '7 days'),
  (tests.id('org_b'), 'ORGBCODE', 'parent', tests.id('student_z'), tests.id('coach_z'), now() + interval '7 days'),
  (tests.id('org_a'), 'COACHINV', 'coach',  null,                  tests.id('owner_a'), now() + interval '7 days');
update public.invitations set used_by = tests.id('parent_p1'), used_at = now() where code = 'USEDCODE';

-- Profilsiz doğrulanmış kullanıcılar (signUp + e-posta onayı sonrası hali)
select tests.create_auth_user('new_parent_1', 'yeni.veli1@pusula.local');
select tests.create_auth_user('new_parent_2', 'yeni.veli2@pusula.local');

-- 1. anon çağıramaz ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.accept_invitation('VALIDAAA', 'Yeni Veli', 'mother')$$,
  '42501', null,
  'anon accept_invitation çağıramaz'
);

-- 2. Hatalı, süresi dolmuş, kullanılmış, koç daveti: hepsi aynı mesaj ---------------------
select tests.authenticate_as('new_parent_1');
select throws_ok(
  $$select public.accept_invitation('YOKKODUU', 'Yeni Veli', 'mother')$$,
  'P0001', 'invalid_invitation',
  'olmayan kod: invalid_invitation'
);
select throws_ok(
  $$select public.accept_invitation('EXPIRED1', 'Yeni Veli', 'mother')$$,
  'P0001', 'invalid_invitation',
  'süresi dolmuş kod: invalid_invitation'
);
select throws_ok(
  $$select public.accept_invitation('USEDCODE', 'Yeni Veli', 'mother')$$,
  'P0001', 'invalid_invitation',
  'kullanılmış kod: invalid_invitation'
);
select throws_ok(
  $$select public.accept_invitation('COACHINV', 'Yeni Veli', 'mother')$$,
  'P0001', 'invalid_invitation',
  'koç daveti veli kabulüyle kullanılamaz'
);
select throws_ok(
  $$select public.accept_invitation('VALIDAAA', ' ', 'mother')$$,
  'P0001', 'invalid_invitation',
  'profilsiz kullanıcı ad vermeden kabul edemez'
);

-- 3. Profilsiz kullanıcı: profil + bağlantı oluşur; kod normalize edilir ------------------
select is(
  public.accept_invitation(' valid-aaa ', 'Yeni Veli', 'mother'),
  tests.id('student_a'),
  'geçerli kod kabul edilir (küçük harf/boşluk/tire normalize), öğrenci id döner'
);
select results_eq(
  $$select role::text, organization_id, full_name from public.profiles where id = tests.id('new_parent_1')$$,
  $$values ('parent'::text, tests.id('org_a'), 'Yeni Veli'::text)$$,
  'veli profili davetin kurumunda oluştu'
);
select results_eq(
  $$select relation::text, can_view_details from public.student_parents
      where student_id = tests.id('student_a') and parent_id = tests.id('new_parent_1')$$,
  $$values ('mother'::text, false)$$,
  'student_parents bağlantısı kuruldu (ayrıntı izni varsayılan kapalı)'
);
select tests.clear_authentication();   -- veli invitations'ı göremez (RLS); tablo sahibi olarak bak
select results_eq(
  $$select used_by from public.invitations where code = 'VALIDAAA'$$,
  $$values (tests.id('new_parent_1'))$$,
  'davet kullanılmış işaretlendi'
);

-- 4. Tek kullanımlık: aynı kod ikinci kullanıcıda geçmez ------------------------------------
select tests.authenticate_as('new_parent_2');
select throws_ok(
  $$select public.accept_invitation('VALIDAAA', 'İkinci Veli', 'father')$$,
  'P0001', 'invalid_invitation',
  'aynı kod ikinci kez kullanılamaz'
);

-- 5. Mevcut veli ikinci çocuğa bağlanır; başka kurumun daveti reddedilir ----------------------
select tests.authenticate_as('new_parent_1');
select is(
  public.accept_invitation('VALIDCCC', null, 'mother'),
  tests.id('student_c'),
  'mevcut veli ikinci çocuğun davetini kabul eder (ad gerekmez)'
);
select is(
  (select count(*) from public.student_parents where parent_id = tests.id('new_parent_1')),
  2::bigint,
  'veli iki çocuğa bağlı'
);
select throws_ok(
  $$select public.accept_invitation('ORGBCODE', null, 'mother')$$,
  'P0001', 'invalid_invitation',
  'kurum A velisi kurum B davetini kabul edemez'
);

-- 6. Öğrenci ve koç kabul edemez ------------------------------------------------------------
select tests.authenticate_as('student_a');
select throws_ok(
  $$select public.accept_invitation('VALIDBBB', null, 'mother')$$,
  'P0001', 'invalid_invitation',
  'öğrenci davet kabul edemez (aynı kurumda bile)'
);
select tests.authenticate_as('coach_y');
select throws_ok(
  $$select public.accept_invitation('VALIDBBB', null, 'mother')$$,
  'P0001', 'invalid_invitation',
  'koç davet kabul edemez (kendi öğrencisi için bile)'
);
select is(
  (select used_at from public.invitations where code = 'VALIDBBB'),
  null,
  'reddedilen denemeler daveti tüketmez'
);

select * from finish();
rollback;
