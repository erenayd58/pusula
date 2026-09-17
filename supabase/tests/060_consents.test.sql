-- consents RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
-- Okuma: öğrenci, koç/owner, veli (kendi çocuğu). Ekleme: veli kendi adına
-- (given_by = kendisi, recorded_by boş) ya da koç/owner kayıt eden olarak
-- (recorded_by = kendisi). Güncelleme/silme yok.
begin;
select plan(20);
select tests.seed_fixture();

-- Hazırlık (postgres): A için veli onayı, B için koçun işlediği kâğıt onay.
insert into public.consents (id, student_id, given_by, recorded_by, type, document_version) values
  (tests.id('con_a'), tests.id('student_a'), tests.id('parent_p1'), null,               'privacy_notice', 'aydinlatma-v1'),
  (tests.id('con_b'), tests.id('student_b'), null,                  tests.id('coach_y'), 'privacy_notice', 'aydinlatma-v1');

-- 1. Öğrenci kendi onaylarını görür.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.consents), 1::bigint,
  'öğrenci A sadece kendi onayını görür'
);

-- 2. Öğrenci B'nin onayını göremez, ekleyemez.
select is(
  (select count(*) from public.consents where id = tests.id('con_b')), 0::bigint,
  'öğrenci A öğrenci B''nin onayını göremez'
);
select throws_ok(
  $$insert into public.consents (student_id, given_by, type, document_version)
    values (tests.id('student_a'), tests.id('student_a'), 'photo_upload', 'v1')$$,
  '42501', null,
  'öğrenci onay ekleyemez'
);

-- 3. Koç kendi öğrencisinin onayını görür ve kayıt eden olarak ekler.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.consents where id = tests.id('con_a')), 1::bigint,
  'koç X öğrencisi A''nın onayını görür'
);
select is(
  (select count(*) from public.consents where id = tests.id('con_b')), 0::bigint,
  'koç X başka koçun öğrencisinin onayını göremez'
);
select lives_ok(
  $$insert into public.consents (student_id, recorded_by, type, document_version)
    values (tests.id('student_a'), tests.id('coach_x'), 'explicit_consent', 'acik-riza-v1')$$,
  'koç X öğrencisi için kâğıt onayı kayıt eden olarak işler'
);
select throws_ok(
  $$insert into public.consents (student_id, given_by, recorded_by, type, document_version)
    values (tests.id('student_a'), tests.id('parent_p1'), null, 'explicit_consent', 'acik-riza-v1')$$,
  '42501', null,
  'koç given_by''ı veli yapıp recorded_by''ı boş bırakamaz'
);
select throws_ok(
  $$insert into public.consents (student_id, recorded_by, type, document_version)
    values (tests.id('student_b'), tests.id('coach_x'), 'explicit_consent', 'acik-riza-v1')$$,
  '42501', null,
  'koç X başka koçun öğrencisi için onay işleyemez'
);
select throws_ok(
  $$insert into public.consents (student_id, recorded_by, type, document_version)
    values (tests.id('student_a'), tests.id('coach_y'), 'explicit_consent', 'acik-riza-v1')$$,
  '42501', null,
  'koç recorded_by''ı başka koç yapamaz'
);
select throws_ok(
  $$update public.consents set revoked_at = now() where id = tests.id('con_a')$$,
  '42501', null,
  'koç onayı güncelleyemez (UPDATE yetkisi yok)'
);
select throws_ok(
  $$delete from public.consents where id = tests.id('con_a')$$,
  '42501', null,
  'koç onay silemez (DELETE yetkisi yok)'
);

-- 4. Veli kendi çocuğunun onayını görür ve kendi adına ekler.
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from public.consents where student_id = tests.id('student_a')), 2::bigint,
  'veli P1 çocuğunun onaylarını görür'
);
select is(
  (select count(*) from public.consents where id = tests.id('con_b')), 0::bigint,
  'veli P1 başka çocuğun onayını göremez'
);
select lives_ok(
  $$insert into public.consents (student_id, given_by, type, document_version)
    values (tests.id('student_a'), tests.id('parent_p1'), 'photo_upload', 'foto-v1')$$,
  'veli P1 çocuğu için kendi adına onay verir'
);
select throws_ok(
  $$insert into public.consents (student_id, given_by, recorded_by, type, document_version)
    values (tests.id('student_a'), tests.id('parent_p1'), tests.id('coach_x'), 'photo_upload', 'foto-v1')$$,
  '42501', null,
  'veli recorded_by''ı koç olarak yazamaz'
);
select throws_ok(
  $$insert into public.consents (student_id, given_by, type, document_version)
    values (tests.id('student_a'), tests.id('parent_p2'), 'photo_upload', 'foto-v1')$$,
  '42501', null,
  'veli başka velinin adına (given_by) onay yazamaz'
);
select throws_ok(
  $$insert into public.consents (student_id, given_by, type, document_version)
    values (tests.id('student_b'), tests.id('parent_p1'), 'photo_upload', 'foto-v1')$$,
  '42501', null,
  'veli başka çocuk için onay veremez'
);

-- Owner kurumdaki tüm onayları görür; kayıt eden olarak ekleyebilir (is_coach_of owner''ı kapsar).
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.consents), 4::bigint,
  'owner A kurumdaki tüm onayları görür'
);
select lives_ok(
  $$insert into public.consents (student_id, recorded_by, type, document_version)
    values (tests.id('student_b'), tests.id('owner_a'), 'explicit_consent', 'acik-riza-v1')$$,
  'owner kâğıt onayı kayıt eden olarak işler'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.consents$$,
  '42501', null,
  'anon consents tablosunu okuyamaz'
);

select * from finish();
rollback;
