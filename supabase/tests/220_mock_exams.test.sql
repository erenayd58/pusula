-- Denemeler (faz6a_mock_exams / faz6a_mock_exam_rpc / faz6a_mock_overview; 10 §1.3, §1.6).
-- 4 tablo 5 senaryo: katalog kurum içi herkes okur, başka kurum 0, öğrenci/veli yazamaz; sonuç ve alt
-- tablolar öğrenci kendi, koç kendi öğrencisi, veli çocuğu, anon 42501. Check'ler (başlık/katalog,
-- branş + katalog çelişkisi, gelecek tarih 23514), tekil katalog sonucu 23505, on delete restrict 23503.
-- RPC: öğrenci kendi sonucunu yazar ve düzenler (alt satırlar yenilenir), koç yazar, başka koç 42501,
-- geçersiz ders/konu/aşan sayı 22023 ve atomiklik, wrong_penalty şablondan, net hesaplanmış
-- (3 yanlış = −1,00), ceza 0 şablonda net = doğru; overview last_net / net_delta (tek deneme → delta
-- null; branş sayılmaz).
begin;
select plan(53);
select tests.seed_fixture();
select tests.seed_templates();

-- Şablonda ikinci ders (branş ve "ders satırı olmayan derse ait konu" senaryoları) ve soru sayısı.
insert into public.subjects (id, template_id, code, name, short_name, color, icon, sort_order, exam_question_count)
values (tests.id('subj_org_a_tr'), tests.id('tpl_org_a'), 'TUR', 'Türkçe', 'Tür', 'subject-tr', 'BookOpenText', 0, 20)
on conflict (id) do nothing;
update public.subjects set exam_question_count = 20 where id = tests.id('subj_org_a');
insert into public.topics (id, subject_id, name, sort_order)
values (tests.id('topic_org_a_tr_1'), tests.id('subj_org_a_tr'), 'Paragraf', 1)
on conflict (id) do nothing;

-- 1. Katalog: koç X kurum A'da genel ve branş denemesi tanımlar. ---------------------------------
select tests.authenticate_as('coach_x');
insert into public.mock_exams (id, organization_id, template_id, subject_id, title, publisher, exam_date, created_by)
values
  (tests.id('exam_gen'), tests.id('org_a'), tests.id('tpl_org_a'), null, 'Genel Deneme 1', 'Test Yayınları', date '2026-09-01', tests.id('coach_x')),
  (tests.id('exam_branch'), tests.id('org_a'), tests.id('tpl_org_a'), tests.id('subj_org_a'), 'Mat Branş 1', null, date '2026-09-05', tests.id('coach_x'));
select is((select count(*) from public.mock_exams), 2::bigint, 'koç X kurum kataloğunu görür (2)');
select is(
  tests.row_count($$update public.mock_exams set publisher = 'Yeni Yayın' where id = tests.id('exam_gen') returning 1$$),
  1::bigint,
  'koç X katalog satırını günceller'
);
select throws_ok(
  $$insert into public.mock_exams (organization_id, template_id, title, created_by)
    values (tests.id('org_a'), tests.id('tpl_org_a'), 'Sahte', tests.id('owner_a'))$$,
  '42501', null,
  'created_by başkası → 42501'
);
select throws_ok(
  $$insert into public.mock_exams (organization_id, template_id, title, created_by)
    values (tests.id('org_b'), tests.id('tpl_org_b'), 'Başka kurum', tests.id('coach_x'))$$,
  '42501', null,
  'koç X başka kuruma katalog yazamaz'
);

select tests.authenticate_as('student_a');
select is((select count(*) from public.mock_exams), 2::bigint, 'öğrenci A kurum kataloğunu okur');
select throws_ok(
  $$insert into public.mock_exams (organization_id, template_id, title, created_by)
    values (tests.id('org_a'), tests.id('tpl_org_a'), 'Öğrenci denemesi', tests.id('student_a'))$$,
  '42501', null,
  'öğrenci kataloğa yazamaz'
);
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.mock_exams), 2::bigint, 'veli kurum kataloğunu okur (rapor başlığı)');
select is(
  tests.row_count($$update public.mock_exams set title = 'x' where id = tests.id('exam_gen') returning 1$$),
  0::bigint,
  'veli kataloğu güncelleyemez (0 satır)'
);
select tests.authenticate_as('coach_z');
select is((select count(*) from public.mock_exams), 0::bigint, 'başka kurumun koçu kataloğu göremez');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.mock_exams$$, '42501', null, 'anon katalog 42501');

-- 2. RPC: öğrenci A kendi genel sonucunu yazar. ----------------------------------------------------
select tests.authenticate_as('student_a');
select lives_ok(
  $$select set_config('tests.result_a', public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'mock_exam_id', tests.id('exam_gen'),
                         'taken_on', '2026-09-02', 'duration_minutes', 120, 'score', 412.5, 'percentile', 3.2),
      jsonb_build_array(
        jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 15, 'wrong', 3, 'blank', 2),
        jsonb_build_object('subject_id', tests.id('subj_org_a_tr'), 'correct', 18, 'wrong', 0, 'blank', 2)
      ),
      array[tests.id('topic_org_a_1'), tests.id('topic_org_a_tr_1')]
    )::text, true)$$,
  'öğrenci A katalog denemesine sonuç yazar'
);
select is(
  (select created_by = tests.id('student_a') and mock_exam_id = tests.id('exam_gen')
      and custom_title is null and subject_id is null
   from public.mock_exam_results where id = current_setting('tests.result_a', true)::uuid),
  true,
  'sonuçta created_by öğrenci, katalog bağı, serbest başlık ve branş boş'
);
select results_eq(
  $$select subject_id, wrong_penalty, net from public.mock_exam_subject_results
    where result_id = current_setting('tests.result_a', true)::uuid order by net$$,
  $$values (tests.id('subj_org_a'), 3::smallint, 14.00::numeric), (tests.id('subj_org_a_tr'), 3::smallint, 18.00::numeric)$$,
  'wrong_penalty şablondan (3), net hesaplanmış (15 − 3/3 = 14,00)'
);
select is(
  (select count(*) from public.mock_exam_topic_mistakes where result_id = current_setting('tests.result_a', true)::uuid),
  2::bigint,
  'iki konu işareti yazıldı'
);

-- 3. RPC düzenleme: alt satırlar yenilenir. --------------------------------------------------------
select is(
  public.save_mock_exam_result(
    jsonb_build_object('id', current_setting('tests.result_a', true)::uuid, 'student_id', tests.id('student_a'),
                       'mock_exam_id', tests.id('exam_gen'), 'taken_on', '2026-09-03', 'note', ' süre yetmedi '),
    jsonb_build_array(
      jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 17, 'wrong', 3, 'blank', 0),
      jsonb_build_object('subject_id', tests.id('subj_org_a_tr'), 'correct', 19, 'wrong', 1, 'blank', 0)
    ),
    array[tests.id('topic_org_a_2')]
  ),
  current_setting('tests.result_a', true)::uuid,
  'düzenleme aynı id ile döner'
);
select is(
  (select taken_on = date '2026-09-03' and note = 'süre yetmedi' and duration_minutes is null
   from public.mock_exam_results where id = current_setting('tests.result_a', true)::uuid),
  true,
  'tarih ve not güncellendi, verilmeyen süre boşaldı'
);
select results_eq(
  $$select topic_id from public.mock_exam_topic_mistakes where result_id = current_setting('tests.result_a', true)::uuid$$,
  $$values (tests.id('topic_org_a_2'))$$,
  'konu işaretleri yeniden yazıldı'
);
select is(
  (select sum(net) from public.mock_exam_subject_results where result_id = current_setting('tests.result_a', true)::uuid),
  34.67::numeric,
  'toplam net 16,00 + 18,67 = 34,67'
);

-- 4. Doğrulamalar (22023) ve atomiklik. -----------------------------------------------------------
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'custom_title', 'Serbest', 'taken_on', '2026-09-04'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_b'), 'correct', 1, 'wrong', 0, 'blank', 0)),
      '{}'::uuid[])$$,
  '22023', 'invalid_subject',
  'başka şablonun dersi → invalid_subject'
);
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'custom_title', 'Serbest', 'taken_on', '2026-09-04'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 15, 'wrong', 5, 'blank', 1)),
      '{}'::uuid[])$$,
  '22023', 'count_exceeded',
  'D + Y + B > 20 → count_exceeded'
);
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'custom_title', 'Serbest', 'taken_on', '2026-09-04'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 10, 'wrong', 5, 'blank', 0)),
      array[tests.id('topic_org_a_tr_1')])$$,
  '22023', 'invalid_topic',
  'ders satırı olmayan derse ait konu → invalid_topic'
);
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'taken_on', '2026-09-04'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 10, 'wrong', 5, 'blank', 0)),
      '{}'::uuid[])$$,
  '22023', 'title_required',
  'katalog dışı kayıtta başlık boş → title_required'
);
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'mock_exam_id', tests.id('exam_branch'), 'taken_on', '2026-09-06'),
      jsonb_build_array(
        jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 10, 'wrong', 5, 'blank', 0),
        jsonb_build_object('subject_id', tests.id('subj_org_a_tr'), 'correct', 10, 'wrong', 5, 'blank', 0)),
      '{}'::uuid[])$$,
  '22023', 'invalid_subject',
  'branş denemesinde iki ders satırı → invalid_subject'
);
select is(
  (select count(*) from public.mock_exam_results where student_id = tests.id('student_a')),
  1::bigint,
  'hatalı çağrılar satır bırakmadı (atomik)'
);
-- Katalog denemesi öğrenci başına bir kez (C6): ikinci insert 23505.
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'mock_exam_id', tests.id('exam_gen'), 'taken_on', '2026-09-04'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 10, 'wrong', 5, 'blank', 0)),
      '{}'::uuid[])$$,
  '23505', null,
  'aynı katalog denemesine ikinci sonuç → 23505'
);
-- Branş katalog denemesi: tek ders satırı, net ders sırasında.
select lives_ok(
  $$select set_config('tests.result_branch', public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'mock_exam_id', tests.id('exam_branch'), 'taken_on', '2026-09-06'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 20, 'wrong', 0, 'blank', 0)),
      '{}'::uuid[])::text, true)$$,
  'branş katalog denemesine tek ders satırı yazılır'
);

-- 5. Check kısıtları doğrudan tabloda. ----------------------------------------------------------
select throws_ok(
  $$insert into public.mock_exam_results (student_id, taken_on, created_by)
    values (tests.id('student_a'), '2026-09-01', tests.id('student_a'))$$,
  '23514', null,
  'katalog ya da başlık zorunlu (23514)'
);
select throws_ok(
  $$insert into public.mock_exam_results (student_id, mock_exam_id, subject_id, taken_on, created_by)
    values (tests.id('student_a'), tests.id('exam_gen'), tests.id('subj_org_a'), '2026-09-01', tests.id('student_a'))$$,
  '23514', null,
  'katalog + branş dersi birlikte olamaz (23514)'
);
select throws_ok(
  $$insert into public.mock_exam_results (student_id, custom_title, taken_on, created_by)
    values (tests.id('student_a'), 'Gelecek', (now() at time zone 'Europe/Istanbul')::date + 1, tests.id('student_a'))$$,
  '23514', null,
  'gelecek tarih (23514)'
);
select throws_ok(
  $$insert into public.mock_exam_results (student_id, custom_title, taken_on, created_by)
    values (tests.id('student_b'), 'Başkası', '2026-09-01', tests.id('student_a'))$$,
  '42501', null,
  'öğrenci A öğrenci B adına sonuç yazamaz'
);

-- 6. Erişim: öğrenci B, koç X/Y, veli, anon. -------------------------------------------------------
select tests.authenticate_as('student_b');
select is((select count(*) from public.mock_exam_results), 0::bigint, 'öğrenci B başkasının sonucunu göremez');
select is((select count(*) from public.mock_exam_subject_results), 0::bigint, 'öğrenci B alt satırları göremez');
select is(
  tests.row_count($$delete from public.mock_exam_results where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci B başkasının sonucunu silemez (0 satır)'
);

select tests.authenticate_as('coach_x');
select is((select count(*) from public.mock_exam_results), 2::bigint, 'koç X öğrencisinin 2 sonucunu görür');
select is((select count(*) from public.mock_exam_topic_mistakes), 1::bigint, 'koç X konu işaretlerini görür');
select lives_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_c'), 'custom_title', 'Koç girişi', 'taken_on', '2026-09-07'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 12, 'wrong', 6, 'blank', 2)),
      '{}'::uuid[])$$,
  'koç X öğrencisi C adına sonuç yazar'
);
select throws_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_b'), 'custom_title', 'Yetkisiz', 'taken_on', '2026-09-07'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 12, 'wrong', 6, 'blank', 2)),
      '{}'::uuid[])$$,
  '42501', 'not_allowed',
  'koç X başka koçun öğrencisi B için RPC 42501'
);
-- on delete restrict: sonucu olan katalog denemesi silinemez (C5).
select throws_ok(
  $$delete from public.mock_exams where id = tests.id('exam_gen')$$,
  '23503', null,
  'sonucu olan katalog denemesi silinemez (23503)'
);

select tests.authenticate_as('coach_y');
select is((select count(*) from public.mock_exam_results), 0::bigint, 'koç Y öğrenci A''nın sonucunu göremez');

select tests.authenticate_as('parent_p1');
select is((select count(*) from public.mock_exam_results), 2::bigint, 'veli çocuğunun sonuçlarını görür');
select is((select count(*) from public.mock_exam_subject_results), 3::bigint, 'veli ders satırlarını görür');
select is(
  tests.row_count($$update public.mock_exam_results set note = 'x' where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'veli sonucu değiştiremez (0 satır)'
);
select tests.authenticate_as('parent_pz');
select is((select count(*) from public.mock_exam_results), 0::bigint, 'başka kurumun velisi 0 satır');

select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.mock_exam_results$$, '42501', null, 'anon sonuç 42501');
select throws_ok($$select count(*) from public.mock_exam_topic_mistakes$$, '42501', null, 'anon işaret 42501');

-- 7. Overview: last_net / net_delta (tek genel deneme → delta null; branş sayılmaz). ---------------
select tests.authenticate_as('coach_x');
select is(
  (select (last_net, net_delta, last_mock_on) from public.v_coach_student_overview where student_id = tests.id('student_a')),
  (34.67::numeric, null::numeric, date '2026-09-03'),
  'tek genel deneme: last_net 34,67, delta null, branş sayılmadı'
);
-- İkinci genel deneme (serbest, daha sonra): delta = yeni − eski.
select lives_ok(
  $$select public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'custom_title', 'Serbest 2', 'taken_on', '2026-09-10'),
      jsonb_build_array(
        jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 18, 'wrong', 0, 'blank', 2),
        jsonb_build_object('subject_id', tests.id('subj_org_a_tr'), 'correct', 20, 'wrong', 0, 'blank', 0)),
      '{}'::uuid[])$$,
  'ikinci genel deneme yazılır'
);
select is(
  (select (last_net, prev_net, net_delta) from public.v_coach_student_overview where student_id = tests.id('student_a')),
  (38.00::numeric, 34.67::numeric, 3.33::numeric),
  'iki genel deneme: last 38,00, prev 34,67, delta +3,33'
);
select is(
  (select last_net from public.v_coach_student_overview where student_id = tests.id('student_c')),
  10.00::numeric,
  'öğrenci C: koç girişi 12 − 6/3 = 10,00'
);

-- 8. Ceza 0 şablonda net = doğru. ------------------------------------------------------------------
select tests.clear_authentication();
update public.curriculum_templates set scoring = '{"wrong_penalty": 0}'::jsonb where id = tests.id('tpl_org_a');
select tests.authenticate_as('student_a');
select lives_ok(
  $$select set_config('tests.result_nopen', public.save_mock_exam_result(
      jsonb_build_object('student_id', tests.id('student_a'), 'custom_title', 'Cezasız', 'taken_on', '2026-09-11'),
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'correct', 10, 'wrong', 9, 'blank', 1)),
      '{}'::uuid[])::text, true)$$,
  'ceza 0 şablonda kayıt'
);
select is(
  (select (wrong_penalty, net) from public.mock_exam_subject_results where result_id = current_setting('tests.result_nopen', true)::uuid),
  (0::smallint, 10.00::numeric),
  'ceza 0 → net = doğru'
);

-- 9. Silme RLS ile: alt satırlar cascade. --------------------------------------------------------
select is(
  tests.row_count($$delete from public.mock_exam_results where id = current_setting('tests.result_nopen', true)::uuid returning 1$$),
  1::bigint,
  'öğrenci kendi sonucunu siler'
);
select is(
  (select count(*) from public.mock_exam_subject_results where result_id = current_setting('tests.result_nopen', true)::uuid),
  0::bigint,
  'ders satırları cascade silindi'
);

select * from finish();
rollback;
