-- question_logs RLS (03 §5.2 / 5.4): öğrenci ve koç S I U D; veli S; anon yok.
-- Ek: log_date varsayılanı ve gelecek tarih kısıtı İstanbul gününe göre (oturum saat dilimi
-- UTC olsa bile); görünümler security_invoker + anon'a kapalı.
begin;
select plan(25);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Öğrenci A kendi kaydını ekler, okur, günceller, siler.
select tests.authenticate_as('student_a');
select lives_ok(
  $$insert into public.question_logs (id, student_id, subject_id, topic_id, total_count, correct_count, wrong_count, blank_count)
    values (tests.id('log_a1'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 15, 3, 2)$$,
  'öğrenci A kendi kaydını ekler'
);
select is((select count(*) from public.question_logs), 1::bigint, 'öğrenci A kendi kaydını görür');
select is(
  tests.row_count($$update public.question_logs set correct_count = 16, wrong_count = 2
    where id = tests.id('log_a1') returning 1$$),
  1::bigint,
  'öğrenci A kendi kaydını günceller'
);
select lives_ok(
  $$insert into public.question_logs (id, student_id, subject_id, total_count, correct_count, wrong_count, blank_count)
    values (tests.id('log_a2'), tests.id('student_a'), tests.id('subj_org_a'), 10, 5, 5, 0)$$,
  'öğrenci A konusuz ikinci kayıt ekler'
);
select is(
  tests.row_count($$delete from public.question_logs where id = tests.id('log_a2') returning 1$$),
  1::bigint,
  'öğrenci A kendi kaydını siler'
);

-- Tarih: oturum UTC'de olsa da varsayılan log_date İstanbul günü; gelecek tarih reddedilir.
set local timezone = 'UTC';
select is(
  (select log_date from public.question_logs where id = tests.id('log_a1')),
  (now() at time zone 'Europe/Istanbul')::date,
  'log_date varsayılanı İstanbul günü (oturum UTC iken)'
);
select throws_ok(
  $$insert into public.question_logs (student_id, subject_id, total_count, log_date)
    values (tests.id('student_a'), tests.id('subj_org_a'), 5, (now() at time zone 'Europe/Istanbul')::date + 1)$$,
  '23514', null,
  'gelecek tarihe kayıt girilemez (İstanbul gününe göre)'
);
select lives_ok(
  $$insert into public.question_logs (id, student_id, subject_id, total_count, log_date)
    values (tests.id('log_a3'), tests.id('student_a'), tests.id('subj_org_a'), 5, (now() at time zone 'Europe/Istanbul')::date)$$,
  'İstanbul bugününe kayıt girilir (oturum UTC iken)'
);
select is(
  (select questions from public.v_student_daily_summary
    where student_id = tests.id('student_a') and day = (now() at time zone 'Europe/Istanbul')::date),
  25,
  'v_student_daily_summary İstanbul bugününü toplar (20 + 5)'
);
select is(
  (select week_start from public.v_student_subject_weekly where student_id = tests.id('student_a')),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date,
  'v_student_subject_weekly haftası pazartesi başlar'
);
select is(
  (select questions from public.v_topic_question_stats
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  20,
  'v_topic_question_stats konu toplamı'
);
reset timezone;

-- Toplam kısıtı: doğru + yanlış + boş toplamı aşamaz.
select throws_ok(
  $$insert into public.question_logs (student_id, subject_id, total_count, correct_count, wrong_count, blank_count)
    values (tests.id('student_a'), tests.id('subj_org_a'), 10, 8, 2, 1)$$,
  '23514', null,
  'doğru + yanlış + boş > toplam reddedilir'
);

-- 2. Öğrenci B'nin kaydını göremez ve B adına ekleyemez.
select throws_ok(
  $$insert into public.question_logs (student_id, subject_id, total_count)
    values (tests.id('student_b'), tests.id('subj_org_a'), 10)$$,
  '42501', null,
  'öğrenci A öğrenci B adına kayıt ekleyemez'
);
select tests.authenticate_as('student_b');
select is((select count(*) from public.question_logs), 0::bigint, 'öğrenci B öğrenci A''nın kaydını göremez');
select is(
  (select count(*) from public.v_student_daily_summary), 0::bigint,
  'öğrenci B görünümde de A''nın özetini göremez (security_invoker)'
);

-- 3. Koç X kendi öğrencisini görür, yazar; Y göremez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.question_logs where student_id = tests.id('student_a')), 2::bigint,
  'koç X öğrencisi A''nın kayıtlarını görür'
);
select lives_ok(
  $$insert into public.question_logs (student_id, subject_id, total_count, correct_count)
    values (tests.id('student_c'), tests.id('subj_org_a'), 30, 25)$$,
  'koç X öğrencisi C için kayıt ekler'
);
select throws_ok(
  $$insert into public.question_logs (student_id, subject_id, total_count)
    values (tests.id('student_b'), tests.id('subj_org_a'), 10)$$,
  '42501', null,
  'koç X başka koçun öğrencisi B için kayıt ekleyemez'
);
select is(
  (select week_questions from public.v_coach_student_overview where student_id = tests.id('student_a')),
  25,
  'v_coach_student_overview bu haftanın sorusunu sayar'
);
select is(
  (select count(*) from public.v_coach_student_overview), 2::bigint,
  'koç X listede yalnızca kendi öğrencilerini (A, C) görür'
);
select tests.authenticate_as('coach_y');
select is((select count(*) from public.question_logs), 0::bigint, 'koç Y öğrenci A/C kayıtlarını göremez');

-- 4. Veli çocuğunu görür, yazamaz.
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.question_logs), 2::bigint, 'veli P2 çocuğunun kayıtlarını görür');
select throws_ok(
  $$insert into public.question_logs (student_id, subject_id, total_count)
    values (tests.id('student_a'), tests.id('subj_org_a'), 10)$$,
  '42501', null,
  'veli kayıt ekleyemez'
);

-- 5. anon hiçbir şey göremez (tablo ve görünüm).
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.question_logs$$,
  '42501', null,
  'anon question_logs tablosunu okuyamaz'
);
select throws_ok(
  $$select count(*) from public.v_coach_student_overview$$,
  '42501', null,
  'anon görünümü okuyamaz'
);

select * from finish();
rollback;
