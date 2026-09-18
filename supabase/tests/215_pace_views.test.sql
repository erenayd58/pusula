-- v_student_pace_facts / v_student_subject_targets / v_coach_student_overview gidişat kolonları
-- (faz5b_pace_views; 09 §1.4). RLS: koç kendi öğrencisi, öğrenci kendisi, veli çocuğu, anon 42501;
-- sayımlar target_starts_on'dan itibaren; overview net takvim konumu (topics_expected / behind / ahead) bugüne göre.
begin;
select plan(15);
select tests.seed_fixture();
select tests.seed_templates();

-- Kurulum: koç X öğrenci A'ya hedef kurar (konu 1 dün, konu 2 gelecek); konu 2 tamamlanmış;
-- soru kayıtları: başlangıçtan önce 30, sonra 20 + 25.
select tests.authenticate_as('coach_x');
select lives_ok(
  $$select public.set_student_targets(
      tests.id('student_a'),
      (now() at time zone 'Europe/Istanbul')::date + 60,
      (now() at time zone 'Europe/Istanbul')::date - 10,
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'questions', 1000)),
      jsonb_build_array(
        jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'target_on', (now() at time zone 'Europe/Istanbul')::date - 1),
        jsonb_build_object('topic_id', tests.id('topic_org_a_2'), 'target_on', (now() at time zone 'Europe/Istanbul')::date + 30)
      )
    )$$,
  'hedef kuruldu'
);
insert into public.student_topic_progress (student_id, topic_id, status, completed_at)
values (tests.id('student_a'), tests.id('topic_org_a_2'), 'completed', now() - interval '2 days');
insert into public.question_logs (student_id, log_date, subject_id, topic_id, total_count, correct_count, wrong_count, blank_count)
values
  (tests.id('student_a'), (now() at time zone 'Europe/Istanbul')::date - 20, tests.id('subj_org_a'), tests.id('topic_org_a_1'), 30, 20, 8, 2),
  (tests.id('student_a'), (now() at time zone 'Europe/Istanbul')::date - 5,  tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 15, 4, 1),
  (tests.id('student_a'), (now() at time zone 'Europe/Istanbul')::date,      tests.id('subj_org_a'), null,                      25, 20, 5, 0);

-- 1. v_student_pace_facts: satır başına durum + hedef + okul tarihi.
select results_eq(
  $$select topic_id, status::text, target_on is not null, completed_at is not null
    from public.v_student_pace_facts where student_id = tests.id('student_a') order by topic_sort_order$$,
  $$values (tests.id('topic_org_a_1'), 'not_started', true, false), (tests.id('topic_org_a_2'), 'completed', true, true)$$,
  'pace facts: konu 1 başlanmadı (hedefli), konu 2 tamamlandı'
);
select is(
  (select count(*) from public.v_student_pace_facts where student_id = tests.id('student_c')),
  2::bigint,
  'hedefsiz öğrencide de her konu bir satır (target_on null)'
);

-- 2. v_student_subject_targets: soru sayımı başlangıçtan itibaren, konu sayıları.
select is(
  (select (questions_target, questions_done, topics_total, topics_done, topics_expected)
    from public.v_student_subject_targets
    where student_id = tests.id('student_a') and subject_id = tests.id('subj_org_a')),
  (1000, 45, 2, 1, 1),
  'ders hedefi: 1000 hedef, 45 gerçekleşen (başlangıç öncesi 30 sayılmaz), 2 konu / 1 bitti / 1 bugüne kadar beklenen'
);
select is(
  (select (questions_target, questions_done) from public.v_student_subject_targets
    where student_id = tests.id('student_c') and subject_id = tests.id('subj_org_a')),
  (null::int, 0),
  'hedefsiz öğrencide questions_target null, gerçekleşen 0'
);

-- 3. v_coach_student_overview: gidişat kolonları.
select is(
  (select (has_targets, topics_total, topics_done, topics_expected, topics_behind, topics_ahead)
    from public.v_coach_student_overview where student_id = tests.id('student_a')),
  (true, 2, 1, 1, 0, 0),
  'overview: hedef var, 2 konu, 1 bitti, 1 beklenen → net uyumlu (konu 1 gecikmiş, konu 2 erken bitmiş)'
);
select is(
  (select (has_targets, topics_expected, topics_behind, topics_ahead)
    from public.v_coach_student_overview where student_id = tests.id('student_c')),
  (false, 0, 0, 0),
  'overview: hedefsiz öğrencide sayımlar 0'
);

-- 4. v_topic_alert_facts.target_on sona eklendi.
select is(
  (select target_on from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2')),
  (now() at time zone 'Europe/Istanbul')::date + 30,
  'v_topic_alert_facts.target_on konu hedefinden gelir'
);

-- 5. RLS: koç Y öğrenci A'yı görmez; öğrenci A kendini; veli P1 çocuğunu; anon 42501.
select tests.authenticate_as('coach_y');
select is((select count(*) from public.v_student_pace_facts where student_id = tests.id('student_a')), 0::bigint, 'koç Y öğrenci A''nın gidişatını göremez');
select is((select count(*) from public.v_student_subject_targets where student_id = tests.id('student_a')), 0::bigint, 'koç Y öğrenci A''nın ders hedefini göremez');
select tests.authenticate_as('student_a');
select is((select count(*) from public.v_student_pace_facts), 2::bigint, 'öğrenci A yalnızca kendi satırlarını görür');
select is(
  (select topics_expected from public.v_student_subject_targets where student_id = tests.id('student_a')),
  1,
  'öğrenci A ders gidişatını okur'
);
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.v_student_pace_facts where student_id = tests.id('student_a')), 2::bigint, 'veli P1 çocuğunun gidişatını görür');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.v_student_pace_facts$$, '42501', null, 'anon pace facts okuyamaz');
select throws_ok($$select count(*) from public.v_student_subject_targets$$, '42501', null, 'anon ders hedeflerini okuyamaz');

select * from finish();
rollback;
