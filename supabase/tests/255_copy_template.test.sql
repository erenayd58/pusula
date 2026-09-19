-- copy_curriculum_template (faz7b_copy_template; 11 §1.4, karar D7).
-- Owner sistem şablonunu kurumuna kopyalar: ders/konu sayıları eşit, parent_id yeni şablona işaret
-- eder, school_finish_on ve exam_date boş, based_on_id kaynak; include_catalogs ile kurum kataloğu
-- kaynak/test/liste/video sayıları eşit ve konu eşlemesi yeni şablonda; özel kaynak ve atama
-- kopyalanmaz; YouTube listesi kopyada bağlantısız. Koç 42501; başka kurumun şablonu 42501; boş ad 22023.
begin;
select plan(20);
select tests.seed_fixture();
select tests.seed_templates();

-- Kaynak şablon: sistem şablonuna alt konu, okul tarihi, sınav tarihi; kurum A kataloğu ona bağlı.
update public.curriculum_templates set exam_date = date '2027-06-13' where id = tests.id('tpl_system');
insert into public.topics (id, subject_id, parent_id, name, sort_order, school_finish_on)
values (tests.id('topic_sys_1_child'), tests.id('subj_system'), tests.id('topic_system_1'), 'Alt konu', 1, date '2026-10-05');
update public.topics set school_finish_on = date '2026-10-05' where id = tests.id('topic_system_1');

-- Öğrenci A'nın özel kaynağı (süper kullanıcı yazar; kopyalanmamalı).
insert into public.resources (id, organization_id, template_id, subject_id, student_id, title, created_by)
values (tests.id('res_copy_priv'), tests.id('org_a'), tests.id('tpl_system'), tests.id('subj_system'), tests.id('student_a'), 'Özel', tests.id('student_a'));

select tests.authenticate_as('owner_a');
-- Kurum A kataloğu (sistem şablonuna bağlı): 1 kitap 2 test (biri konulu), 1 YouTube listesi 2 video (biri konulu),
-- öğrenci A'nın özel kaynağı (kopyalanmamalı), atama (kopyalanmamalı).
insert into public.resources (id, organization_id, template_id, subject_id, title, created_by)
values (tests.id('res_copy'), tests.id('org_a'), tests.id('tpl_system'), tests.id('subj_system'), 'Kopya Kitap', tests.id('owner_a'));
insert into public.resource_sections (resource_id, topic_id, title, question_count, sort_order)
values
  (tests.id('res_copy'), tests.id('topic_system_1'), 'Test 1', 20, 0),
  (tests.id('res_copy'), null, 'Test 2', 20, 1);
insert into public.student_resources (student_id, resource_id, assigned_by)
values (tests.id('student_a'), tests.id('res_copy'), tests.id('owner_a'));
insert into public.video_playlists (id, organization_id, template_id, subject_id, title, youtube_playlist_id, created_by)
values (tests.id('pl_copy'), tests.id('org_a'), tests.id('tpl_system'), tests.id('subj_system'), 'Kopya Liste', 'PLcopylist001', tests.id('owner_a'));
insert into public.videos (playlist_id, topic_id, youtube_video_id, title, duration_seconds, sort_order)
values
  (tests.id('pl_copy'), tests.id('topic_system_2'), 'copyvideo01', 'Video 1', 600, 0),
  (tests.id('pl_copy'), null, 'copyvideo02', 'Video 2', 300, 1);

-- 1. Owner kopyalar (kataloglarla). ---------------------------------------------------------------------
select lives_ok(
  $$select set_config('tests.tpl_new', public.copy_curriculum_template(tests.id('tpl_system'), 'LGS 2028', '2027-2028', true)::text, true)$$,
  'owner sistem şablonunu kataloglarla kopyalar'
);
select is(
  (select organization_id = tests.id('org_a') and based_on_id = tests.id('tpl_system') and is_published = false
      and exam_date is null and name = 'LGS 2028' and season = '2027-2028'
   from public.curriculum_templates where id = current_setting('tests.tpl_new', true)::uuid),
  true,
  'yeni şablon: kurum A, based_on_id kaynak, yayınlanmamış, sınav tarihi boş'
);
select is(
  (select count(*) from public.subjects where template_id = current_setting('tests.tpl_new', true)::uuid),
  (select count(*) from public.subjects where template_id = tests.id('tpl_system')),
  'ders sayısı eşit'
);
select is(
  (select count(*) from public.topics t join public.subjects s on s.id = t.subject_id
   where s.template_id = current_setting('tests.tpl_new', true)::uuid),
  3::bigint,
  'konu sayısı eşit (2 ünite + 1 alt konu)'
);
select is(
  (select p.name from public.topics c
   join public.topics p on p.id = c.parent_id
   join public.subjects s on s.id = c.subject_id
   where s.template_id = current_setting('tests.tpl_new', true)::uuid and c.name = 'Alt konu'),
  (select name from public.topics where id = tests.id('topic_system_1')),
  'alt konunun parent_id yeni şablondaki üst konuya işaret eder'
);
select is(
  (select bool_and(t.school_finish_on is null) from public.topics t join public.subjects s on s.id = t.subject_id
   where s.template_id = current_setting('tests.tpl_new', true)::uuid),
  true,
  'okul takvimi kopyada boş (owner yeniden dağıtır)'
);
select is(
  (select count(*) from public.resources where template_id = current_setting('tests.tpl_new', true)::uuid),
  1::bigint,
  'kurum kataloğu kitabı kopyalandı; özel kaynak kopyalanmadı'
);
select is(
  (select student_id is null and created_by = tests.id('owner_a') and subject_id = (
     select id from public.subjects where template_id = current_setting('tests.tpl_new', true)::uuid limit 1)
   from public.resources where template_id = current_setting('tests.tpl_new', true)::uuid),
  true,
  'kopya kitap: katalog, dersi yeni şablonda'
);
select is(
  (select count(*) from public.resource_sections x join public.resources r on r.id = x.resource_id
   where r.template_id = current_setting('tests.tpl_new', true)::uuid),
  2::bigint,
  'testler kopyalandı'
);
select is(
  (select s.template_id from public.resource_sections x
   join public.resources r on r.id = x.resource_id
   join public.topics t on t.id = x.topic_id
   join public.subjects s on s.id = t.subject_id
   where r.template_id = current_setting('tests.tpl_new', true)::uuid and x.title = 'Test 1'),
  current_setting('tests.tpl_new', true)::uuid,
  'testin konu eşlemesi yeni şablondaki konuya'
);
select is(
  (select count(*) from public.student_resources sr join public.resources r on r.id = sr.resource_id
   where r.template_id = current_setting('tests.tpl_new', true)::uuid),
  0::bigint,
  'atamalar kopyalanmadı'
);
select is(
  (select count(*) from public.video_playlists where template_id = current_setting('tests.tpl_new', true)::uuid),
  1::bigint,
  'liste kopyalandı'
);
select is(
  (select youtube_playlist_id is null and imported_at is null from public.video_playlists
   where template_id = current_setting('tests.tpl_new', true)::uuid),
  true,
  'kopya liste bağlantısız (aynı YouTube listesi katalogda tek)'
);
select is(
  (select count(*) from public.videos v join public.video_playlists p on p.id = v.playlist_id
   where p.template_id = current_setting('tests.tpl_new', true)::uuid),
  2::bigint,
  'videolar kopyalandı'
);
select is(
  (select s.template_id from public.videos v
   join public.video_playlists p on p.id = v.playlist_id
   join public.topics t on t.id = v.topic_id
   join public.subjects s on s.id = t.subject_id
   where p.template_id = current_setting('tests.tpl_new', true)::uuid and v.youtube_video_id = 'copyvideo01'),
  current_setting('tests.tpl_new', true)::uuid,
  'videonun konu eşlemesi yeni şablondaki konuya'
);

-- 2. Kataloglarsız kopya; hatalar. ----------------------------------------------------------------------
select lives_ok(
  $$select set_config('tests.tpl_new2', public.copy_curriculum_template(tests.id('tpl_system'), 'LGS 2029', '2028-2029', false)::text, true)$$,
  'kataloglarsız ikinci kopya (aynı transaction, geçici tablolar yeniden kurulur)'
);
select is(
  (select count(*) from public.resources where template_id = current_setting('tests.tpl_new2', true)::uuid)
    + (select count(*) from public.video_playlists where template_id = current_setting('tests.tpl_new2', true)::uuid),
  0::bigint,
  'kataloglarsız kopyada kaynak/liste yok'
);
select throws_ok(
  $$select public.copy_curriculum_template(tests.id('tpl_system'), '  ', '2028-2029', false)$$,
  '22023', null,
  'boş ad → invalid_input'
);
select throws_ok(
  $$select public.copy_curriculum_template(tests.id('tpl_org_b'), 'Başkası', '2028-2029', false)$$,
  '42501', null,
  'başka kurumun şablonu → 42501'
);
select tests.authenticate_as('coach_x');
select throws_ok(
  $$select public.copy_curriculum_template(tests.id('tpl_system'), 'Koç', '2028-2029', false)$$,
  '42501', null,
  'koç kopyalayamaz (yalnızca owner)'
);

select * from finish();
rollback;
