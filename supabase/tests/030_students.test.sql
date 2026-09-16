-- students RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
-- Öğrenci okur, güncelleyemez; koç/owner günceller (sınırlı kolonlar);
-- INSERT ve DELETE politikası yok (Faz 1b'de secret key ile).
begin;
select plan(24);
select tests.seed_fixture();

-- 1. Öğrenci kendi satırını görür.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.students), 1::bigint,
  'öğrenci A sadece bir öğrenci satırı görür'
);
select is(
  (select profile_id from public.students), tests.id('student_a'),
  'öğrenci A gördüğü satır kendisidir'
);

-- 2. Öğrenci B'yi göremez, ekleyemez, kendi satırını güncelleyemez.
select is(
  (select count(*) from public.students where profile_id = tests.id('student_b')), 0::bigint,
  'öğrenci A öğrenci B''yi göremez'
);
select throws_ok(
  $$insert into public.students (profile_id, organization_id, coach_id, season)
    values (tests.id('parent_p1'), tests.id('org_a'), tests.id('coach_x'), '2026-2027')$$,
  '42501', null,
  'öğrenci students tablosuna ekleyemez'
);
select is(
  tests.row_count($$update public.students set grade = 9 where profile_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci kendi students satırını güncelleyemez'
);

-- 3. Koç kendi öğrencilerini görür ve günceller; başka koçun öğrencisini görmez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.students), 2::bigint,
  'koç X iki öğrencisini görür (A, C)'
);
select is(
  (select count(*) from public.students where profile_id = tests.id('student_b')), 0::bigint,
  'koç X başka koçun öğrencisi B''yi göremez'
);
select is(
  tests.row_count($$update public.students set grade = 9, school_name = 'Okul' where profile_id = tests.id('student_a') returning 1$$),
  1::bigint,
  'koç X öğrencisi A''nın izinli kolonlarını günceller'
);
select is(
  tests.row_count($$update public.students set grade = 9 where profile_id = tests.id('student_b') returning 1$$),
  0::bigint,
  'koç X öğrenci B''yi güncelleyemez'
);
select throws_ok(
  $$update public.students set organization_id = tests.id('org_b') where profile_id = tests.id('student_a')$$,
  '42501', null,
  'koç X öğrencinin organization_id kolonunu değiştiremez (kolon yetkisi yok)'
);
select throws_ok(
  $$update public.students set coach_id = tests.id('coach_y') where profile_id = tests.id('student_a')$$,
  '42501', null,
  'koç X öğrencinin coach_id kolonunu değiştiremez (kolon yetkisi yok)'
);
select throws_ok(
  $$delete from public.students where profile_id = tests.id('student_a')$$,
  '42501', null,
  'koç öğrenci silemez (DELETE yetkisi yok)'
);

-- Başka kurumun koçu (Z) öğrenci A'yı hiçbir şekilde göremez.
select tests.authenticate_as('coach_z');
select is(
  (select count(*) from public.students where profile_id = tests.id('student_a')), 0::bigint,
  'koç Z (kurum B) öğrenci A''yı göremez'
);
select is(
  tests.row_count($$update public.students set grade = 9 where profile_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'koç Z öğrenci A''yı güncelleyemez'
);
select is(
  (select count(*) from public.students), 1::bigint,
  'koç Z sadece kendi öğrencisini (Z) görür'
);

-- 4. Veli sadece kendi çocuğunu görür (ayrıntı yetkisinden bağımsız), güncelleyemez.
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from public.students), 1::bigint,
  'veli P1 sadece çocuğunu görür'
);
select is(
  (select count(*) from public.students where profile_id = tests.id('student_b')), 0::bigint,
  'veli P1 başka çocuğu (B) göremez'
);
select is(
  tests.row_count($$update public.students set grade = 9 where profile_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'veli çocuğunun satırını güncelleyemez'
);
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.students where profile_id = tests.id('student_a')), 1::bigint,
  'veli P2 (can_view_details=false) çocuğunun temel satırını görür'
);

-- Owner kurumundaki tüm öğrencileri görür ve günceller; ekleyemez, silemez.
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.students), 3::bigint,
  'owner A kurumundaki 3 öğrenciyi görür'
);
select is(
  tests.row_count($$update public.students set status = 'paused' where profile_id = tests.id('student_b') returning 1$$),
  1::bigint,
  'owner A herhangi bir öğrencisini günceller'
);
select throws_ok(
  $$insert into public.students (profile_id, organization_id, coach_id, season)
    values (tests.id('parent_p1'), tests.id('org_a'), tests.id('coach_x'), '2026-2027')$$,
  '42501', null,
  'owner students tablosuna doğrudan ekleyemez (INSERT politikası yok)'
);
select throws_ok(
  $$delete from public.students where profile_id = tests.id('student_a')$$,
  '42501', null,
  'owner students tablosundan doğrudan silemez (DELETE yetkisi yok)'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.students$$,
  '42501', null,
  'anon students tablosunu okuyamaz'
);

select * from finish();
rollback;
