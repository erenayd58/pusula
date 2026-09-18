-- Plan RPC'leri (08 §1.4): complete (log'lu/log'suz, idempotent), uncomplete (bağ kopar, kayıt
-- kalır), postpone (bir kez, hedef gün kuralı, null gün hatası), note, reflection (hafta
-- kapanınca week_closed), move (sıralama, yetki), copy (yetki, only_incomplete, ekleme).
begin;
select plan(34);
select tests.seed_fixture();
select tests.seed_templates();

-- Hazırlık: koç X, öğrenci A için gelecek haftaya (ertelemede "bugün" etkisi olmasın) yayınlı plan.
select tests.authenticate_as('coach_x');
insert into public.weekly_plans (id, student_id, week_start, created_by, status, published_at)
values (
  tests.id('plan_a'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7,
  tests.id('coach_x'), 'published', now()
);
insert into public.plan_items (id, plan_id, day_of_week, sort_order, kind, title, subject_id, topic_id, target_value, target_unit, estimated_minutes)
values
  (tests.id('item_q'),  tests.id('plan_a'), 2, 0, 'questions',   'Konu 1 · 20 soru', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 'questions', 30),
  (tests.id('item_t'),  tests.id('plan_a'), 2, 1, 'topic_study', 'Konu 2',           tests.id('subj_org_a'), tests.id('topic_org_a_2'), null, null, 40),
  (tests.id('item_w'),  tests.id('plan_a'), null, 0, 'custom',   'Serbest',          null, null, null, null, 20),
  (tests.id('item_s'),  tests.id('plan_a'), 7, 0, 'review',      'Pazar tekrarı',    tests.id('subj_org_a'), tests.id('topic_org_a_1'), null, null, 20);
-- Taslak plan (öğrenci tamamlayamaz).
insert into public.weekly_plans (id, student_id, week_start, created_by)
values (tests.id('plan_draft'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 14, tests.id('coach_x'));
insert into public.plan_items (id, plan_id, day_of_week, kind, title, estimated_minutes)
values (tests.id('item_draft'), tests.id('plan_draft'), 1, 'custom', 'Taslak görev', 10);

-- complete_plan_item ---------------------------------------------------------------------
select tests.authenticate_as('student_a');
select lives_ok(
  $$select public.complete_plan_item(tests.id('item_t'))$$,
  'öğrenci görevi log''suz tamamlar'
);
select isnt(
  (select completed_at from public.plan_items where id = tests.id('item_t')), null,
  'completed_at atandı'
);
select is(
  (select (public.complete_plan_item(tests.id('item_q'), 'zor geldi',
    '{"correct": 15, "wrong": 3, "blank": 2, "duration_minutes": 25}'::jsonb) ->> 'log_id') is not null),
  true,
  'soru görevi log ile tamamlanır ve log_id döner'
);
select is(
  (select count(*) from public.question_logs where plan_item_id = tests.id('item_q') and source = 'plan'
     and total_count = 20 and correct_count = 15 and subject_id = tests.id('subj_org_a') and topic_id = tests.id('topic_org_a_1')),
  1::bigint,
  'soru kaydı görevden ders/konu alıp plan_item_id ile bağlandı'
);
select is(
  (select student_note from public.plan_items where id = tests.id('item_q')), 'zor geldi',
  'tamamlama notu yazıldı'
);
select lives_ok(
  $$select public.complete_plan_item(tests.id('item_q'))$$,
  'tekrar tamamlama hata vermez (idempotent)'
);
select is(
  (select count(*) from public.question_logs where plan_item_id = tests.id('item_q')), 1::bigint,
  'ikinci çağrı yeni kayıt açmaz'
);
select throws_ok(
  $$select public.complete_plan_item(tests.id('item_draft'))$$,
  '42501', null,
  'öğrenci taslak plandaki görevi tamamlayamaz'
);
select tests.authenticate_as('student_b');
select throws_ok(
  $$select public.complete_plan_item(tests.id('item_w'))$$,
  '42501', null,
  'başka öğrenci görevi tamamlayamaz'
);
select tests.authenticate_as('parent_p1');
select throws_ok(
  $$select public.complete_plan_item(tests.id('item_w'))$$,
  '42501', null,
  'veli görevi tamamlayamaz'
);

-- uncomplete_plan_item -------------------------------------------------------------------
select tests.authenticate_as('student_a');
select is(
  (public.uncomplete_plan_item(tests.id('item_q')) ->> 'unlinked_logs')::int, 1,
  'geri alma bağı koparır ve sayısını döner'
);
select is(
  (select count(*) from public.question_logs where id in (select id from public.question_logs where student_id = tests.id('student_a'))), 1::bigint,
  'soru kaydı silinmez'
);
select is(
  (select plan_item_id from public.question_logs where student_id = tests.id('student_a') limit 1), null,
  'kaydın plan_item_id bağı boşaldı'
);
select is(
  (select completed_at from public.plan_items where id = tests.id('item_q')), null,
  'görev yeniden tamamlanmamış'
);

-- postpone_plan_item ---------------------------------------------------------------------
select is(
  (public.postpone_plan_item(tests.id('item_q')) ->> 'day_of_week')::int, 3,
  'salı görevi çarşambaya ertelenir (gelecek hafta: bugün etkisi yok)'
);
select is(
  (select postponed_from from public.plan_items where id = tests.id('item_q')), 2::smallint,
  'postponed_from eski günü tutar'
);
select throws_ok(
  $$select public.postpone_plan_item(tests.id('item_q'))$$,
  'P0001', 'cannot_postpone',
  'ikinci erteleme reddedilir'
);
select is(
  (public.postpone_plan_item(tests.id('item_s')) ->> 'day_of_week'), null,
  'pazar görevi "bu hafta içinde"ye (null) taşınır'
);
select throws_ok(
  $$select public.postpone_plan_item(tests.id('item_w'))$$,
  'P0001', 'cannot_postpone',
  'gün atanmamış görev ertelenemez'
);
select throws_ok(
  $$select public.postpone_plan_item(tests.id('item_t'))$$,
  'P0001', 'cannot_postpone',
  'tamamlanmış görev ertelenemez'
);
select is(
  (select postponed_count from public.v_plan_completion where plan_id = tests.id('plan_a')), 2,
  'v_plan_completion ertelenen görev sayısı'
);

-- set_plan_item_note / set_plan_reflection -----------------------------------------------
select lives_ok(
  $$select public.set_plan_item_note(tests.id('item_w'), '  kısa not  ')$$,
  'öğrenci görev notu yazar'
);
select is(
  (select student_note from public.plan_items where id = tests.id('item_w')), 'kısa not',
  'not kırpılarak yazıldı'
);
select lives_ok(
  $$select public.set_plan_reflection(tests.id('plan_a'), 'İyi geçti')$$,
  'öğrenci değerlendirme yazar (hafta kapanmadı)'
);
select tests.authenticate_as('coach_x');
insert into public.weekly_plans (id, student_id, week_start, created_by, status, published_at)
values (tests.id('plan_old'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date - 7, tests.id('coach_x'), 'published', now());
select tests.authenticate_as('student_a');
select throws_ok(
  $$select public.set_plan_reflection(tests.id('plan_old'), 'geç')$$,
  'P0001', 'week_closed',
  'kapanan haftanın değerlendirmesi yazılamaz'
);

-- move_plan_item -------------------------------------------------------------------------
select throws_ok(
  $$select public.move_plan_item(tests.id('item_t'), 1::smallint, 0)$$,
  '42501', null,
  'öğrenci görevi taşıyamaz'
);
select tests.authenticate_as('coach_x');
select lives_ok(
  $$select public.move_plan_item(tests.id('item_w'), 3::smallint, 0)$$,
  'koç "bu hafta içinde" görevini çarşambanın başına taşır'
);
select is(
  (select array_agg(id order by sort_order) from public.plan_items where plan_id = tests.id('plan_a') and day_of_week = 3),
  array[tests.id('item_w'), tests.id('item_q')],
  'çarşamba sırası: taşınan önce, ertelenen sonra (0..n yeniden numaralandı)'
);
select lives_ok(
  $$select public.move_plan_item(tests.id('item_w'), null::smallint, 5)$$,
  'görev "bu hafta içinde"ye geri taşınır (index üst sınıra kırpılır)'
);
select is(
  (select day_of_week from public.plan_items where id = tests.id('item_w')), null,
  'gün boşaldı'
);

-- copy_weekly_plan -----------------------------------------------------------------------
select is(
  (select jsonb_array_length(public.copy_weekly_plan(
     tests.id('plan_a'), array[tests.id('student_c')],
     (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7) -> 'copied')),
  1,
  'koç X planı öğrencisi C''ye kopyalar'
);
select is(
  (select count(*) from public.plan_items i join public.weekly_plans p on p.id = i.plan_id
     where p.student_id = tests.id('student_c') and i.completed_at is null and i.postponed_at is null),
  4::bigint,
  'C''nin taslağında 4 görev, tamamlama/erteleme sıfır'
);
select is(
  (select (public.copy_weekly_plan(
     tests.id('plan_a'), array[tests.id('student_c')],
     (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7, true) -> 'copied' -> 0)
     - 'plan_id' - 'student_id'),
  '{"existing_items": 4, "added_items": 3}'::jsonb,
  'ikinci kopya mevcut plana eklenir; only_incomplete tamamlanmışı atlar'
);
select throws_ok(
  $$select public.copy_weekly_plan(tests.id('plan_a'), array[tests.id('student_b')],
     (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7)$$,
  '42501', null,
  'başka koçun öğrencisine kopyalanamaz'
);

select * from finish();
rollback;
