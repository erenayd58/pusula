-- Uyarı olguları + ders deneme istatistiği (faz6b_mock_alert_facts; 10 §1.5, §1.6).
-- v_topic_alert_facts üç yeni kolon: işaret sayımı son recent_count GENEL denemeye göre (N+1. deneme
-- sayılmaz), branş denemesi mock_recent_count'a girmez, defter penceresi alerts.lookback_days.
-- v_student_mock_subject_stats: RLS (koç kendi öğrencisi, öğrenci kendisi, veli, anon 42501),
-- pencere genel + dersin branşı, wrong_total / avg_net / last_net, sonuç yoksa 0 / null; recent_count
-- ayarı değişince pencere değişir.
begin;
select plan(19);
select tests.seed_fixture();
select tests.seed_templates();
update public.subjects set exam_question_count = 20 where id = tests.id('subj_org_a');

-- Fixture (RLS dışı, postgres): öğrenci A'ya 4 genel sonuç (1–4 Eylül) + 1 Mat branş sonucu (5 Eylül).
insert into public.mock_exam_results (id, student_id, custom_title, subject_id, taken_on, created_by)
values
  (tests.id('res_1'), tests.id('student_a'), 'Deneme 1', null, date '2026-09-01', tests.id('student_a')),
  (tests.id('res_2'), tests.id('student_a'), 'Deneme 2', null, date '2026-09-02', tests.id('student_a')),
  (tests.id('res_3'), tests.id('student_a'), 'Deneme 3', null, date '2026-09-03', tests.id('student_a')),
  (tests.id('res_4'), tests.id('student_a'), 'Deneme 4', null, date '2026-09-04', tests.id('student_a')),
  (tests.id('res_br'), tests.id('student_a'), 'Mat Branş', tests.id('subj_org_a'), date '2026-09-05', tests.id('student_a'));
insert into public.mock_exam_subject_results (result_id, subject_id, correct_count, wrong_count, blank_count, wrong_penalty)
values
  (tests.id('res_1'), tests.id('subj_org_a'), 5, 9, 6, 3),
  (tests.id('res_2'), tests.id('subj_org_a'), 8, 6, 6, 3),
  (tests.id('res_3'), tests.id('subj_org_a'), 10, 3, 7, 3),
  (tests.id('res_4'), tests.id('subj_org_a'), 12, 0, 8, 3),
  (tests.id('res_br'), tests.id('subj_org_a'), 15, 3, 2, 3);
-- Konu 1 işareti 1., 2., 3. denemede (4. yok) → son 3 genel deneme (2, 3, 4) içinde 2 işaret.
insert into public.mock_exam_topic_mistakes (result_id, topic_id)
values
  (tests.id('res_1'), tests.id('topic_org_a_1')),
  (tests.id('res_2'), tests.id('topic_org_a_1')),
  (tests.id('res_3'), tests.id('topic_org_a_1')),
  (tests.id('res_br'), tests.id('topic_org_a_2'));
-- Defter: Konu 2'de 2 güncel kayıt + 1 pencere dışı (100 gün önce).
insert into public.mistakes (student_id, subject_id, topic_id, created_by, created_at)
values
  (tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_2'), tests.id('student_a'), now()),
  (tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_2'), tests.id('student_a'), now() - interval '10 days'),
  (tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_2'), tests.id('student_a'), now() - interval '100 days');

-- 1. v_topic_alert_facts yeni kolonlar. ---------------------------------------------------------
select tests.authenticate_as('coach_x');
select is(
  (select mock_recent_count from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  3,
  'mock_recent_count = son 3 genel deneme (branş sayılmaz, 4. genel pencere dışı)'
);
select is(
  (select mock_wrong_recent from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  2,
  'Konu 1 son 3 denemenin 2''sinde işaretli (N+1. deneme sayılmaz)'
);
select is(
  (select mock_wrong_recent from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2')),
  0,
  'Konu 2 işareti yalnızca branş denemesinde → genel pencerede 0'
);
select is(
  (select mistakes_window from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2')),
  2,
  'defter penceresi: 2 güncel kayıt, 100 gün önceki sayılmaz'
);
select is(
  (select mistakes_window from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  0,
  'Konu 1 defter kaydı yok → 0'
);
select is(
  (select mock_recent_count from public.v_topic_alert_facts
    where student_id = tests.id('student_c') and topic_id = tests.id('topic_org_a_1')),
  0,
  'denemesi olmayan öğrencide 0'
);

-- Ayar: recent_count 2 → pencere 3. ve 4. deneme; Konu 1 yalnızca 3.'de işaretli.
select tests.authenticate_as_service_role();
update public.organizations
  set settings = jsonb_set(settings, '{mock_exams,recent_count}', '2'::jsonb)
  where id = tests.id('org_a');
select tests.authenticate_as('coach_x');
select is(
  (select mock_recent_count from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  2,
  'recent_count 2 → mock_recent_count 2'
);
select is(
  (select mock_wrong_recent from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  1,
  'recent_count 2 → Konu 1 işareti 1'
);
select tests.authenticate_as_service_role();
update public.organizations
  set settings = jsonb_set(settings, '{mock_exams,recent_count}', '3'::jsonb)
  where id = tests.id('org_a');

-- 2. v_student_mock_subject_stats. ----------------------------------------------------------------
-- Pencere (son 3, genel + Mat branşı): branş (14,00; 3 yanlış), 4. (12,00; 0), 3. (9,00; 3).
select tests.authenticate_as('coach_x');
select results_eq(
  $$select exams_count, avg_net, last_net, wrong_total, exam_question_count
    from public.v_student_mock_subject_stats
    where student_id = tests.id('student_a') and subject_id = tests.id('subj_org_a')$$,
  $$values (3, 11.67::numeric, 14.00::numeric, 6, 20::smallint)$$,
  'ders istatistiği: 3 sonuç, ort. 11,67, son 14,00 (branş), 6 yanlış, 20 soru'
);
select results_eq(
  $$select exams_count, avg_net, last_net, wrong_total
    from public.v_student_mock_subject_stats
    where student_id = tests.id('student_c') and subject_id = tests.id('subj_org_a')$$,
  $$values (0, null::numeric, null::numeric, 0)$$,
  'sonucu olmayan öğrencide 0 / null'
);
select is(
  (select count(*) from public.v_student_mock_subject_stats),
  2::bigint,
  'koç X yalnızca öğrencileri A ve C''nin satırlarını görür (1 ders)'
);
select tests.authenticate_as('coach_y');
select is(
  (select count(*) from public.v_student_mock_subject_stats where student_id = tests.id('student_a')),
  0::bigint,
  'başka koç öğrenci A satırını görmez'
);
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.v_student_mock_subject_stats),
  3::bigint,
  'owner kurumun tüm öğrencilerini görür'
);
select tests.authenticate_as('student_a');
select is(
  (select exams_count from public.v_student_mock_subject_stats where student_id = tests.id('student_a')),
  3,
  'öğrenci A kendi satırını görür'
);
select is(
  (select count(*) from public.v_student_mock_subject_stats),
  1::bigint,
  'öğrenci A başka satır görmez'
);
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.v_student_mock_subject_stats where student_id = tests.id('student_a')),
  1::bigint,
  'veli çocuğunun satırını görür'
);
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.v_student_mock_subject_stats$$,
  '42501', null,
  'anon görünümü okuyamaz'
);

-- 3. Branş sonucu yalnızca kendi dersinin penceresine girer; başka dersin satırında sayılmaz.
select tests.authenticate_as_service_role();
insert into public.subjects (id, template_id, code, name, short_name, color, icon, sort_order, exam_question_count)
values (tests.id('subj_org_a_tr'), tests.id('tpl_org_a'), 'TUR', 'Türkçe', 'Tür', 'subject-tr', 'BookOpenText', 0, 20)
on conflict (id) do nothing;
insert into public.mock_exam_subject_results (result_id, subject_id, correct_count, wrong_count, blank_count, wrong_penalty)
values (tests.id('res_4'), tests.id('subj_org_a_tr'), 18, 0, 2, 3);
select tests.authenticate_as('coach_x');
select results_eq(
  $$select exams_count, wrong_total from public.v_student_mock_subject_stats
    where student_id = tests.id('student_a') and subject_id = tests.id('subj_org_a_tr')$$,
  $$values (1, 0)$$,
  'Türkçe satırı: yalnızca 4. genel denemenin Türkçe satırı (Mat branşı girmez)'
);
select is(
  (select mock_recent_count from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  3,
  'ders satırı eklenince genel deneme sayısı değişmez'
);

select * from finish();
rollback;
