-- Tekrar kuyruğu ve cron (faz8c_student_alerts, faz8d_cron; 12 §1.3–1.4).
-- v_review_queue: TS review_due kuralının SQL'i — bitmiş konu, completed_at'ten bu yana geçen güne
-- sığan en büyük review_due_days aralığı m, due_on = tamamlanma + m; due_on'dan sonra kayıt/tekrar
-- varsa kuyrukta değil; ayar değişince pencere değişir. overview.overdue_reviews sayar. RLS koç kendi
-- öğrencisi / öğrenci kendisi / veli çocuğu / anon 42501. Cron: send_daily_reminders (review_due +
-- dedupe + modül kapalıysa yok + 90 gün saklama), detect_inactivity (koça, dedupe), generate_weekly_summaries
-- (öğrenci + veliler + koç toplu), cron.job 3 satır.
begin;
select plan(30);
select tests.seed_fixture();
select tests.seed_templates();
-- Yerel seed'in öğrencileri ve bildirimleri sayımları bozmasın (rollback geri getirir).
delete from public.notifications;
update public.students set status = 'archived'
where organization_id not in (tests.id('org_a'), tests.id('org_b'));

create temporary view t_today as
  select (now() at time zone 'Europe/Istanbul')::date as d;

-- 1. Kuyruk kuralı (postgres olarak). -----------------------------------------------------------------
insert into public.student_topic_progress (student_id, topic_id, status, completed_at)
values
  (tests.id('student_a'), tests.id('topic_org_a_1'), 'completed', now() - interval '10 days'),
  (tests.id('student_a'), tests.id('topic_org_a_2'), 'mastered', now() - interval '3 days');

select is(
  (select array_agg(item_id) from public.v_review_queue where student_id = tests.id('student_a')),
  array[tests.id('topic_org_a_1')],
  '10 gün önce biten konu kuyrukta (m = 7), 3 gün önce biten değil'
);
select is(
  (select (due_on, overdue_days) from public.v_review_queue where item_id = tests.id('topic_org_a_1')),
  ((select d - 3 from t_today), 3),
  'due_on = tamamlanma + 7, overdue_days = 3'
);
select is(
  (select item_type from public.v_review_queue where item_id = tests.id('topic_org_a_1')),
  'topic',
  'item_type topic'
);
-- due_on'dan ÖNCE kayıt: kuyrukta kalır.
insert into public.question_logs (id, student_id, subject_id, topic_id, log_date, total_count, correct_count, wrong_count, blank_count)
values (tests.id('log_rq_before'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), (select d - 5 from t_today), 10, 8, 2, 0);
select is((select count(*) from public.v_review_queue where item_id = tests.id('topic_org_a_1')), 1::bigint, 'vadeden önceki kayıt kuyruktan çıkarmaz');
-- due_on'dan SONRA kayıt: çıkar.
insert into public.question_logs (id, student_id, subject_id, topic_id, log_date, total_count, correct_count, wrong_count, blank_count)
values (tests.id('log_rq_after'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), (select d - 2 from t_today), 10, 8, 2, 0);
select is((select count(*) from public.v_review_queue where item_id = tests.id('topic_org_a_1')), 0::bigint, 'vadeden sonraki kayıt kuyruktan çıkarır');
delete from public.question_logs where id = tests.id('log_rq_after');
-- Tekrar işareti de çıkarır.
update public.student_topic_progress set last_reviewed_at = now() where topic_id = tests.id('topic_org_a_1') and student_id = tests.id('student_a');
select is((select count(*) from public.v_review_queue where item_id = tests.id('topic_org_a_1')), 0::bigint, 'vadeden sonraki tekrar kuyruktan çıkarır');
update public.student_topic_progress set last_reviewed_at = null where topic_id = tests.id('topic_org_a_1') and student_id = tests.id('student_a');
-- Ayar değişince pencere değişir: [3] → 3 gün önce biten de bugün vadesinde.
update public.organizations set settings = settings || jsonb_build_object('alerts', (settings -> 'alerts') || '{"review_due_days": [3]}'::jsonb)
where id = tests.id('org_a');
select is(
  (select array_agg(item_id) from public.v_review_queue where student_id = tests.id('student_a')),
  array[tests.id('topic_org_a_2')],
  'review_due_days [3] → 3 gün önce biten kuyruğa girer; 10 gün önce biten vade (bugün − 7) sonrası kayıtla çıkar'
);
select is(
  (select overdue_days from public.v_review_queue where item_id = tests.id('topic_org_a_2')),
  0,
  'bugün vadesi dolan: overdue_days 0'
);
update public.organizations set settings = settings || jsonb_build_object('alerts', (settings -> 'alerts') || '{"review_due_days": [7, 15, 30]}'::jsonb)
where id = tests.id('org_a');

-- 2. overview.overdue_reviews ve RLS. ---------------------------------------------------------------------
select is(
  (select overdue_reviews from public.v_coach_student_overview where student_id = tests.id('student_a')),
  1,
  'overview.overdue_reviews kuyruğu sayar'
);
select tests.authenticate_as('coach_x');
select is((select count(*) from public.v_review_queue), 1::bigint, 'koç X kendi öğrencisinin kuyruğunu görür');
select tests.authenticate_as('coach_y');
select is((select count(*) from public.v_review_queue), 0::bigint, 'başka koç 0 satır');
select tests.authenticate_as('student_a');
select is((select count(*) from public.v_review_queue), 1::bigint, 'öğrenci kendi kuyruğunu görür');
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.v_review_queue), 1::bigint, 'veli çocuğunun kuyruğunu görür');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.v_review_queue$$, '42501', null, 'anon okuyamaz');
select tests.clear_authentication();

-- 3. send_daily_reminders. -------------------------------------------------------------------------------
select is(private.send_daily_reminders(), 1, 'günlük hatırlatma: kuyruğu olan 1 öğrenciye yazar');
select is(
  (select data from public.notifications where type = 'review_due' and recipient_id = tests.id('student_a')),
  jsonb_build_object('count', 1, 'topics', jsonb_build_array('Konu 1')),
  'review_due olguları: sayı ve ilk konular'
);
select is(private.send_daily_reminders(), 0, 'aynı gün ikinci çağrı dedupe ile 0');
delete from public.notifications;
insert into public.student_modules (student_id, module_id, enabled) values (tests.id('student_a'), 'topics', false);
select is(private.send_daily_reminders(), 0, 'topics modülü kapalıysa hatırlatma yok');
delete from public.student_modules where student_id = tests.id('student_a');
-- Saklama: 100 günlük satır silinir, yenisi kalır.
insert into public.notifications (recipient_id, student_id, type, data, created_at)
values (tests.id('student_b'), tests.id('student_b'), 'weekly_summary', '{}', now() - interval '100 days');
select is(private.send_daily_reminders(), 1, 'hatırlatma yeniden yazılır');
select is(
  (select count(*) from public.notifications where recipient_id = tests.id('student_b')),
  0::bigint,
  '90 günden eski bildirim silindi'
);
delete from public.notifications;

-- 4. detect_inactivity. ----------------------------------------------------------------------------------
-- A'nın son kaydı 5 gün önce (eşik 3) → koç X'e; B kayıtsız (kurulum uyarısı, burada yok); C bugün kayıtlı.
insert into public.question_logs (student_id, subject_id, log_date, total_count, correct_count, wrong_count, blank_count)
values (tests.id('student_c'), tests.id('subj_org_a'), (select d from t_today), 10, 8, 2, 0);
select is(private.detect_inactivity(), 1, 'hareketsizlik: 1 koç bildirimi');
select is(
  (select (recipient_id, student_id, data) from public.notifications where type = 'student_inactive'),
  (tests.id('coach_x'), tests.id('student_a'), '{"days": 5}'::jsonb),
  'koç X''e, öğrenci A, 5 gün'
);
select is(private.detect_inactivity(), 0, 'ikinci çağrı dedupe (inactivity_notify_days) ile 0');
update public.organizations set settings = settings || jsonb_build_object('student_alerts', (settings -> 'student_alerts') || '{"inactivity_days": 10}'::jsonb)
where id = tests.id('org_a');
delete from public.notifications;
select is(private.detect_inactivity(), 0, 'eşik 10 güne çıkınca 5 günlük hareketsizlik bildirilmez');

-- 5. generate_weekly_summaries. --------------------------------------------------------------------------
-- Aktif öğrenciler A, B, C (org A), Z (org B); veliler P1, P2 → A; P3 → B; PZ → Z; koçlar X, Y, Z.
select is(private.generate_weekly_summaries(), 11, 'haftalık özet: 4 öğrenci + 4 veli + 3 koç');
select is(
  (select (data ->> 'questions')::int from public.notifications where type = 'weekly_summary' and recipient_id = tests.id('parent_p1')),
  (select coalesce(sum(total_count), 0)::int from public.question_logs l, t_today t
    where l.student_id = tests.id('student_a') and l.log_date >= date_trunc('week', t.d)::date),
  'veli özeti: bu haftanın soru toplamı'
);
select is(
  (select data -> 'totals' from public.notifications where type = 'weekly_summary' and recipient_id = tests.id('coach_x')),
  jsonb_build_object('students', 2, 'questions',
    (select coalesce(sum(total_count), 0)::int from public.question_logs l, t_today t
      where l.student_id in (tests.id('student_a'), tests.id('student_c')) and l.log_date >= date_trunc('week', t.d)::date),
    'plan_percent_avg', null),
  'koç toplu özeti: 2 öğrenci, toplam soru, plan yok'
);
select is(
  (select student_id from public.notifications where type = 'weekly_summary' and recipient_id = tests.id('coach_x')),
  null,
  'koç özetinde student_id null'
);
select is(private.generate_weekly_summaries(), 0, 'ikinci çağrı dedupe (6 gün) ile 0');

-- 6. cron işleri. -----------------------------------------------------------------------------------------
select is((select count(*) from cron.job where jobname like 'pusula_%'), 3::bigint, 'üç pg_cron işi kayıtlı');

select * from finish();
rollback;
