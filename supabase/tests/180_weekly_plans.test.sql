-- weekly_plans ve plan_items RLS (08 §1.4, 03 §5.4): koç S I U D; öğrenci ve veli yalnızca
-- yayınlanmış planı okur, doğrudan yazamaz (UPDATE 0 satır); anon yok. Ek: hafta pazartesi
-- kısıtı, link URL kısıtı, question_logs.plan_item_id bağı ve görünümler.
begin;
select plan(42);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Koç X öğrencisi A için taslak plan ve görevler açar.
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.weekly_plans (id, student_id, week_start, created_by)
    values (tests.id('plan_a'), tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'))$$,
  'koç X öğrencisi A için taslak plan açar'
);
select throws_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by)
    values (tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 1, tests.id('coach_x'))$$,
  '23514', null,
  'hafta başlangıcı pazartesi olmalı'
);
select throws_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by)
    values (tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'))$$,
  '23505', null,
  'öğrenci + hafta tekil'
);
select throws_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by)
    values (tests.id('student_b'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'))$$,
  '42501', null,
  'koç X başka koçun öğrencisi B için plan açamaz'
);
select lives_ok(
  $$insert into public.plan_items (id, plan_id, day_of_week, sort_order, kind, title, subject_id, topic_id, target_value, target_unit, estimated_minutes)
    values
      (tests.id('item_a1'), tests.id('plan_a'), 1, 0, 'questions', 'Konu 1 · 20 soru', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 'questions', 30),
      (tests.id('item_a2'), tests.id('plan_a'), null, 0, 'custom', 'Serbest okuma', null, null, null, null, 20)$$,
  'koç X görev ekler (günlü ve "bu hafta içinde")'
);
select throws_ok(
  $$insert into public.plan_items (plan_id, kind, title, url, estimated_minutes)
    values (tests.id('plan_a'), 'link', 'Video', 'ftp://x', 10)$$,
  '23514', null,
  'link türünde URL http(s) olmalı'
);
select is(
  (select items_total from public.v_plan_completion where plan_id = tests.id('plan_a')), 2,
  'v_plan_completion toplam görev'
);
select is(
  (select percent from public.v_plan_completion where plan_id = tests.id('plan_a')), 0,
  'hiç tamamlanmamışken yüzde 0 (görev varsa null değil)'
);

-- 2. Öğrenci A taslağı göremez; yayınlanınca görür ama yazamaz.
select tests.authenticate_as('student_a');
select is((select count(*) from public.weekly_plans), 0::bigint, 'öğrenci A taslak planı göremez');
select is((select count(*) from public.plan_items), 0::bigint, 'öğrenci A taslağın görevlerini göremez');

select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$update public.weekly_plans set status = 'published', published_at = now()
    where id = tests.id('plan_a') returning 1$$),
  1::bigint,
  'koç X planı yayınlar'
);

select tests.authenticate_as('student_a');
select is((select count(*) from public.weekly_plans), 1::bigint, 'öğrenci A yayınlanan planı görür');
select is((select count(*) from public.plan_items), 2::bigint, 'öğrenci A görevleri görür');
select is(
  tests.row_count($$update public.plan_items set completed_at = now() where id = tests.id('item_a1') returning 1$$),
  0::bigint,
  'öğrenci A görevi doğrudan güncelleyemez (0 satır; RPC ile)'
);
select is(
  tests.row_count($$update public.weekly_plans set student_reflection = 'x' where id = tests.id('plan_a') returning 1$$),
  0::bigint,
  'öğrenci A planı doğrudan güncelleyemez (0 satır; RPC ile)'
);
select throws_ok(
  $$insert into public.plan_items (plan_id, kind, title, estimated_minutes)
    values (tests.id('plan_a'), 'custom', 'Kendi görevim', 10)$$,
  '42501', null,
  'öğrenci görev ekleyemez'
);
select is(
  tests.row_count($$delete from public.plan_items where id = tests.id('item_a2') returning 1$$),
  0::bigint,
  'öğrenci görev silemez'
);
-- Soru kaydı plan_item_id ile bağlanabilir (öğrenci kendi kaydı).
select lives_ok(
  $$insert into public.question_logs (id, student_id, subject_id, topic_id, plan_item_id, source, total_count, correct_count, wrong_count, blank_count)
    values (tests.id('log_plan_a'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), tests.id('item_a1'), 'plan', 20, 15, 3, 2)$$,
  'soru kaydı plan görevine bağlanır'
);

-- 3. Öğrenci B (başka koç) hiçbir şey göremez.
select tests.authenticate_as('student_b');
select is((select count(*) from public.weekly_plans), 0::bigint, 'öğrenci B öğrenci A''nın planını göremez');
select is((select count(*) from public.plan_items), 0::bigint, 'öğrenci B görevleri göremez');

-- Koç Y göremez, owner görür ve yazar.
select tests.authenticate_as('coach_y');
select is((select count(*) from public.weekly_plans), 0::bigint, 'koç Y öğrenci A''nın planını göremez');
select tests.authenticate_as('owner_a');
select is((select count(*) from public.plan_items), 2::bigint, 'owner A görevleri görür');
select is(
  tests.row_count($$update public.plan_items set title = 'Konu 1 · 25 soru' where id = tests.id('item_a1') returning 1$$),
  1::bigint,
  'owner A görevi düzenler'
);

-- Görev silinince soru kaydı kalır, bağ kopar.
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$delete from public.plan_items where id = tests.id('item_a2') returning 1$$),
  1::bigint,
  'koç görevi siler'
);
select is(
  (select plan_percent_week from public.v_coach_student_overview where student_id = tests.id('student_a')),
  0,
  'v_coach_student_overview bu haftanın plan uyumu (1 görev, 0 tamamlanan → 0)'
);

-- 4. Veli yalnızca yayınlananı görür, yazamaz.
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.weekly_plans), 1::bigint, 'veli P2 çocuğunun yayınlanan planını görür');
select throws_ok(
  $$insert into public.plan_items (plan_id, kind, title, estimated_minutes)
    values (tests.id('plan_a'), 'custom', 'X', 10)$$,
  '42501', null,
  'veli görev ekleyemez'
);
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.weekly_plans (id, student_id, week_start, created_by)
    values (tests.id('plan_a_next'), tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7, tests.id('coach_x'))$$,
  'koç X gelecek hafta için taslak açar'
);
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.weekly_plans), 1::bigint, 'veli taslağı görmez');

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.weekly_plans$$, '42501', null, 'anon weekly_plans okuyamaz');
select throws_ok($$select count(*) from public.v_plan_completion$$, '42501', null, 'anon görünümü okuyamaz');

-- 6. Bugüne kadar uyum (faz4e_setup_facts_to_date): plan_a'da item_a1 pazartesi (her gün için
-- bugün ve öncesi) tamamlanmamış; gün atanmamış görev yalnızca tamamlandıysa sayılır.
select tests.authenticate_as('coach_x');
select is(
  (select to_date_total from public.v_plan_completion where plan_id = tests.id('plan_a')), 1,
  'bugüne kadar: pazartesi görevi sayılır'
);
select is(
  (select to_date_percent from public.v_plan_completion where plan_id = tests.id('plan_a')), 0,
  'bugüne kadar yüzde 0 (görev varsa null değil)'
);
select is(
  (select plan_to_date_percent_week from public.v_coach_student_overview where student_id = tests.id('student_a')),
  0,
  'v_coach_student_overview bugüne kadar uyumu'
);
select lives_ok(
  $$insert into public.plan_items (plan_id, day_of_week, kind, title, estimated_minutes, completed_at)
    values (tests.id('plan_a'), null, 'custom', 'Hafta içi bitti', 20, now())$$,
  'tamamlanmış "bu hafta içinde" görevi'
);
select is(
  (select to_date_total from public.v_plan_completion where plan_id = tests.id('plan_a')), 2,
  'tamamlanmış gün atanmamış görev bugüne kadar toplamına girer'
);
select is(
  (select to_date_completed from public.v_plan_completion where plan_id = tests.id('plan_a')), 1,
  'bugüne kadar tamamlanan 1 → %50'
);
-- Geçmiş hafta: iki değer eşit (tamamlanmamış gün atanmamış görev de sayılır).
select lives_ok(
  $$insert into public.weekly_plans (id, student_id, week_start, created_by, status)
    values (tests.id('plan_a_prev'), tests.id('student_a'),
      (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date - 7, tests.id('coach_x'), 'published')$$,
  'geçmiş hafta planı'
);
select lives_ok(
  $$insert into public.plan_items (plan_id, day_of_week, kind, title, estimated_minutes)
    values
      (tests.id('plan_a_prev'), 7, 'custom', 'Pazar', 20),
      (tests.id('plan_a_prev'), null, 'custom', 'Hafta içi', 20)$$,
  'geçmiş hafta görevleri'
);
select is(
  (select to_date_total from public.v_plan_completion where plan_id = tests.id('plan_a_prev')),
  (select items_total from public.v_plan_completion where plan_id = tests.id('plan_a_prev')),
  'geçmiş haftada bugüne kadar = hafta geneli'
);
-- Gelecek hafta: henüz hiçbir gün gelmedi → bugüne kadar yüzde null.
select lives_ok(
  $$insert into public.plan_items (plan_id, day_of_week, kind, title, estimated_minutes)
    values (tests.id('plan_a_next'), 1, 'custom', 'Pazartesi', 20)$$,
  'gelecek hafta görevi'
);
select is(
  (select to_date_percent from public.v_plan_completion where plan_id = tests.id('plan_a_next')), null,
  'gelecek haftada bugüne kadar yüzde null (0 görev)'
);

select * from finish();
rollback;
