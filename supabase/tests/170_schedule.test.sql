-- busy_slots ve schedule_exceptions RLS (08 §1.3, 03 §5.4): öğrenci ve koç S I U D; veli S;
-- anon yok. Ek: saat kısıtları (bitiş > başlangıç, istisnada saat çifti birlikte boş/dolu),
-- created_by oturum sahibi olmalı; kurum ayarı varsayılanları yazılmış.
begin;
select plan(31);
select tests.seed_fixture();

-- 0. Kurum ayarı varsayılanları (faz4a_org_settings): mevcut kurumlara yazıldı.
select tests.authenticate_as('owner_a');
select is(
  (select settings #>> '{schedule,wake_start}' from public.organizations where id = tests.id('org_a')),
  '08:00',
  'kurum ayarında uyanık aralık varsayılanı var'
);
select is(
  (select (settings #>> '{alerts,knowledge_gap,min_questions}')::int from public.organizations where id = tests.id('org_a')),
  40,
  'kurum ayarında uyarı eşiği varsayılanı var'
);

-- 1. Öğrenci A kendi meşguliyetini ekler, okur, günceller, siler.
select tests.authenticate_as('student_a');
select lives_ok(
  $$insert into public.busy_slots (id, student_id, day_of_week, starts_at, ends_at, kind, note, created_by)
    values (tests.id('slot_a1'), tests.id('student_a'), 1, '08:30', '15:00', 'school', 'Okul', tests.id('student_a'))$$,
  'öğrenci A kendi meşguliyetini ekler'
);
select is((select count(*) from public.busy_slots), 1::bigint, 'öğrenci A kendi meşguliyetini görür');
select is(
  tests.row_count($$update public.busy_slots set ends_at = '15:30' where id = tests.id('slot_a1') returning 1$$),
  1::bigint,
  'öğrenci A kendi meşguliyetini günceller'
);
select lives_ok(
  $$insert into public.schedule_exceptions (id, student_id, on_date, title, created_by)
    values (tests.id('exc_a1'), tests.id('student_a'), date '2026-10-05', 'Yazılı: Fen', tests.id('student_a'))$$,
  'öğrenci A tüm gün istisna ekler'
);
select lives_ok(
  $$insert into public.schedule_exceptions (id, student_id, on_date, starts_at, ends_at, title, created_by)
    values (tests.id('exc_a2'), tests.id('student_a'), date '2026-10-06', '13:00', '15:00', 'Okul gezisi', tests.id('student_a'))$$,
  'öğrenci A saatli istisna ekler'
);
select is(
  tests.row_count($$delete from public.schedule_exceptions where id = tests.id('exc_a2') returning 1$$),
  1::bigint,
  'öğrenci A kendi istisnasını siler'
);

-- Kısıtlar.
select throws_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
    values (tests.id('student_a'), 2, '15:00', '15:00', tests.id('student_a'))$$,
  '23514', null,
  'bitiş başlangıçtan sonra olmalı (meşguliyet)'
);
select throws_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
    values (tests.id('student_a'), 8, '09:00', '10:00', tests.id('student_a'))$$,
  '23514', null,
  'gün 1-7 arası olmalı'
);
select throws_ok(
  $$insert into public.schedule_exceptions (student_id, on_date, starts_at, title, created_by)
    values (tests.id('student_a'), date '2026-10-07', '13:00', 'Yarım', tests.id('student_a'))$$,
  '23514', null,
  'istisnada saat çifti birlikte boş ya da dolu olmalı'
);
select throws_ok(
  $$insert into public.schedule_exceptions (student_id, on_date, starts_at, ends_at, title, created_by)
    values (tests.id('student_a'), date '2026-10-07', '15:00', '13:00', 'Ters', tests.id('student_a'))$$,
  '23514', null,
  'istisnada bitiş başlangıçtan sonra olmalı'
);
select throws_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
    values (tests.id('student_a'), 2, '09:00', '10:00', tests.id('coach_x'))$$,
  '42501', null,
  'created_by oturum sahibi olmalı'
);

-- 2. Öğrenci B'nin satırını göremez ve B adına ekleyemez.
select throws_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
    values (tests.id('student_b'), 1, '09:00', '10:00', tests.id('student_a'))$$,
  '42501', null,
  'öğrenci A öğrenci B adına meşguliyet ekleyemez'
);
select throws_ok(
  $$insert into public.schedule_exceptions (student_id, on_date, title, created_by)
    values (tests.id('student_b'), date '2026-10-05', 'X', tests.id('student_a'))$$,
  '42501', null,
  'öğrenci A öğrenci B adına istisna ekleyemez'
);
select tests.authenticate_as('student_b');
select is((select count(*) from public.busy_slots), 0::bigint, 'öğrenci B öğrenci A''nın meşguliyetini göremez');
select is((select count(*) from public.schedule_exceptions), 0::bigint, 'öğrenci B öğrenci A''nın istisnasını göremez');

-- 3. Koç X kendi öğrencisini görür ve düzenler; Y göremez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.busy_slots where student_id = tests.id('student_a')), 1::bigint,
  'koç X öğrencisi A''nın meşguliyetini görür'
);
select is(
  tests.row_count($$update public.busy_slots set kind = 'tutoring_center' where id = tests.id('slot_a1') returning 1$$),
  1::bigint,
  'koç X öğrencisinin meşguliyetini düzenler'
);
select lives_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, kind, created_by)
    values (tests.id('student_c'), 3, '17:00', '19:00', 'course', tests.id('coach_x'))$$,
  'koç X öğrencisi C için meşguliyet ekler'
);
select lives_ok(
  $$insert into public.schedule_exceptions (student_id, on_date, title, created_by)
    values (tests.id('student_c'), date '2026-10-08', 'Yazılı: Türkçe', tests.id('coach_x'))$$,
  'koç X öğrencisi C için istisna ekler'
);
select throws_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
    values (tests.id('student_b'), 1, '09:00', '10:00', tests.id('coach_x'))$$,
  '42501', null,
  'koç X başka koçun öğrencisi B için meşguliyet ekleyemez'
);
select tests.authenticate_as('coach_y');
select is((select count(*) from public.busy_slots), 0::bigint, 'koç Y öğrenci A/C meşguliyetlerini göremez');
select is((select count(*) from public.schedule_exceptions), 0::bigint, 'koç Y öğrenci A/C istisnalarını göremez');

-- Owner kurumundaki her öğrenciyi görür ve yazar.
select tests.authenticate_as('owner_a');
select is((select count(*) from public.busy_slots), 2::bigint, 'owner A kurumundaki tüm meşguliyetleri görür');
select is(
  tests.row_count($$delete from public.busy_slots where student_id = tests.id('student_c') returning 1$$),
  1::bigint,
  'owner A meşguliyet siler'
);

-- 4. Veli çocuğunu görür, yazamaz.
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.busy_slots), 1::bigint, 'veli P2 çocuğunun meşguliyetini görür');
select is((select count(*) from public.schedule_exceptions), 1::bigint, 'veli P2 çocuğunun istisnasını görür');
select throws_ok(
  $$insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
    values (tests.id('student_a'), 1, '09:00', '10:00', tests.id('parent_p2'))$$,
  '42501', null,
  'veli meşguliyet ekleyemez'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.busy_slots$$, '42501', null, 'anon busy_slots okuyamaz');
select throws_ok($$select count(*) from public.schedule_exceptions$$, '42501', null, 'anon schedule_exceptions okuyamaz');

select * from finish();
rollback;
