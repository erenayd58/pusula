-- student_topic_progress RLS (03 §5.3 / 5.4). S I U: öğrenci ve koç; veli S; delete yok
-- (konu silinince cascade ile silinir).
begin;
select plan(16);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Öğrenci kendi ilerlemesini yazar ve okur.
select tests.authenticate_as('student_a');
select lives_ok(
  $$insert into public.student_topic_progress (student_id, topic_id, status, confidence)
    values (tests.id('student_a'), tests.id('topic_org_a_1'), 'completed', 4)$$,
  'öğrenci A kendi ilerlemesini ekler'
);
select is(
  tests.row_count($$update public.student_topic_progress set status = 'mastered'
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1') returning 1$$),
  1::bigint,
  'öğrenci A kendi ilerlemesini günceller'
);
select is((select count(*) from public.student_topic_progress), 1::bigint, 'öğrenci A kendi satırını görür');
select throws_ok(
  $$delete from public.student_topic_progress where student_id = tests.id('student_a')$$,
  '42501', null,
  'öğrenci ilerleme satırı silemez (delete yetkisi yok)'
);

-- 2. Öğrenci B'nin satırını göremez ve ekleyemez.
select throws_ok(
  $$insert into public.student_topic_progress (student_id, topic_id, status)
    values (tests.id('student_b'), tests.id('topic_org_a_1'), 'completed')$$,
  '42501', null,
  'öğrenci A öğrenci B adına ilerleme ekleyemez'
);
select tests.authenticate_as('student_b');
select is(
  (select count(*) from public.student_topic_progress), 0::bigint,
  'öğrenci B öğrenci A''nın ilerlemesini göremez'
);

-- 3. Koç X kendi öğrencisini görür ve günceller; Y'nin öğrencisini göremez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.student_topic_progress where student_id = tests.id('student_a')), 1::bigint,
  'koç X öğrencisi A''nın ilerlemesini görür'
);
select is(
  tests.row_count($$update public.student_topic_progress set status = 'needs_review'
    where student_id = tests.id('student_a') returning 1$$),
  1::bigint,
  'koç X öğrencisinin durumunu değiştirir'
);
select lives_ok(
  $$insert into public.student_topic_progress (student_id, topic_id, status)
    values (tests.id('student_c'), tests.id('topic_org_a_2'), 'studying')$$,
  'koç X öğrencisi C için ilerleme ekler'
);
select throws_ok(
  $$insert into public.student_topic_progress (student_id, topic_id, status)
    values (tests.id('student_b'), tests.id('topic_org_a_1'), 'studying')$$,
  '42501', null,
  'koç X başka koçun öğrencisi B için ilerleme ekleyemez'
);
select tests.authenticate_as('coach_y');
select is(
  (select count(*) from public.student_topic_progress), 0::bigint,
  'koç Y öğrenci A/C ilerlemesini göremez'
);

-- 4. Veli sadece çocuğunu görür, yazamaz.
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.student_topic_progress), 1::bigint,
  'veli P2 (can_view_details=false) çocuğunun ilerlemesini görür'
);
select throws_ok(
  $$insert into public.student_topic_progress (student_id, topic_id, status)
    values (tests.id('student_a'), tests.id('topic_org_a_2'), 'studying')$$,
  '42501', null,
  'veli ilerleme ekleyemez'
);

-- Konu silinince ilerleme de silinir (cascade; koç siler).
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$delete from public.topics where id = tests.id('topic_org_a_1') returning 1$$),
  1::bigint,
  'koç X konuyu siler'
);
select is(
  (select count(*) from public.student_topic_progress where topic_id = tests.id('topic_org_a_1')), 0::bigint,
  'silinen konunun ilerleme satırları da silindi'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.student_topic_progress$$,
  '42501', null,
  'anon student_topic_progress tablosunu okuyamaz'
);

select * from finish();
rollback;
