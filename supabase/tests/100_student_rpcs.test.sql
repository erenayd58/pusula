-- create_student_account (sadece service_role, aktör yetkisi veritabanında),
-- can_manage_student / can_delete_student (authenticated yetki sorguları).
begin;
select plan(18);
select tests.seed_fixture();

-- Profilsiz Auth kullanıcıları (Server Action'ın admin API ile oluşturduğu adım).
select tests.create_auth_user('new_student_1', 'yeni.bir@ogrenci.pusula.local');
select tests.create_auth_user('new_student_2', 'yeni.iki@ogrenci.pusula.local');
select tests.create_auth_user('new_student_3', 'yeni.uc@ogrenci.pusula.local');

-- 1. authenticated ve anon çağıramaz -------------------------------------------------
select tests.authenticate_as('owner_a');
select throws_ok(
  $$select public.create_student_account(tests.id('owner_a'), tests.id('new_student_1'), tests.id('coach_x'),
      'Yeni Bir', 'yeni.bir', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'authenticated (owner bile) create_student_account çağıramaz'
);
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.create_student_account(tests.id('owner_a'), tests.id('new_student_1'), tests.id('coach_x'),
      'Yeni Bir', 'yeni.bir', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'anon create_student_account çağıramaz'
);

-- 2. service_role: koç kendi adına oluşturur ----------------------------------------
select tests.authenticate_as_service_role();
select is(
  public.create_student_account(tests.id('coach_x'), tests.id('new_student_1'), tests.id('coach_x'),
    'Yeni Bir', 'yeni.bir', '2026-2027', date '2027-06-13'),
  tests.id('new_student_1'),
  'koç X kendi öğrencisini oluşturur'
);
select results_eq(
  $$select p.role::text, p.username, p.organization_id, s.coach_id, s.season, s.exam_date
      from public.profiles p join public.students s on s.profile_id = p.id
      where p.id = tests.id('new_student_1')$$,
  $$values ('student'::text, 'yeni.bir'::text, tests.id('org_a'), tests.id('coach_x'), '2026-2027'::text, date '2027-06-13')$$,
  'profil + öğrenci satırı aktörün kurumunda, doğru koçla oluşur'
);

-- 3. koç başka koça atayamaz; owner kurum içi koça atar, başka kurum/rol reddedilir ------
select throws_ok(
  $$select public.create_student_account(tests.id('coach_x'), tests.id('new_student_2'), tests.id('coach_y'),
      'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'koç X öğrenciyi koç Y''ye atayamaz'
);
select throws_ok(
  $$select public.create_student_account(tests.id('owner_a'), tests.id('new_student_2'), tests.id('coach_z'),
      'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'owner A başka kurumun koçuna (Z) atayamaz'
);
select throws_ok(
  $$select public.create_student_account(tests.id('owner_a'), tests.id('new_student_2'), tests.id('parent_p1'),
      'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'owner veliyi koç olarak atayamaz'
);
select throws_ok(
  $$select public.create_student_account(tests.id('parent_p1'), tests.id('new_student_2'), tests.id('coach_x'),
      'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'aktör veli ise reddedilir'
);
select throws_ok(
  $$select public.create_student_account(tests.id('student_a'), tests.id('new_student_2'), tests.id('coach_x'),
      'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'aktör öğrenci ise reddedilir'
);
select throws_ok(
  $$select public.create_student_account(gen_random_uuid(), tests.id('new_student_2'), tests.id('coach_x'),
      'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13')$$,
  '42501', null,
  'profili olmayan aktör reddedilir'
);
select is(
  public.create_student_account(tests.id('owner_a'), tests.id('new_student_2'), tests.id('coach_y'),
    'Yeni İki', 'yeni.iki', '2026-2027', date '2027-06-13'),
  tests.id('new_student_2'),
  'owner A kurumundaki koç Y''ye atar'
);
select is(
  (select coach_id from public.students where profile_id = tests.id('new_student_2')),
  tests.id('coach_y'),
  'atanan koç Y'
);

-- 4. Kısıtlar: aynı kullanıcı adı, Auth kullanıcısı yok ------------------------------
select throws_ok(
  $$select public.create_student_account(tests.id('coach_x'), tests.id('new_student_3'), tests.id('coach_x'),
      'Yeni Üç', 'yeni.bir', '2026-2027', date '2027-06-13')$$,
  '23505', null,
  'aynı kullanıcı adıyla ikinci öğrenci oluşturulamaz (unique)'
);
select throws_ok(
  $$select public.create_student_account(tests.id('coach_x'), gen_random_uuid(), tests.id('coach_x'),
      'Yok Kişi', 'yok.kisi', '2026-2027', date '2027-06-13')$$,
  'P0002', null,
  'auth.users satırı yoksa hata (önce Auth kullanıcısı oluşturulmalı)'
);

-- 5. can_manage_student / can_delete_student ---------------------------------------
select tests.authenticate_as('coach_x');
select ok(public.can_manage_student(tests.id('student_a')), 'koç X kendi öğrencisini yönetebilir');
select ok(not public.can_manage_student(tests.id('student_b')), 'koç X, Y''nin öğrencisini yönetemez');
select ok(not public.can_delete_student(tests.id('student_a')), 'koç öğrenci silemez');
select tests.authenticate_as('owner_a');
select ok(
  public.can_manage_student(tests.id('student_b')) and public.can_delete_student(tests.id('student_b')),
  'owner A kurumundaki her öğrenciyi yönetir ve silebilir'
);

select * from finish();
rollback;
