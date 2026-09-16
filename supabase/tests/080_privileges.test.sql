-- Yetki sertleştirme ve yardımcı fonksiyon testleri (CLAUDE.md "Veritabanı Kuralları").
-- Kolon düzeyi GRANT'lar, anon'un tam yetkisizliği, private fonksiyon erişimi ve
-- can_view_details / can_see_profile davranışı.
begin;
select plan(30);
select tests.seed_fixture();

-- profiles kolon kısıtları -------------------------------------------------------
select tests.authenticate_as('student_a');
select throws_ok(
  $$update public.profiles set role = 'owner' where id = tests.id('student_a')$$,
  '42501', null,
  'öğrenci kendi role kolonunu güncelleyemez'
);
select throws_ok(
  $$update public.profiles set username = 'baska.ad' where id = tests.id('student_a')$$,
  '42501', null,
  'öğrenci kendi username kolonunu güncelleyemez'
);
select throws_ok(
  $$update public.profiles set organization_id = tests.id('org_b') where id = tests.id('student_a')$$,
  '42501', null,
  'öğrenci kendi organization_id kolonunu güncelleyemez'
);
select lives_ok(
  $$update public.profiles set full_name = 'A', avatar_url = 'x.webp', phone = '05' where id = tests.id('student_a')$$,
  'öğrenci full_name, avatar_url, phone kolonlarını güncelleyebilir'
);
select tests.authenticate_as('owner_a');
select throws_ok(
  $$update public.profiles set role = 'owner' where id = tests.id('coach_x')$$,
  '42501', null,
  'owner bile role kolonunu API''den güncelleyemez'
);

-- students: öğrenci güncelleyemez (RLS), koç sabit kolonları değiştiremez (GRANT) ------
select tests.authenticate_as('student_a');
select is(
  tests.row_count($$update public.students set school_name = 'Okul' where profile_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci kendi students satırını güncelleyemez'
);
select tests.authenticate_as('coach_x');
select throws_ok(
  $$update public.students set profile_id = tests.id('student_b') where profile_id = tests.id('student_a')$$,
  '42501', null,
  'koç students.profile_id kolonunu değiştiremez'
);

-- anon: hiçbir tabloyu okuyamaz -----------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok($$select 1 from public.organizations$$,   '42501', null, 'anon organizations okuyamaz');
select throws_ok($$select 1 from public.profiles$$,        '42501', null, 'anon profiles okuyamaz');
select throws_ok($$select 1 from public.students$$,        '42501', null, 'anon students okuyamaz');
select throws_ok($$select 1 from public.student_parents$$, '42501', null, 'anon student_parents okuyamaz');
select throws_ok($$select 1 from public.invitations$$,     '42501', null, 'anon invitations okuyamaz');
select throws_ok($$select 1 from public.consents$$,        '42501', null, 'anon consents okuyamaz');
select throws_ok($$select 1 from public.student_modules$$, '42501', null, 'anon student_modules okuyamaz');
select throws_ok(
  $$insert into public.organizations (name, slug) values ('anon', 'anon')$$,
  '42501', null,
  'anon organizations tablosuna yazamaz'
);

-- anon: private fonksiyonları çağıramaz -------------------------------------------
select throws_ok($$select private.my_role()$$, '42501', null, 'anon private.my_role çağıramaz');
select throws_ok(
  $$select private.can_read_student(tests.id('student_a'))$$,
  '42501', null,
  'anon private.can_read_student çağıramaz'
);

-- authenticated: private fonksiyonlar çalışır, doğru sonuç verir -------------------
select tests.authenticate_as('student_a');
select is(private.my_role(), 'student'::public.user_role, 'my_role öğrenci için student döner');
select is(private.my_org(), tests.id('org_a'), 'my_org kurum A döner');
select ok(private.can_see_profile(tests.id('coach_x')), 'öğrenci A koçu X''i görebilir');
select ok(not private.can_see_profile(tests.id('coach_y')), 'öğrenci A koç Y''yi göremez');
select ok(private.can_see_profile(tests.id('parent_p1')), 'öğrenci A velisi P1''i görebilir');
select ok(not private.can_see_profile(tests.id('parent_p3')), 'öğrenci A veli P3''ü göremez');

-- veli: can_view_details=false iken ayrıntı gerektiren işlemler kapalı ------------
select tests.authenticate_as('parent_p1');
select ok(private.is_parent_of(tests.id('student_a'), true),  'P1 (details=true) ayrıntılı erişime sahip');
select ok(private.can_see_profile(tests.id('coach_x')),        'veli P1 çocuğunun koçunu görebilir');
select tests.authenticate_as('parent_p2');
select ok(private.is_parent_of(tests.id('student_a')),          'P2 temel veli erişimine sahip');
select ok(not private.is_parent_of(tests.id('student_a'), true), 'P2 (details=false) ayrıntılı erişime sahip değil');

-- koç sınırları --------------------------------------------------------------------
select tests.authenticate_as('coach_y');
select ok(not private.can_see_profile(tests.id('student_a')), 'koç Y öğrenci A''nın profilini göremez');
select ok(not private.is_coach_of(tests.id('student_a')), 'koç Y öğrenci A''nın koçu değildir');
select tests.authenticate_as('coach_z');
select ok(not private.can_read_student(tests.id('student_a')), 'kurum B koçu Z öğrenci A''yı okuyamaz');

select * from finish();
rollback;
