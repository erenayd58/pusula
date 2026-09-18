-- v_topic_alert_facts (08 §1.5): görünüm RLS (koç kendi öğrencisi, owner kurumu, öğrenci
-- kendisi, veli çocuğu, anon yok); satır yoksa 'not_started'; soru penceresi kurum ayarından
-- (alerts.lookback_days); son kayıt tarihleri; is_next_topic = dersin ilk başlanmamış konusu.
begin;
select plan(22);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Görünürlük: öğrenci × ünite düzeyi konu; fixture'da her şablonda 1 ders, 2 konu.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.v_topic_alert_facts), 4::bigint,
  'koç X yalnızca kendi öğrencilerinin (A, C) satırlarını görür (2 × 2 konu)'
);
select is(
  (select count(*) from public.v_topic_alert_facts where student_id = tests.id('student_b')), 0::bigint,
  'koç X öğrenci B satırı görmez'
);
select tests.authenticate_as('coach_y');
select is(
  (select count(*) from public.v_topic_alert_facts), 2::bigint,
  'koç Y yalnızca öğrenci B satırlarını görür'
);
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.v_topic_alert_facts), 6::bigint,
  'owner kurumun tüm öğrencilerini görür (A, B, C)'
);
select is(
  (select count(*) from public.v_topic_alert_facts where organization_id <> tests.id('org_a')), 0::bigint,
  'owner başka kurumun satırını görmez'
);
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.v_topic_alert_facts), 2::bigint,
  'öğrenci A yalnızca kendi satırlarını görür'
);
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.v_topic_alert_facts where student_id = tests.id('student_a')), 2::bigint,
  'veli çocuğunun satırlarını görür'
);
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.v_topic_alert_facts$$,
  '42501', null,
  'anon görünümü okuyamaz'
);

-- 2. Varsayılanlar: ilerleme satırı yoksa not_started, soru 0, tarihler boş; ilk konu sıradaki.
select tests.authenticate_as('coach_x');
select is(
  (select status from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  'not_started'::public.topic_status,
  'ilerleme satırı yoksa durum not_started'
);
select is(
  (select questions_window from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  0,
  'kayıt yoksa pencere sorusu 0'
);
select is(
  (select last_topic_log_date is null and subject_last_log_date is null and student_first_log_date is null
    from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  true,
  'kayıt yoksa tarih kolonları boş'
);
select is(
  (select is_next_topic from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  true,
  'sort_order 1 konu sıradaki (is_next_topic)'
);
select is(
  (select is_next_topic from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2')),
  false,
  'sort_order 2 konu sıradaki değil'
);

-- 3. Soru penceresi kurum ayarından: bugün 20 soru, 70 gün önce 30 soru → varsayılan 60 günde 20.
insert into public.question_logs (student_id, log_date, subject_id, topic_id, total_count, correct_count, wrong_count, blank_count)
values
  (tests.id('student_a'), (now() at time zone 'Europe/Istanbul')::date, tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 10, 8, 2),
  (tests.id('student_a'), (now() at time zone 'Europe/Istanbul')::date - 70, tests.id('subj_org_a'), tests.id('topic_org_a_1'), 30, 30, 0, 0),
  -- konusuz ders kaydı: dersin son kaydına sayılır, konu penceresine sayılmaz
  (tests.id('student_a'), (now() at time zone 'Europe/Istanbul')::date - 3, tests.id('subj_org_a'), null, 10, 5, 5, 0);
select is(
  (select (questions_window, correct_window) from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  (20, 10),
  'varsayılan 60 günlük pencerede yalnızca bugünkü kayıt sayılır'
);
select is(
  (select last_topic_log_date from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  (now() at time zone 'Europe/Istanbul')::date,
  'last_topic_log_date konunun son kaydı'
);
select is(
  (select (subject_last_log_date, student_first_log_date) from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2')),
  ((now() at time zone 'Europe/Istanbul')::date, (now() at time zone 'Europe/Istanbul')::date - 70),
  'dersin son kaydı ve öğrencinin ilk kaydı her konu satırında'
);
select is(
  (select questions_window from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2')),
  0,
  'diğer konunun penceresi etkilenmez'
);

-- Owner pencereyi 90 güne çıkarır → 70 gün önceki kayıt da sayılır.
select tests.authenticate_as('owner_a');
update public.organizations
  set settings = jsonb_set(settings, '{alerts,lookback_days}', '90'::jsonb)
  where id = tests.id('org_a');
select tests.authenticate_as('coach_x');
select is(
  (select (questions_window, correct_window) from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  (50, 40),
  'pencere kurum ayarından okunur (90 gün)'
);

-- 4. Durum ve is_next_topic ilerlemeyle değişir.
insert into public.student_topic_progress (student_id, topic_id, status, completed_at, last_reviewed_at)
values (tests.id('student_a'), tests.id('topic_org_a_1'), 'completed', now() - interval '10 days', now() - interval '2 days');
select is(
  (select status from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  'completed'::public.topic_status,
  'ilerleme satırı varsa durum oradan'
);
select is(
  (select status_changed_at is not null and completed_at is not null and last_reviewed_at is not null
    from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  true,
  'status_changed_at / completed_at / last_reviewed_at dolu'
);
select is(
  (select (bool_and(not is_next_topic) filter (where topic_id = tests.id('topic_org_a_1')),
           bool_and(is_next_topic) filter (where topic_id = tests.id('topic_org_a_2')))
    from public.v_topic_alert_facts where student_id = tests.id('student_a')),
  (true, true),
  'ilk konu tamamlanınca sıradaki konu ikinciye geçer'
);
insert into public.student_topic_progress (student_id, topic_id, status)
values (tests.id('student_a'), tests.id('topic_org_a_2'), 'studying');
select is(
  (select count(*) filter (where is_next_topic) from public.v_topic_alert_facts
    where student_id = tests.id('student_a')),
  0::bigint,
  'başlanmamış konu kalmayınca sıradaki yok'
);

select * from finish();
rollback;
