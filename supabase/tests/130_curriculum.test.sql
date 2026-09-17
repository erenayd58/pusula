-- curriculum_templates / subjects / topics RLS (03 §5.3 / 5.4) ve move_topic.
-- Okuma: sistem şablonu + kendi kurumu. Yazma: koç/owner, aynı koşul.
begin;
select plan(23);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Öğrenci kendi kurumunun ve sistem şablonunu görür, düzenleyemez.
select tests.authenticate_as('student_a');
-- Migration'daki LGS 2027 sistem şablonu da görünür; sayımlar test şablonlarıyla sınırlı.
select results_eq(
  $$select id from public.curriculum_templates where name like 'Şablon %' order by name$$,
  $$values (tests.id('tpl_org_a')), (tests.id('tpl_system'))$$,
  'öğrenci A sistem şablonunu ve kurumunun şablonunu görür'
);
select is(
  (select count(*) from public.topics where subject_id in (tests.id('subj_system'), tests.id('subj_org_a'), tests.id('subj_org_b'))), 4::bigint,
  'öğrenci A görebildiği şablonların konularını görür (2 × 2)'
);
select throws_ok(
  $$insert into public.topics (subject_id, name, sort_order) values (tests.id('subj_org_a'), 'Yeni', 9)$$,
  '42501', null,
  'öğrenci konu ekleyemez'
);
select is(
  tests.row_count($$update public.topics set name = 'X' where id = tests.id('topic_org_a_1') returning 1$$),
  0::bigint,
  'öğrenci konu adını değiştiremez'
);
select throws_ok(
  $$select public.move_topic(tests.id('topic_org_a_1'), 'down')$$,
  '42501', null,
  'öğrenci move_topic çağıramaz'
);

-- 2. Başka kurumun şablonu görünmez.
select is(
  (select count(*) from public.subjects where template_id = tests.id('tpl_org_b')), 0::bigint,
  'öğrenci A kurum B''nin dersini göremez'
);

-- 3. Koç: sistem ve kendi kurumu düzenlenir; başka kurum görünmez ve yazılamaz.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.curriculum_templates where name like 'Şablon %'), 2::bigint,
  'koç X sistem + kurum A şablonlarını görür'
);
select lives_ok(
  $$insert into public.topics (subject_id, name, sort_order) values (tests.id('subj_org_a'), 'Yeni konu', 3)$$,
  'koç X kurum şablonuna konu ekler'
);
select lives_ok(
  $$insert into public.topics (subject_id, name, sort_order) values (tests.id('subj_system'), 'Yeni konu', 3)$$,
  'koç X sistem şablonuna konu ekler (02 karar #28)'
);
select throws_ok(
  $$insert into public.topics (subject_id, name, sort_order) values (tests.id('subj_org_b'), 'Yeni', 9)$$,
  '42501', null,
  'koç X kurum B şablonuna konu ekleyemez'
);
select throws_ok(
  $$insert into public.curriculum_templates (organization_id, name, exam_type, grade, season, scoring)
    values (tests.id('org_b'), 'Sızma', 'LGS', 8, '2026-2027', '{}'::jsonb)$$,
  '42501', null,
  'koç X başka kuruma şablon oluşturamaz'
);
select is(
  tests.row_count($$update public.topics set name = 'Yeni ad' where id = tests.id('topic_org_a_1') returning 1$$),
  1::bigint,
  'koç X konu adını değiştirir'
);
select is(
  tests.row_count($$update public.topics set name = 'X' where id = tests.id('topic_org_b_1') returning 1$$),
  0::bigint,
  'koç X kurum B konusunu değiştiremez'
);

-- move_topic: aşağı → sıra değişir; eşit sort_order'da deterministik; uçta no-op.
select lives_ok($$select public.move_topic(tests.id('topic_org_a_1'), 'down')$$, 'koç X konuyu aşağı taşır');
select results_eq(
  $$select name from public.topics where subject_id = tests.id('subj_org_a') order by sort_order$$,
  $$values ('Konu 2'::text), ('Yeni ad'::text), ('Yeni konu'::text)$$,
  'sıra: Konu 2, Yeni ad, Yeni konu'
);
update public.topics set sort_order = 1 where subject_id = tests.id('subj_org_a');  -- hepsi eşit
-- Deterministik sıra: (sort_order, created_at, id). Beklenen konum bu sıradan hesaplanır.
create temporary table expected_rank on commit drop as
  select id, row_number() over (order by sort_order, created_at, id)::int as rn
  from public.topics where subject_id = tests.id('subj_org_a');
select lives_ok($$select public.move_topic(tests.id('topic_org_a_2'), 'up')$$, 'eşit sort_order ile yukarı taşınır');
select results_eq(
  $$select sort_order::int from public.topics where subject_id = tests.id('subj_org_a') order by sort_order$$,
  $$values (1), (2), (3)$$,
  'kardeşler 1..n yeniden numaralanır'
);
select is(
  (select sort_order::int from public.topics where id = tests.id('topic_org_a_2')),
  (select greatest(rn - 1, 1) from expected_rank where id = tests.id('topic_org_a_2')),
  'konu deterministik sıradaki yerinden bir yukarı çıkar'
);
create temporary table last_topic on commit drop as
  select id from public.topics where subject_id = tests.id('subj_org_a') and sort_order = 3;
select lives_ok(
  $$select public.move_topic((select id from last_topic), 'down')$$,
  'uçtaki konu için no-op'
);
select is(
  (select sort_order::int from public.topics where id = (select id from last_topic)), 3,
  'uçtaki konu yerinde kalır'
);

-- 4. Veli sistem + kurum şablonunu okur, yazamaz.
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.curriculum_templates where name like 'Şablon %'), 2::bigint,
  'veli P2 sistem + kurum A şablonlarını görür'
);
select throws_ok(
  $$insert into public.topics (subject_id, name, sort_order) values (tests.id('subj_org_a'), 'Yeni', 9)$$,
  '42501', null,
  'veli konu ekleyemez'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.topics$$,
  '42501', null,
  'anon topics tablosunu okuyamaz'
);

select * from finish();
rollback;
