-- weekly_plans ve plan_items RLS (08 Â§1.4, 03 Â§5.4): koÃ§ S I U D; Ã¶ÄŸrenci ve veli yalnÄ±zca
-- yayÄ±nlanmÄ±ÅŸ planÄ± okur, doÄŸrudan yazamaz (UPDATE 0 satÄ±r); anon yok. Ek: hafta pazartesi
-- kÄ±sÄ±tÄ±, link URL kÄ±sÄ±tÄ±, question_logs.plan_item_id baÄŸÄ± ve gÃ¶rÃ¼nÃ¼mler.
begin;
select plan(31);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. KoÃ§ X Ã¶ÄŸrencisi A iÃ§in taslak plan ve gÃ¶revler aÃ§ar.
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.weekly_plans (id, student_id, week_start, created_by)
    values (tests.id('plan_a'), tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'))$$,
  'koÃ§ X Ã¶ÄŸrencisi A iÃ§in taslak plan aÃ§ar'
);
select throws_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by)
    values (tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 1, tests.id('coach_x'))$$,
  '23514', null,
  'hafta baÅŸlangÄ±cÄ± pazartesi olmalÄ±'
);
select throws_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by)
    values (tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'))$$,
  '23505', null,
  'Ã¶ÄŸrenci + hafta tekil'
);
select throws_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by)
    values (tests.id('student_b'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'))$$,
  '42501', null,
  'koÃ§ X baÅŸka koÃ§un Ã¶ÄŸrencisi B iÃ§in plan aÃ§amaz'
);
select lives_ok(
  $$insert into public.plan_items (id, plan_id, day_of_week, sort_order, kind, title, subject_id, topic_id, target_value, target_unit, estimated_minutes)
    values
      (tests.id('item_a1'), tests.id('plan_a'), 1, 0, 'questions', 'Konu 1 Â· 20 soru', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 'questions', 30),
      (tests.id('item_a2'), tests.id('plan_a'), null, 0, 'custom', 'Serbest okuma', null, null, null, null, 20)$$,
  'koÃ§ X gÃ¶rev ekler (gÃ¼nlÃ¼ ve "bu hafta iÃ§inde")'
);
select throws_ok(
  $$insert into public.plan_items (plan_id, kind, title, url, estimated_minutes)
    values (tests.id('plan_a'), 'link', 'Video', 'ftp://x', 10)$$,
  '23514', null,
  'link tÃ¼rÃ¼nde URL http(s) olmalÄ±'
);
select is(
  (select items_total from public.v_plan_completion where plan_id = tests.id('plan_a')), 2,
  'v_plan_completion toplam gÃ¶rev'
);
select is(
  (select percent from public.v_plan_completion where plan_id = tests.id('plan_a')), 0,
  'hiÃ§ tamamlanmamÄ±ÅŸken yÃ¼zde 0 (gÃ¶rev varsa null deÄŸil)'
);

-- 2. Ã–ÄŸrenci A taslaÄŸÄ± gÃ¶remez; yayÄ±nlanÄ±nca gÃ¶rÃ¼r ama yazamaz.
select tests.authenticate_as('student_a');
select is((select count(*) from public.weekly_plans), 0::bigint, 'Ã¶ÄŸrenci A taslak planÄ± gÃ¶remez');
select is((select count(*) from public.plan_items), 0::bigint, 'Ã¶ÄŸrenci A taslaÄŸÄ±n gÃ¶revlerini gÃ¶remez');

select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$update public.weekly_plans set status = 'published', published_at = now()
    where id = tests.id('plan_a') returning 1$$),
  1::bigint,
  'koÃ§ X planÄ± yayÄ±nlar'
);

select tests.authenticate_as('student_a');
select is((select count(*) from public.weekly_plans), 1::bigint, 'Ã¶ÄŸrenci A yayÄ±nlanan planÄ± gÃ¶rÃ¼r');
select is((select count(*) from public.plan_items), 2::bigint, 'Ã¶ÄŸrenci A gÃ¶revleri gÃ¶rÃ¼r');
select is(
  tests.row_count($$update public.plan_items set completed_at = now() where id = tests.id('item_a1') returning 1$$),
  0::bigint,
  'Ã¶ÄŸrenci A gÃ¶revi doÄŸrudan gÃ¼ncelleyemez (0 satÄ±r; RPC ile)'
);
select is(
  tests.row_count($$update public.weekly_plans set student_reflection = 'x' where id = tests.id('plan_a') returning 1$$),
  0::bigint,
  'Ã¶ÄŸrenci A planÄ± doÄŸrudan gÃ¼ncelleyemez (0 satÄ±r; RPC ile)'
);
select throws_ok(
  $$insert into public.plan_items (plan_id, kind, title, estimated_minutes)
    values (tests.id('plan_a'), 'custom', 'Kendi gÃ¶revim', 10)$$,
  '42501', null,
  'Ã¶ÄŸrenci gÃ¶rev ekleyemez'
);
select is(
  tests.row_count($$delete from public.plan_items where id = tests.id('item_a2') returning 1$$),
  0::bigint,
  'Ã¶ÄŸrenci gÃ¶rev silemez'
);
-- Soru kaydÄ± plan_item_id ile baÄŸlanabilir (Ã¶ÄŸrenci kendi kaydÄ±).
select lives_ok(
  $$insert into public.question_logs (id, student_id, subject_id, topic_id, plan_item_id, source, total_count, correct_count, wrong_count, blank_count)
    values (tests.id('log_plan_a'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), tests.id('item_a1'), 'plan', 20, 15, 3, 2)$$,
  'soru kaydÄ± plan gÃ¶revine baÄŸlanÄ±r'
);

-- 3. Ã–ÄŸrenci B (baÅŸka koÃ§) hiÃ§bir ÅŸey gÃ¶remez.
select tests.authenticate_as('student_b');
select is((select count(*) from public.weekly_plans), 0::bigint, 'Ã¶ÄŸrenci B Ã¶ÄŸrenci A''nÄ±n planÄ±nÄ± gÃ¶remez');
select is((select count(*) from public.plan_items), 0::bigint, 'Ã¶ÄŸrenci B gÃ¶revleri gÃ¶remez');

-- KoÃ§ Y gÃ¶remez, owner gÃ¶rÃ¼r ve yazar.
select tests.authenticate_as('coach_y');
select is((select count(*) from public.weekly_plans), 0::bigint, 'koÃ§ Y Ã¶ÄŸrenci A''nÄ±n planÄ±nÄ± gÃ¶remez');
select tests.authenticate_as('owner_a');
select is((select count(*) from public.plan_items), 2::bigint, 'owner A gÃ¶revleri gÃ¶rÃ¼r');
select is(
  tests.row_count($$update public.plan_items set title = 'Konu 1 Â· 25 soru' where id = tests.id('item_a1') returning 1$$),
  1::bigint,
  'owner A gÃ¶revi dÃ¼zenler'
);

-- GÃ¶rev silinince soru kaydÄ± kalÄ±r, baÄŸ kopar.
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$delete from public.plan_items where id = tests.id('item_a2') returning 1$$),
  1::bigint,
  'koÃ§ gÃ¶revi siler'
);
select is(
  (select plan_percent_week from public.v_coach_student_overview where student_id = tests.id('student_a')),
  0,
  'v_coach_student_overview bu haftanÄ±n plan uyumu (1 gÃ¶rev, 0 tamamlanan â†’ 0)'
);

-- 4. Veli yalnÄ±zca yayÄ±nlananÄ± gÃ¶rÃ¼r, yazamaz.
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.weekly_plans), 1::bigint, 'veli P2 Ã§ocuÄŸunun yayÄ±nlanan planÄ±nÄ± gÃ¶rÃ¼r');
select throws_ok(
  $$insert into public.plan_items (plan_id, kind, title, estimated_minutes)
    values (tests.id('plan_a'), 'custom', 'X', 10)$$,
  '42501', null,
  'veli gÃ¶rev ekleyemez'
);
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.weekly_plans (id, student_id, week_start, created_by)
    values (tests.id('plan_a_next'), tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7, tests.id('coach_x'))$$,
  'koÃ§ X gelecek hafta iÃ§in taslak aÃ§ar'
);
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.weekly_plans), 1::bigint, 'veli taslaÄŸÄ± gÃ¶rmez');

-- 5. anon hiÃ§bir ÅŸey gÃ¶remez.
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.weekly_plans$$, '42501', null, 'anon weekly_plans okuyamaz');
select throws_ok($$select count(*) from public.v_plan_completion$$, '42501', null, 'anon gÃ¶rÃ¼nÃ¼mÃ¼ okuyamaz');

select * from finish();
rollback;
