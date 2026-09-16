-- student_modules RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
-- Öğrenci ve veli okur; koç/owner yönetir.
begin;
select plan(16);
select tests.seed_fixture();

-- Hazırlık (postgres).
insert into public.student_modules (student_id, module_id, enabled) values
  (tests.id('student_a'), 'core', true),
  (tests.id('student_b'), 'core', true);

-- 1. Öğrenci kendi modül ayarlarını görür.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.student_modules), 1::bigint,
  'öğrenci A sadece kendi modül satırını görür'
);

-- 2. Öğrenci B'ninkini göremez, ekleyemez, güncelleyemez.
select is(
  (select count(*) from public.student_modules where student_id = tests.id('student_b')), 0::bigint,
  'öğrenci A öğrenci B''nin modül satırını göremez'
);
select throws_ok(
  $$insert into public.student_modules (student_id, module_id, enabled)
    values (tests.id('student_a'), 'goals', true)$$,
  '42501', null,
  'öğrenci modül ayarı ekleyemez'
);
select is(
  tests.row_count($$update public.student_modules set enabled = false where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci modül ayarını güncelleyemez'
);

-- 3. Koç kendi öğrencisinin ayarlarını görür ve yönetir; başka koçunkini görmez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.student_modules where student_id = tests.id('student_a')), 1::bigint,
  'koç X öğrencisi A''nın modül satırını görür'
);
select is(
  (select count(*) from public.student_modules where student_id = tests.id('student_b')), 0::bigint,
  'koç X öğrenci B''nin modül satırını göremez'
);
select lives_ok(
  $$insert into public.student_modules (student_id, module_id, enabled)
    values (tests.id('student_a'), 'goals', true)$$,
  'koç X öğrencisine modül ekler'
);
select throws_ok(
  $$insert into public.student_modules (student_id, module_id, enabled)
    values (tests.id('student_b'), 'goals', true)$$,
  '42501', null,
  'koç X başka koçun öğrencisine modül ekleyemez'
);
select is(
  tests.row_count($$update public.student_modules set enabled = false
    where student_id = tests.id('student_a') and module_id = 'core' returning 1$$),
  1::bigint,
  'koç X öğrencisinin modülünü günceller'
);
select is(
  tests.row_count($$update public.student_modules set enabled = false where student_id = tests.id('student_b') returning 1$$),
  0::bigint,
  'koç X öğrenci B''nin modülünü güncelleyemez'
);
select is(
  tests.row_count($$delete from public.student_modules
    where student_id = tests.id('student_a') and module_id = 'goals' returning 1$$),
  1::bigint,
  'koç X öğrencisinin modülünü siler'
);

-- 4. Veli sadece çocuğunun ayarlarını görür (ayrıntı izninden bağımsız), ekleyemez.
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.student_modules), 1::bigint,
  'veli P2 (can_view_details=false) sadece çocuğunun modül satırını görür'
);
select is(
  (select count(*) from public.student_modules where student_id = tests.id('student_b')), 0::bigint,
  'veli P2 başka çocuğun modül satırını göremez'
);
select throws_ok(
  $$insert into public.student_modules (student_id, module_id, enabled)
    values (tests.id('student_a'), 'goals', true)$$,
  '42501', null,
  'veli modül ayarı ekleyemez'
);

-- Owner kurumdaki tüm ayarları görür.
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.student_modules), 2::bigint,
  'owner A kurumdaki tüm modül satırlarını görür'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.student_modules$$,
  '42501', null,
  'anon student_modules tablosunu okuyamaz'
);

select * from finish();
rollback;
