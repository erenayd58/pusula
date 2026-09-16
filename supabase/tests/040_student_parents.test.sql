-- student_parents RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
-- Öğrenci ve veli kendi bağlantısını okur; koç/owner yönetir. Bağlanan veli aynı
-- kurumda role='parent' bir profil olmalı.
begin;
select plan(19);
select tests.seed_fixture();

-- 1. Öğrenci kendi bağlantılarını görür.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.student_parents), 2::bigint,
  'öğrenci A iki veli bağlantısını görür'
);

-- 2. Öğrenci başka öğrencinin bağlantısını göremez, ekleyemez, silemez.
select is(
  (select count(*) from public.student_parents where student_id = tests.id('student_b')), 0::bigint,
  'öğrenci A öğrenci B''nin bağlantısını göremez'
);
select throws_ok(
  $$insert into public.student_parents (student_id, parent_id, relation)
    values (tests.id('student_a'), tests.id('parent_p3'), 'other')$$,
  '42501', null,
  'öğrenci kendine veli bağlayamaz'
);
select is(
  tests.row_count($$delete from public.student_parents where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci bağlantı silemez'
);

-- 3. Koç kendi öğrencisinin bağlantılarını görür ve yönetir; başka koçunkini görmez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.student_parents where student_id = tests.id('student_a')), 2::bigint,
  'koç X öğrencisi A''nın bağlantılarını görür'
);
select is(
  (select count(*) from public.student_parents where student_id = tests.id('student_b')), 0::bigint,
  'koç X öğrenci B''nin bağlantısını göremez'
);
select lives_ok(
  $$insert into public.student_parents (student_id, parent_id, relation)
    values (tests.id('student_c'), tests.id('parent_p3'), 'guardian')$$,
  'koç X öğrencisi C''ye kurumdaki bir veliyi bağlar'
);
select throws_ok(
  $$insert into public.student_parents (student_id, parent_id, relation)
    values (tests.id('student_b'), tests.id('parent_p1'), 'other')$$,
  '42501', null,
  'koç X başka koçun öğrencisine veli bağlayamaz'
);
select throws_ok(
  $$insert into public.student_parents (student_id, parent_id, relation)
    values (tests.id('student_a'), tests.id('parent_pz'), 'other')$$,
  '42501', null,
  'koç X kurum B''deki bir kullanıcıyı veli olarak bağlayamaz'
);
select throws_ok(
  $$insert into public.student_parents (student_id, parent_id, relation)
    values (tests.id('student_a'), tests.id('student_c'), 'other')$$,
  '42501', null,
  'koç X bir öğrenciyi veli olarak bağlayamaz'
);
select is(
  tests.row_count($$update public.student_parents set can_view_details = true
    where student_id = tests.id('student_a') and parent_id = tests.id('parent_p2') returning 1$$),
  1::bigint,
  'koç X öğrencisinin veli ayrıntı iznini günceller'
);
select is(
  tests.row_count($$delete from public.student_parents
    where student_id = tests.id('student_a') and parent_id = tests.id('parent_p2') returning 1$$),
  1::bigint,
  'koç X öğrencisinin veli bağlantısını siler'
);
select tests.authenticate_as('coach_y');
select is(
  tests.row_count($$delete from public.student_parents where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'koç Y öğrenci A''nın bağlantısını silemez'
);

-- 4. Veli sadece kendi bağlantısını görür; ayrıntı izni olmayan veli de kendi satırını görür.
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from public.student_parents), 1::bigint,
  'veli P1 sadece kendi bağlantısını görür (P2''ninkini değil)'
);
select is(
  (select student_id from public.student_parents), tests.id('student_a'),
  'veli P1''in bağlantısı çocuğu A''dır'
);
select throws_ok(
  $$insert into public.student_parents (student_id, parent_id, relation)
    values (tests.id('student_b'), tests.id('parent_p1'), 'other')$$,
  '42501', null,
  'veli kendini başka çocuğa bağlayamaz'
);
select tests.authenticate_as('parent_p3');
select is(
  (select count(*) from public.student_parents where student_id = tests.id('student_a')), 0::bigint,
  'veli P3 öğrenci A''nın bağlantılarını göremez'
);

-- Owner kurumdaki tüm bağlantıları görür.
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.student_parents), 3::bigint,
  'owner A kurumdaki 3 bağlantıyı görür (kurum B''ninki hariç)'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.student_parents$$,
  '42501', null,
  'anon student_parents tablosunu okuyamaz'
);

select * from finish();
rollback;
