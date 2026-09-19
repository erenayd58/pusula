-- Videolar (faz7b_videos / faz7b_video_rpcs_views; 11 §1.3, §1.5).
-- 4 tablo 5 senaryo (240 kalıbı): katalog listesi kurum içi herkes, özel liste öğrenci/koçu/velisi;
-- öğrenci B görmez, A paylaşıma açamaz, koç Y göremez; atama: öğrenci kendine alır, koçun atamasını
-- silemez; izleme satırları öğrenci kendi / koç öğrencisi / veli okur; anon 42501. Kısıtlar: aynı
-- YouTube listesi aynı kapsamda 23505, youtube_video_id 23514. RPC: create_playlist (öğrenci → özel +
-- atama; koç → katalog; geçersiz konu 22023 atomik), import_playlist_videos (yeniden içe aktarmada
-- topic_id korunur, çıkan video kalır, yeni eklenir), mark_video_watched (upsert, yayınlanmış plan
-- görevi tamamlanır, taslak dokunulmaz, geri alma planı geri almaz, koç öğrencisi için çağırır,
-- başka koç 42501), complete_plan_item video → watched_at; görünümler RLS + percent.
begin;
select plan(49);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Koç X katalog listesi + 3 video (RPC). --------------------------------------------------------
select tests.authenticate_as('coach_x');
select lives_ok(
  $$select set_config('tests.pl_cat', public.create_playlist(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'subject_id', tests.id('subj_org_a'),
                         'title', 'Mat Video Dersleri', 'channel_name', 'Demo Kanal', 'youtube_playlist_id', 'PLtestlist0001'),
      jsonb_build_array(
        jsonb_build_object('youtube_video_id', 'aaaaaaaaaa1', 'title', 'Konu 1 Video', 'duration_seconds', 754, 'topic_id', tests.id('topic_org_a_1')),
        jsonb_build_object('youtube_video_id', 'aaaaaaaaaa2', 'title', 'Konu 2 Video', 'duration_seconds', 600, 'topic_id', tests.id('topic_org_a_2')),
        jsonb_build_object('youtube_video_id', 'aaaaaaaaaa3', 'title', 'Bonus', 'duration_seconds', 120)
      )
    )::text, true)$$,
  'koç X katalog listesi ve 3 videoyu tek çağrıda yazar'
);
select is(
  (select student_id is null and created_by = tests.id('coach_x') and imported_at is not null
   from public.video_playlists where id = current_setting('tests.pl_cat', true)::uuid),
  true,
  'katalog listesi: student_id boş, created_by koç, imported_at dolu'
);
select results_eq(
  $$select youtube_video_id, sort_order from public.videos
    where playlist_id = current_setting('tests.pl_cat', true)::uuid order by sort_order$$,
  $$values ('aaaaaaaaaa1', 0::smallint), ('aaaaaaaaaa2', 1::smallint), ('aaaaaaaaaa3', 2::smallint)$$,
  'videolar dizi sırasıyla numaralanır'
);
select throws_ok(
  $$select public.create_playlist(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'title', 'Yanlış konu'),
      jsonb_build_array(jsonb_build_object('youtube_video_id', 'bbbbbbbbbb1', 'title', 'x', 'topic_id', tests.id('topic_org_b_1'))))$$,
  '22023', null,
  'başka şablonun konusu → invalid_topic'
);
select is((select count(*) from public.video_playlists where title = 'Yanlış konu'), 0::bigint, 'hatalı çağrı atomik');
select throws_ok(
  $$insert into public.video_playlists (organization_id, template_id, title, youtube_playlist_id, created_by)
    values (tests.id('org_a'), tests.id('tpl_org_a'), 'Kopya', 'PLtestlist0001', tests.id('coach_x'))$$,
  '23505', null,
  'aynı YouTube listesi katalogda iki kez yazılamaz'
);
select throws_ok(
  $$insert into public.videos (playlist_id, youtube_video_id, title)
    values (current_setting('tests.pl_cat', true)::uuid, 'kisa', 'x')$$,
  '23514', null,
  'youtube_video_id 11 karakter olmalı'
);
select lives_ok(
  $$insert into public.video_playlists (organization_id, template_id, title, created_by)
    values (tests.id('org_a'), tests.id('tpl_org_a'), 'Elle 1', tests.id('coach_x')),
           (tests.id('org_a'), tests.id('tpl_org_a'), 'Elle 2', tests.id('coach_x'))$$,
  'elle kurulan listeler (YouTube kimliği yok) aynı kapsamda birden fazla olabilir'
);
delete from public.video_playlists where title in ('Elle 1', 'Elle 2');

-- 2. import_playlist_videos: yenileme konuyu korur, çıkan kalır, yeni eklenir. ---------------------
select results_eq(
  $$select public.import_playlist_videos(current_setting('tests.pl_cat', true)::uuid, jsonb_build_array(
      jsonb_build_object('youtube_video_id', 'aaaaaaaaaa1', 'title', 'Konu 1 Video (yeni ad)', 'duration_seconds', 800, 'sort_order', 0),
      jsonb_build_object('youtube_video_id', 'aaaaaaaaaa4', 'title', 'Yeni Video', 'duration_seconds', 300, 'sort_order', 3)
    ))$$,
  $$values (jsonb_build_object('inserted', 1, 'updated', 1))$$,
  'yenileme: 1 yeni, 1 güncellenen'
);
select is(
  (select title = 'Konu 1 Video (yeni ad)' and duration_seconds = 800 and topic_id = tests.id('topic_org_a_1')
   from public.videos where playlist_id = current_setting('tests.pl_cat', true)::uuid and youtube_video_id = 'aaaaaaaaaa1'),
  true,
  'mevcut video: başlık/süre güncellendi, topic_id korundu'
);
select is(
  (select count(*) from public.videos where playlist_id = current_setting('tests.pl_cat', true)::uuid),
  4::bigint,
  'listeden çıkan video silinmedi (4 video)'
);

-- 3. Atama ve öğrenci A. -------------------------------------------------------------------------------
insert into public.student_playlists (student_id, playlist_id, assigned_by)
values (tests.id('student_a'), current_setting('tests.pl_cat', true)::uuid, tests.id('coach_x'));
select throws_ok(
  $$insert into public.student_playlists (student_id, playlist_id, assigned_by)
    values (tests.id('student_b'), current_setting('tests.pl_cat', true)::uuid, tests.id('coach_x'))$$,
  '42501', null,
  'koç X başka koçun öğrencisine liste atayamaz'
);

select tests.authenticate_as('student_a');
select is((select count(*) from public.video_playlists), 1::bigint, 'öğrenci A kurum kataloğunu okur');
select lives_ok(
  $$select set_config('tests.pl_priv', public.create_playlist(
      jsonb_build_object('template_id', tests.id('tpl_org_a'), 'title', 'Benim Listem'),
      jsonb_build_array(jsonb_build_object('youtube_video_id', 'ccccccccccc', 'title', 'Kendi videom'))
    )::text, true)$$,
  'öğrenci A özel (elle) liste ekler'
);
select is(
  (select student_id = tests.id('student_a') and youtube_playlist_id is null and imported_at is null
   from public.video_playlists where id = current_setting('tests.pl_priv', true)::uuid),
  true,
  'özel liste: student_id öğrenci, YouTube kimliği yok'
);
select is(
  (select count(*) from public.student_playlists
   where student_id = tests.id('student_a') and playlist_id = current_setting('tests.pl_priv', true)::uuid),
  1::bigint,
  'özel liste öğrenciye otomatik atandı'
);
select throws_ok(
  $$update public.video_playlists set student_id = null where id = current_setting('tests.pl_priv', true)::uuid$$,
  '42501', null,
  'öğrenci listeyi paylaşıma açamaz'
);
select is(
  tests.row_count($$delete from public.student_playlists
    where student_id = tests.id('student_a') and playlist_id = current_setting('tests.pl_cat', true)::uuid returning 1$$),
  0::bigint,
  'öğrenci koçun atamasını kaldıramaz (0 satır)'
);
select is(
  (select count(*) from public.v_student_playlist_videos where student_id = tests.id('student_a')),
  5::bigint,
  'görünüm: 4 katalog + 1 özel video'
);
select is(
  (select percent from public.v_student_playlist_progress
   where student_id = tests.id('student_a') and playlist_id = current_setting('tests.pl_cat', true)::uuid),
  0,
  'izleme yokken %0'
);

-- 4. Öğrenci B, koç Y, veli, başka kurum, anon. ---------------------------------------------------------
select tests.authenticate_as('student_b');
select is((select count(*) from public.video_playlists where id = current_setting('tests.pl_priv', true)::uuid), 0::bigint, 'öğrenci B, A''nın özel listesini göremez');
select is((select count(*) from public.videos where playlist_id = current_setting('tests.pl_priv', true)::uuid), 0::bigint, 'öğrenci B, A''nın özel videolarını göremez');
select is(
  tests.row_count($$insert into public.student_playlists (student_id, playlist_id, assigned_by)
    values (tests.id('student_b'), current_setting('tests.pl_cat', true)::uuid, tests.id('student_b')) returning 1$$),
  1::bigint,
  'öğrenci B katalog listesini kendine alır'
);
select tests.authenticate_as('coach_y');
select is((select count(*) from public.video_playlists where id = current_setting('tests.pl_priv', true)::uuid), 0::bigint, 'koç Y başka koçun öğrencisinin özel listesini göremez');
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.video_playlists), 2::bigint, 'veli katalog ve çocuğunun özel listesini görür');
select tests.authenticate_as('coach_z');
select is((select count(*) from public.video_playlists), 0::bigint, 'başka kurumun koçu hiçbir listeyi göremez');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.video_playlists$$, '42501', null, 'anon video_playlists 42501');
select throws_ok($$select count(*) from public.student_video_progress$$, '42501', null, 'anon progress 42501');
select throws_ok($$select count(*) from public.v_student_playlist_videos$$, '42501', null, 'anon görünüm 42501');

-- 5. mark_video_watched ve plan bağı. ------------------------------------------------------------------
select tests.authenticate_as('coach_x');
insert into public.weekly_plans (id, student_id, week_start, created_by, status, published_at)
values (tests.id('plan_vid'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'), 'published', now());
insert into public.weekly_plans (id, student_id, week_start, created_by)
values (tests.id('plan_vid_draft'), tests.id('student_a'),
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 7, tests.id('coach_x'));
insert into public.plan_items (id, plan_id, day_of_week, kind, title, subject_id, topic_id, target_value, target_unit, estimated_minutes, video_id)
values
  (tests.id('item_vid'), tests.id('plan_vid'), 1, 'video', 'Video: Konu 1 Video', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 13, 'minutes', 13,
   (select id from public.videos where youtube_video_id = 'aaaaaaaaaa1')),
  (tests.id('item_vid_draft'), tests.id('plan_vid_draft'), 1, 'video', 'Video: Konu 1 Video', tests.id('subj_org_a'), tests.id('topic_org_a_1'), 13, 'minutes', 13,
   (select id from public.videos where youtube_video_id = 'aaaaaaaaaa1')),
  (tests.id('item_vid2'), tests.id('plan_vid'), 2, 'video', 'Video: Konu 2 Video', tests.id('subj_org_a'), tests.id('topic_org_a_2'), 10, 'minutes', 10,
   (select id from public.videos where youtube_video_id = 'aaaaaaaaaa2'));

select tests.authenticate_as('student_a');
select is(
  (select open_plan_item_id from public.v_student_playlist_videos
   where student_id = tests.id('student_a') and youtube_video_id = 'aaaaaaaaaa1'),
  tests.id('item_vid'),
  'görünümde yayınlanmış plandaki açık görev (taslak sayılmaz)'
);
select results_eq(
  $$select public.mark_video_watched((select id from public.videos where youtube_video_id = 'aaaaaaaaaa1'), true)$$,
  $$values (jsonb_build_object('video_id', (select id from public.videos where youtube_video_id = 'aaaaaaaaaa1'), 'watched', true, 'completed_items', 1))$$,
  'öğrenci "İzledim": satır açıldı, yayınlanmış plan görevi tamamlandı (1)'
);
select is((select completed_at is not null from public.plan_items where id = tests.id('item_vid')), true, 'yayınlanmış görev tamamlandı');
select is(
  (select percent from public.v_student_playlist_progress
   where student_id = tests.id('student_a') and playlist_id = current_setting('tests.pl_cat', true)::uuid),
  25,
  '1/4 izlendi → %25'
);
select lives_ok(
  $$select public.mark_video_watched((select id from public.videos where youtube_video_id = 'aaaaaaaaaa1'), false)$$,
  'geri alma'
);
select is(
  (select watched_at is null from public.student_video_progress
   where student_id = tests.id('student_a') and video_id = (select id from public.videos where youtube_video_id = 'aaaaaaaaaa1')),
  true,
  'geri alınca watched_at boş'
);
select is((select completed_at is not null from public.plan_items where id = tests.id('item_vid')), true, 'geri alma plan görevini geri almaz');
-- Not upsert (tek tablo, RLS).
select is(
  tests.row_count($$update public.student_video_progress set note = 'önemli'
    where student_id = tests.id('student_a') and video_id = (select id from public.videos where youtube_video_id = 'aaaaaaaaaa1') returning 1$$),
  1::bigint,
  'öğrenci kendi izleme satırına not yazar'
);
-- Plan görevi tamamlanınca video izlendi (complete_plan_item, D6).
select lives_ok(
  $$select public.complete_plan_item(tests.id('item_vid2'))$$,
  'öğrenci video görevini plandan tamamlar'
);
select is(
  (select watched_at is not null from public.student_video_progress
   where student_id = tests.id('student_a') and video_id = (select id from public.videos where youtube_video_id = 'aaaaaaaaaa2')),
  true,
  'video görevi tamamlanınca izlendi işareti yazılır'
);

-- Koç öğrencisi için işaretler; başka koç 42501; öğrenci B A adına 42501.
select tests.authenticate_as('coach_x');
select is((select completed_at is null from public.plan_items where id = tests.id('item_vid_draft')), true, 'taslak görev dokunulmadı (koç görür)');
select lives_ok(
  $$select public.mark_video_watched((select id from public.videos where youtube_video_id = 'aaaaaaaaaa3'), true, tests.id('student_a'))$$,
  'koç X öğrencisi için "izlendi" yazar'
);
select tests.authenticate_as('coach_y');
select throws_ok(
  $$select public.mark_video_watched((select id from public.videos where youtube_video_id = 'aaaaaaaaaa3'), true, tests.id('student_a'))$$,
  '42501', null,
  'koç Y başka koçun öğrencisi için yazamaz'
);
select tests.authenticate_as('student_b');
select throws_ok(
  $$select public.mark_video_watched((select id from public.videos where youtube_video_id = 'aaaaaaaaaa3'), true, tests.id('student_a'))$$,
  '42501', null,
  'öğrenci B, A adına yazamaz'
);
select is(
  (select count(*) from public.student_video_progress where student_id = tests.id('student_a')),
  0::bigint,
  'öğrenci B, A''nın izleme satırlarını göremez'
);
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from public.student_video_progress where student_id = tests.id('student_a')),
  3::bigint,
  'veli çocuğunun izleme satırlarını okur (3)'
);
select is(
  tests.row_count($$update public.student_video_progress set note = 'x' where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'veli yazamaz (0 satır)'
);

-- 6. "Katalogda tut" ve silme. ------------------------------------------------------------------------------
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$update public.video_playlists set student_id = null
    where id = current_setting('tests.pl_priv', true)::uuid returning 1$$),
  1::bigint,
  'koç X "Katalogda tut": özel liste kataloğa geçer'
);
delete from public.video_playlists where id = current_setting('tests.pl_cat', true)::uuid;
select is(
  (select video_id is null from public.plan_items where id = tests.id('item_vid')),
  true,
  'liste silinince plan görevi kalır, video_id boşalır'
);
select is(
  (select count(*) from public.student_video_progress where student_id = tests.id('student_a')),
  0::bigint,
  'liste silinince izleme satırları cascade ile gider'
);

select * from finish();
rollback;
