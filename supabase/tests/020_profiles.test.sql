-- profiles RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
-- Görünürlük: kendisi; koç → öğrencileri + velileri; öğrenci → koçu + velileri;
-- veli → çocuğu + çocuğun koçu; owner → kurumundaki herkes.
begin;
select plan(27);
select tests.seed_fixture();

-- 1. Öğrenci kendi profilini görür; koçunu ve velilerini görür.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.profiles where id = tests.id('student_a')), 1::bigint,
  'öğrenci A kendi profilini görür'
);
select is(
  (select count(*) from public.profiles where id = tests.id('coach_x')), 1::bigint,
  'öğrenci A kendi koçu X''i görür'
);
select is(
  (select count(*) from public.profiles where id = tests.id('parent_p1')), 1::bigint,
  'öğrenci A velisi P1''i görür'
);
select is(
  (select count(*) from public.profiles), 4::bigint,
  'öğrenci A toplam 4 profil görür (kendisi, koçu, iki velisi)'
);

-- 2. Öğrenci başka öğrenciyi, başka koçu, başka veliyi göremez; ekleyemez.
select is(
  (select count(*) from public.profiles where id = tests.id('student_b')), 0::bigint,
  'öğrenci A öğrenci B''yi göremez'
);
select is(
  (select count(*) from public.profiles where id = tests.id('coach_y')), 0::bigint,
  'öğrenci A koç Y''yi göremez'
);
select is(
  (select count(*) from public.profiles where id = tests.id('parent_p3')), 0::bigint,
  'öğrenci A veli P3''ü göremez'
);
select throws_ok(
  $$insert into public.profiles (id, organization_id, role, full_name)
    values (gen_random_uuid(), tests.id('org_a'), 'coach', 'Sızma')$$,
  '42501', null,
  'öğrenci profil ekleyemez (INSERT politikası yok)'
);

-- Öğrenci kendi sınırlı kolonlarını günceller; başkasınınkini güncelleyemez; silemez.
select is(
  tests.row_count($$update public.profiles set full_name = 'Öğrenci A (yeni)' where id = tests.id('student_a') returning 1$$),
  1::bigint,
  'öğrenci kendi full_name alanını günceller'
);
select is(
  (select full_name from public.profiles where id = tests.id('student_a')), 'Öğrenci A (yeni)',
  'güncellenen ad okunur'
);
select ok(
  (select updated_at > created_at from public.profiles where id = tests.id('student_a')),
  'set_updated_at tetikleyicisi updated_at alanını ilerletir'
);
select is(
  tests.row_count($$update public.profiles set full_name = 'X' where id = tests.id('coach_x') returning 1$$),
  0::bigint,
  'öğrenci koçunun profilini güncelleyemez'
);
select is(
  tests.row_count($$delete from public.profiles where id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci profil silemez'
);

-- 3. Koç kendi öğrencilerini ve velilerini görür; başka koçun öğrencisini görmez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.profiles where id = tests.id('student_a')), 1::bigint,
  'koç X öğrencisi A''yı görür'
);
select is(
  (select count(*) from public.profiles where id = tests.id('parent_p2')), 1::bigint,
  'koç X öğrencisinin velisi P2''yi görür'
);
select is(
  (select count(*) from public.profiles where id = tests.id('student_b')), 0::bigint,
  'koç X başka koçun öğrencisi B''yi göremez'
);
select is(
  (select count(*) from public.profiles where id = tests.id('parent_p3')), 0::bigint,
  'koç X başka koçun öğrencisinin velisi P3''ü göremez'
);
select is(
  (select count(*) from public.profiles), 5::bigint,
  'koç X toplam 5 profil görür (kendisi, A, C, P1, P2)'
);
select is(
  tests.row_count($$update public.profiles set full_name = 'X' where id = tests.id('student_a') returning 1$$),
  0::bigint,
  'koç öğrencisinin profilini güncelleyemez (sadece kendisi ve owner)'
);

-- 4. Veli kendi çocuğunu ve çocuğun koçunu görür; başka çocuğu görmez.
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from public.profiles where id = tests.id('student_a')), 1::bigint,
  'veli P1 çocuğu A''yı görür'
);
select is(
  (select count(*) from public.profiles where id = tests.id('coach_x')), 1::bigint,
  'veli P1 çocuğunun koçu X''i görür'
);
select is(
  (select count(*) from public.profiles), 3::bigint,
  'veli P1 toplam 3 profil görür (kendisi, çocuğu, koç)'
);
select is(
  (select count(*) from public.profiles where id = tests.id('student_b')), 0::bigint,
  'veli P1 başka çocuğu (B) göremez'
);

-- Owner kurumundaki herkesi görür, kurum dışını görmez; kurumdaki profili günceller.
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.profiles), 9::bigint,
  'owner A kurumundaki 9 profili görür'
);
select is(
  (select count(*) from public.profiles where id = tests.id('student_z')), 0::bigint,
  'owner A başka kurumun öğrencisini göremez'
);
select is(
  tests.row_count($$update public.profiles set phone = '05xx' where id = tests.id('coach_x') returning 1$$),
  1::bigint,
  'owner kurumundaki profilin telefonunu günceller'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501', null,
  'anon profiles tablosunu okuyamaz'
);

select * from finish();
rollback;
