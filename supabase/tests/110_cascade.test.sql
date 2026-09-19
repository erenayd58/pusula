-- Öğrenci silme = auth.users satırının silinmesi (admin API). Cascade zinciri:
-- auth.users → profiles → students → student_parents, consents, invitations(student_id),
-- student_modules, busy_slots, schedule_exceptions (Faz 4a; created_by set null olduğundan
-- öğrencinin kendi yazdığı satırlar silmeyi engellemez), suggestion_dismissals (Faz 4d),
-- student_subject_targets, student_topic_targets (Faz 5b; created_by koç silinince set null),
-- mock_exam_results + ders satırları + konu işaretleri (Faz 6a; katalog kalır, created_by set null).
-- Veli profili silinmez.
begin;
select plan(19);
select tests.seed_fixture();
select tests.seed_templates();

-- Öğrenci A'ya bağlı satırlar
insert into public.consents (student_id, given_by, type, document_version)
values (tests.id('student_a'), tests.id('parent_p1'), 'explicit_consent', 'test-v1');
insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
values (tests.id('org_a'), 'CASCADE1', 'parent', tests.id('student_a'), tests.id('coach_x'), now() + interval '7 days');
insert into public.student_modules (student_id, module_id, enabled)
values (tests.id('student_a'), 'topics', true);
insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, created_by)
values (tests.id('student_a'), 1, '08:30', '15:00', tests.id('student_a'));
insert into public.schedule_exceptions (student_id, on_date, title, created_by)
values (tests.id('student_a'), date '2026-10-05', 'Yazılı', tests.id('student_a'));
insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
values (tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14);
-- Öğrencisi olmayan koç W: silinince konu hedefinin created_by'ı boşalmalı (öğrenciler koçu FK ile tutar).
select tests.create_user('coach_w', 'coach', tests.id('org_a'), 'Koç W');
insert into public.student_subject_targets (student_id, subject_id, questions)
values (tests.id('student_a'), tests.id('subj_org_a'), 500);
insert into public.student_topic_targets (student_id, topic_id, target_on, created_by)
values
  (tests.id('student_a'), tests.id('topic_org_a_1'), date '2026-10-05', tests.id('coach_x')),
  (tests.id('student_c'), tests.id('topic_org_a_1'), date '2026-10-05', tests.id('coach_w'));

-- Deneme (Faz 6a): koç W'nin tanımladığı katalog denemesi, öğrenci A'nın sonucu + alt satırlar.
insert into public.mock_exams (id, organization_id, template_id, title, created_by)
values (tests.id('exam_cascade'), tests.id('org_a'), tests.id('tpl_org_a'), 'Cascade Deneme', tests.id('coach_w'));
insert into public.mock_exam_results (id, student_id, mock_exam_id, taken_on, created_by)
values (tests.id('result_cascade'), tests.id('student_a'), tests.id('exam_cascade'), date '2026-09-01', tests.id('coach_w'));
insert into public.mock_exam_subject_results (result_id, subject_id, correct_count, wrong_count, blank_count, wrong_penalty)
values (tests.id('result_cascade'), tests.id('subj_org_a'), 10, 3, 2, 3);
insert into public.mock_exam_topic_mistakes (result_id, topic_id)
values (tests.id('result_cascade'), tests.id('topic_org_a_1'));
insert into public.mock_exam_results (id, student_id, custom_title, taken_on, created_by)
values (tests.id('result_cascade_c'), tests.id('student_c'), 'Serbest', date '2026-09-01', tests.id('coach_w'));

select is(
  (select count(*) from public.student_parents where student_id = tests.id('student_a')),
  2::bigint,
  'ön koşul: öğrenci A''nın 2 veli bağlantısı var'
);

-- Silme (admin API auth.users'ı siler; burada doğrudan)
delete from auth.users where id = tests.id('student_a');

select is((select count(*) from public.profiles where id = tests.id('student_a')), 0::bigint, 'profil silindi');
select is((select count(*) from public.students where profile_id = tests.id('student_a')), 0::bigint, 'öğrenci satırı silindi');
select is((select count(*) from public.student_parents where student_id = tests.id('student_a')), 0::bigint, 'veli bağlantıları silindi');
select is((select count(*) from public.consents where student_id = tests.id('student_a')), 0::bigint, 'onaylar silindi');
select is((select count(*) from public.invitations where code = 'CASCADE1'), 0::bigint, 'öğrencinin davetleri silindi');
select is((select count(*) from public.student_modules where student_id = tests.id('student_a')), 0::bigint, 'modül ayarları silindi');
select is((select count(*) from public.busy_slots where student_id = tests.id('student_a')), 0::bigint, 'meşguliyetler silindi');
select is((select count(*) from public.schedule_exceptions where student_id = tests.id('student_a')), 0::bigint, 'program istisnaları silindi');
select is((select count(*) from public.suggestion_dismissals where student_id = tests.id('student_a')), 0::bigint, 'öneri reddetmeleri silindi');
select is((select count(*) from public.student_subject_targets where student_id = tests.id('student_a')), 0::bigint, 'ders hedefleri silindi');
select is((select count(*) from public.student_topic_targets where student_id = tests.id('student_a')), 0::bigint, 'konu hedefleri silindi');
select is((select count(*) from public.mock_exam_results where student_id = tests.id('student_a')), 0::bigint, 'deneme sonuçları silindi');
select is((select count(*) from public.mock_exam_subject_results where result_id = tests.id('result_cascade')), 0::bigint, 'deneme ders satırları silindi');
select is((select count(*) from public.mock_exam_topic_mistakes where result_id = tests.id('result_cascade')), 0::bigint, 'deneme konu işaretleri silindi');
select is((select count(*) from public.mock_exams where id = tests.id('exam_cascade')), 1::bigint, 'katalog denemesi kalır');

-- Koç W silinince öğrenci C'nin konu hedefi kalır, created_by boşalır.
delete from auth.users where id = tests.id('coach_w');
select is(
  (select created_by is null from public.student_topic_targets where student_id = tests.id('student_c') and topic_id = tests.id('topic_org_a_1')),
  true,
  'koç silinince konu hedefi kalır, created_by set null'
);
select is(
  (select (select created_by is null from public.mock_exams where id = tests.id('exam_cascade'))
      and (select created_by is null from public.mock_exam_results where id = tests.id('result_cascade_c'))),
  true,
  'koç silinince katalog ve sonuç kalır, created_by set null'
);
select is((select count(*) from public.profiles where id = tests.id('parent_p1')), 1::bigint, 'veli profili kalır');

select * from finish();
rollback;
