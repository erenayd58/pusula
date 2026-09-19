-- Kaynaklar (faz7a_resources / faz7a_resource_rpcs_views; 11 §1.2, §1.5).
-- 3 tablo 5 senaryo: kurum kataloğunu kurum içi herkes okur, başka kurum 0; özel kaynak: öğrenci A kendi
-- özelini görür/düzenler, B görmez (0 satır), A student_id'yi boşaltamaz (with check), koç X A'nın
-- özelini görür ve "Katalogda tut" yapar, koç Y göremez; öğrenci katalog kitabını kendine atar, koçun
-- atamasını silemez (0 satır), koç siler; veli çocuğunun atamasını ve katalog kitabını görür; anon 42501.
-- RPC: create_resource (öğrenci → özel + atama; koç → katalog; başka şablon 22023; geçersiz konu 22023 ve
-- atomik; 401 test 22023), move_resource_section sıralama ve yetki; complete_plan_item(p_log.section_id)
-- kaydı iki bağla açar; görünümler RLS + done_at / percent / open_plan_item_id (taslak sayılmaz);
-- kaynak silinince question_logs.section_id set null.
begin;
select plan(51);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Koç X kurum kataloğuna kitap + testler yazar (RPC). ------------------------------------------
select tests.authenticate_as('coach_x');
select lives_ok(
  $$select set_config('tests.res_cat', public.create_resource(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'subject_id', tests.id('subj_org_a'),
                         'type', 'question_bank', 'title', 'Katalog Mat SB', 'publisher', 'Test Yayınları', 'publish_year', 2026),
      jsonb_build_array(
        jsonb_build_object('title', 'Test 1', 'topic_id', tests.id('topic_org_a_1'), 'question_count', 20, 'page_start', 10, 'page_end', 13),
        jsonb_build_object('title', 'Test 2', 'topic_id', tests.id('topic_org_a_1'), 'question_count', 20),
        jsonb_build_object('title', 'Test 3', 'question_count', 15)
      )
    )::text, true)$$,
  'koç X katalog kitabı ve 3 testi tek çağrıda yazar'
);
select is(
  (select student_id is null and created_by = tests.id('coach_x') and organization_id = tests.id('org_a')
   from public.resources where id = current_setting('tests.res_cat', true)::uuid),
  true,
  'katalog kitabı: student_id boş, created_by koç, kurum A'
);
select results_eq(
  $$select title, sort_order from public.resource_sections
    where resource_id = current_setting('tests.res_cat', true)::uuid order by sort_order$$,
  $$values ('Test 1', 0::smallint), ('Test 2', 1::smallint), ('Test 3', 2::smallint)$$,
  'testler dizi sırasıyla numaralanır'
);
select is(
  (select count(*) from public.student_resources where resource_id = current_setting('tests.res_cat', true)::uuid),
  0::bigint,
  'koç çağrısında kendine atama yok'
);
select throws_ok(
  $$select public.create_resource(
      jsonb_build_object('template_id', tests.id('tpl_org_b'), 'title', 'Başka şablon'), '[]'::jsonb)$$,
  '22023', null,
  'koç X başka kurumun şablonuna kaynak yazamaz (invalid_template)'
);
select throws_ok(
  $$select public.create_resource(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'subject_id', tests.id('subj_org_a'), 'title', 'Yanlış konu'),
      jsonb_build_array(jsonb_build_object('title', 'Test 1', 'topic_id', tests.id('topic_org_b_1'))))$$,
  '22023', null,
  'başka şablonun konusu → invalid_topic'
);
select is((select count(*) from public.resources where title = 'Yanlış konu'), 0::bigint, 'hatalı çağrı atomik: kitap yazılmadı');
select throws_ok(
  $$select public.create_resource(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'title', 'Çok test'),
      (select jsonb_agg(jsonb_build_object('title', 'T' || g)) from generate_series(1, 401) g))$$,
  '22023', null,
  '401 test → too_many_sections'
);

-- 2. Atama: koç X öğrenci A ve C'ye atar; öğrenci B'ye (koç Y'nin) atayamaz. --------------------
insert into public.student_resources (student_id, resource_id, assigned_by)
values
  (tests.id('student_a'), current_setting('tests.res_cat', true)::uuid, tests.id('coach_x')),
  (tests.id('student_c'), current_setting('tests.res_cat', true)::uuid, tests.id('coach_x'));
select throws_ok(
  $$insert into public.student_resources (student_id, resource_id, assigned_by)
    values (tests.id('student_b'), current_setting('tests.res_cat', true)::uuid, tests.id('coach_x'))$$,
  '42501', null,
  'koç X başka koçun öğrencisine atayamaz'
);
select is(
  tests.row_count($$update public.resource_sections set question_count = 25
    where title = 'Test 3' and resource_id = current_setting('tests.res_cat', true)::uuid returning 1$$),
  1::bigint,
  'koç X katalog testini günceller'
);

-- 3. Öğrenci A: kataloğu okur, özel kaynak ekler (kendine atanır), katalogdan kendine alır. -------
select tests.authenticate_as('student_a');
select is((select count(*) from public.resources), 1::bigint, 'öğrenci A kurum kataloğunu okur');
select lives_ok(
  $$select set_config('tests.res_priv', public.create_resource(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'subject_id', tests.id('subj_org_a'), 'title', 'Benim Fasikülüm', 'type', 'booklet'),
      jsonb_build_array(jsonb_build_object('title', 'Test 1', 'question_count', 10), jsonb_build_object('title', 'Test 2', 'question_count', 10))
    )::text, true)$$,
  'öğrenci A özel kaynak ekler'
);
select is(
  (select student_id = tests.id('student_a') and created_by = tests.id('student_a')
   from public.resources where id = current_setting('tests.res_priv', true)::uuid),
  true,
  'özel kaynak: student_id ve created_by öğrenci'
);
select is(
  (select count(*) from public.student_resources
   where student_id = tests.id('student_a') and resource_id = current_setting('tests.res_priv', true)::uuid),
  1::bigint,
  'özel kaynak öğrenciye otomatik atandı'
);
select throws_ok(
  $$select public.create_resource(jsonb_build_object('template_id', tests.id('tpl_system'), 'title', 'Sistem şablonu'), '[]'::jsonb)$$,
  '22023', null,
  'öğrenci kendi şablonu dışına kaynak ekleyemez (invalid_template)'
);
select throws_ok(
  $$insert into public.resources (organization_id, template_id, title, created_by)
    values (tests.id('org_a'), tests.id('tpl_org_a'), 'Kataloğa yazma', tests.id('student_a'))$$,
  '42501', null,
  'öğrenci kurum kataloğuna (student_id null) yazamaz'
);
select is(
  tests.row_count($$update public.resources set title = 'Benim Fasikülüm 2'
    where id = current_setting('tests.res_priv', true)::uuid returning 1$$),
  1::bigint,
  'öğrenci A kendi özel kaynağını düzenler'
);
select throws_ok(
  $$update public.resources set student_id = null where id = current_setting('tests.res_priv', true)::uuid$$,
  '42501', null,
  'öğrenci kaynağı paylaşıma açamaz (with check)'
);
select is(
  tests.row_count($$update public.resources set title = 'x' where id = current_setting('tests.res_cat', true)::uuid returning 1$$),
  0::bigint,
  'öğrenci katalog kitabını düzenleyemez (0 satır)'
);
select is(
  tests.row_count($$insert into public.resource_sections (resource_id, title, question_count)
    values (current_setting('tests.res_priv', true)::uuid, 'Test 3', 10) returning 1$$),
  1::bigint,
  'öğrenci kendi özel kaynağına test ekler'
);
select is(
  tests.row_count($$delete from public.student_resources
    where student_id = tests.id('student_a') and resource_id = current_setting('tests.res_cat', true)::uuid returning 1$$),
  0::bigint,
  'öğrenci koçun atamasını kaldıramaz (0 satır)'
);

-- 4. Öğrenci B: A'nın özel kaynağını görmez; kataloğu görür ve kendine alır. ---------------------
select tests.authenticate_as('student_b');
select is((select count(*) from public.resources where id = current_setting('tests.res_priv', true)::uuid), 0::bigint, 'öğrenci B, A''nın özel kaynağını göremez');
select is((select count(*) from public.resource_sections where resource_id = current_setting('tests.res_priv', true)::uuid), 0::bigint, 'öğrenci B, A''nın özel testlerini göremez');
select is(
  tests.row_count($$insert into public.student_resources (student_id, resource_id, assigned_by)
    values (tests.id('student_b'), current_setting('tests.res_cat', true)::uuid, tests.id('student_b')) returning 1$$),
  1::bigint,
  'öğrenci B katalog kitabını kendine alır'
);
select throws_ok(
  $$insert into public.student_resources (student_id, resource_id, assigned_by)
    values (tests.id('student_b'), current_setting('tests.res_priv', true)::uuid, tests.id('student_b'))$$,
  '42501', null,
  'öğrenci B okuyamadığı özel kaynağı kendine alamaz'
);

-- 5. Koçlar ve veli. ------------------------------------------------------------------------------
select tests.authenticate_as('coach_x');
select is((select count(*) from public.resources where id = current_setting('tests.res_priv', true)::uuid), 1::bigint, 'koç X öğrencisi A''nın özel kaynağını görür');
select tests.authenticate_as('coach_y');
select is((select count(*) from public.resources where id = current_setting('tests.res_priv', true)::uuid), 0::bigint, 'koç Y başka koçun öğrencisinin özel kaynağını göremez');
select is((select count(*) from public.resources), 1::bigint, 'koç Y kurum kataloğunu görür');
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.resources), 2::bigint, 'veli katalog kitabını ve çocuğunun özel kaynağını görür');
select is(
  (select count(*) from public.student_resources where student_id = tests.id('student_a')),
  2::bigint,
  'veli çocuğunun atamalarını görür'
);
select is(
  tests.row_count($$update public.resources set title = 'v' where id = current_setting('tests.res_priv', true)::uuid returning 1$$),
  0::bigint,
  'veli düzenleyemez (0 satır)'
);
select tests.authenticate_as('coach_z');
select is((select count(*) from public.resources), 0::bigint, 'başka kurumun koçu hiçbir kaynağı göremez');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.resources$$, '42501', null, 'anon resources 42501');
select throws_ok($$select count(*) from public.student_resources$$, '42501', null, 'anon student_resources 42501');
select throws_ok($$select count(*) from public.v_student_resource_sections$$, '42501', null, 'anon görünüm 42501');

-- 6. move_resource_section --------------------------------------------------------------------------
select tests.authenticate_as('coach_x');
select lives_ok(
  $$select public.move_resource_section(
      (select id from public.resource_sections where title = 'Test 3' and resource_id = current_setting('tests.res_cat', true)::uuid), 'up')$$,
  'koç X Test 3''ü yukarı taşır'
);
select results_eq(
  $$select title from public.resource_sections
    where resource_id = current_setting('tests.res_cat', true)::uuid order by sort_order$$,
  $$values ('Test 1'), ('Test 3'), ('Test 2')$$,
  'sıra: Test 1, Test 3, Test 2'
);
select tests.authenticate_as('student_a');
select throws_ok(
  $$select public.move_resource_section(
      (select id from public.resource_sections where title = 'Test 1' and resource_id = current_setting('tests.res_cat', true)::uuid), 'up')$$,
  '42501', null,
  'öğrenci katalog testini taşıyamaz'
);

-- 7. Görünümler ve complete_plan_item bağı. ---------------------------------------------------------
-- Koç X: yayınlanmış planda Test 2'ye bağlı görev + taslakta Test 1'e bağlı görev.
select tests.authenticate_as('coach_x');
insert into public.weekly_plans (id, student_id, week_start, created_by, status, published_at)
values (tests.id('plan_res'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'), 'published', now());
insert into public.weekly_plans (id, student_id, week_start, created_by)
values (tests.id('plan_res_draft'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7, tests.id('coach_x'));
insert into public.plan_items (id, plan_id, day_of_week, kind, title, subject_id, topic_id, target_value, target_unit, estimated_minutes, section_id)
values
  (tests.id('item_sec'), tests.id('plan_res'), 1, 'section', 'Katalog Mat SB · Test 2 · 20 soru', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 'questions', 30,
   (select id from public.resource_sections where title = 'Test 2' and resource_id = current_setting('tests.res_cat', true)::uuid)),
  (tests.id('item_sec_draft'), tests.id('plan_res_draft'), 1, 'section', 'Katalog Mat SB · Test 1 · 20 soru', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 20, 'questions', 30,
   (select id from public.resource_sections where title = 'Test 1' and resource_id = current_setting('tests.res_cat', true)::uuid));

select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.v_student_resource_sections where student_id = tests.id('student_a')),
  6::bigint,
  'öğrenci A görünümde 3 katalog + 3 özel test satırı görür'
);
select is(
  (select open_plan_item_id from public.v_student_resource_sections
   where student_id = tests.id('student_a') and section_title = 'Test 2' and resource_id = current_setting('tests.res_cat', true)::uuid),
  tests.id('item_sec'),
  'Test 2 için yayınlanmış plandaki açık görev görünür'
);
select is(
  (select open_plan_item_id is null from public.v_student_resource_sections
   where student_id = tests.id('student_a') and section_title = 'Test 1' and resource_id = current_setting('tests.res_cat', true)::uuid),
  true,
  'taslak plandaki görev açık bağ sayılmaz'
);
select is(
  (select percent from public.v_student_resource_progress
   where student_id = tests.id('student_a') and resource_id = current_setting('tests.res_cat', true)::uuid),
  0,
  'kayıt yokken ilerleme %0'
);
select lives_ok(
  $$select public.complete_plan_item(tests.id('item_sec'), null,
      jsonb_build_object('correct', 15, 'wrong', 3, 'blank', 2))$$,
  'öğrenci A Test 2 görevini soru kaydıyla tamamlar'
);
select is(
  (select l.section_id = i.section_id and l.plan_item_id = i.id and l.source = 'plan'
   from public.question_logs l join public.plan_items i on i.id = l.plan_item_id
   where i.id = tests.id('item_sec')),
  true,
  'kayıt plan_item_id + section_id taşır, source plan'
);
select is(
  (select done_at is not null and open_plan_item_id is null from public.v_student_resource_sections
   where student_id = tests.id('student_a') and section_title = 'Test 2' and resource_id = current_setting('tests.res_cat', true)::uuid),
  true,
  'Test 2 bitti; açık plan bağı kalmadı'
);
insert into public.question_logs (student_id, subject_id, topic_id, source, section_id, total_count, correct_count, wrong_count, blank_count)
values (tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), 'resource',
  (select id from public.resource_sections where title = 'Test 2' and resource_id = current_setting('tests.res_cat', true)::uuid), 20, 20, 0, 0);
select results_eq(
  $$select sections_done, questions_done, percent from public.v_student_resource_progress
    where student_id = tests.id('student_a') and resource_id = current_setting('tests.res_cat', true)::uuid$$,
  $$values (1, 40, 33)$$,
  'aynı test iki kez çözülünce bir kez sayılır: 1/3 = %33, 40 soru'
);
select tests.authenticate_as('student_b');
select is(
  (select count(*) from public.v_student_resource_sections where student_id = tests.id('student_a')),
  0::bigint,
  'öğrenci B görünümde A''nın satırlarını göremez'
);

-- 8. "Katalogda tut" ve silme. ------------------------------------------------------------------------
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$update public.resources set student_id = null
    where id = current_setting('tests.res_priv', true)::uuid returning 1$$),
  1::bigint,
  'koç X "Katalogda tut": özel kaynak kataloğa geçer'
);
select tests.authenticate_as('student_b');
select is((select count(*) from public.resources where id = current_setting('tests.res_priv', true)::uuid), 1::bigint, 'kataloğa geçen kaynağı öğrenci B artık görür');
select tests.authenticate_as('coach_x');
delete from public.resources where id = current_setting('tests.res_cat', true)::uuid;
select is(
  (select count(*) from public.question_logs where student_id = tests.id('student_a') and section_id is not null),
  0::bigint,
  'kaynak silinince kayıtlar kalır, section_id boşalır'
);
select is(
  (select section_id is null from public.plan_items where id = tests.id('item_sec')),
  true,
  'kaynak silinince plan görevi kalır, section_id boşalır'
);

select * from finish();
rollback;
