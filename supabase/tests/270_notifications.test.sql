-- Bildirimler (faz8b_notifications; 12 §1.2). RLS: her rol yalnızca kendi satırını okur ve
-- read_at'ini günceller; başka kolon 42501; insert/delete 42501; başkasının satırı 0; anon 42501.
-- private.notify: tercih kapalıysa null, dedupe penceresi. Tetikleyiciler: plan ilk yayın → öğrenci
-- (ikinci güncelleme 0); not görünürlüğüne göre fan-out; duyuru roller × student_ids × koç sınırı;
-- öğrencinin girdiği deneme → koç, koçun girdiği → 0; görev notu ve hafta değerlendirmesi → koç.
-- profiles.notification_prefs: kendi satırı güncellenir.
begin;
select plan(39);
select tests.seed_fixture();
select tests.seed_templates();
-- Yerel seed'in bildirimleri sayımları bozmasın (rollback geri getirir).
delete from public.notifications;

-- 1. private.notify: tercih ve dedupe (postgres olarak). -------------------------------------------
select isnt(
  private.notify(tests.id('student_a'), 'review_due', tests.id('student_a'), '{"count": 2}'::jsonb, null),
  null,
  'notify satır yazar ve id döner'
);
select is(
  private.notify(tests.id('student_a'), 'review_due', tests.id('student_a'), '{"count": 3}'::jsonb, interval '1 day'),
  null,
  'dedupe penceresinde aynı (alıcı, tür, öğrenci) → null'
);
select isnt(
  private.notify(tests.id('student_a'), 'review_due', null, '{}'::jsonb, interval '1 day'),
  null,
  'student_id farklı (null) → dedupe eşleşmez, yazılır'
);
update public.profiles set notification_prefs = '{"review_due": false}'::jsonb where id = tests.id('student_b');
select is(
  private.notify(tests.id('student_b'), 'review_due', tests.id('student_b'), '{}'::jsonb, null),
  null,
  'tercih kapalıysa yazılmaz'
);
select isnt(
  private.notify(tests.id('student_b'), 'weekly_summary', tests.id('student_b'), '{}'::jsonb, null),
  null,
  'başka tür açık kalır'
);
select is((select count(*) from public.notifications), 3::bigint, 'ön koşul: 3 satır (A: 2, B: 1)');

-- 2. RLS: öğrenci A kendi satırlarını okur, read_at günceller; diğerleri kapalı. ---------------------
select tests.authenticate_as('student_a');
select is((select count(*) from public.notifications), 2::bigint, 'öğrenci A yalnızca kendi 2 satırını okur');
select is(
  tests.row_count($$update public.notifications set read_at = now() where recipient_id = tests.id('student_a') returning 1$$),
  2::bigint,
  'öğrenci A okundu işaretler'
);
select throws_ok(
  $$update public.notifications set data = '{}'::jsonb where recipient_id = tests.id('student_a')$$,
  '42501', null,
  'read_at dışındaki kolon → 42501'
);
select throws_ok(
  $$insert into public.notifications (recipient_id, type) values (tests.id('student_a'), 'review_due')$$,
  '42501', null,
  'doğrudan insert yok'
);
select throws_ok(
  $$delete from public.notifications where recipient_id = tests.id('student_a')$$,
  '42501', null,
  'delete yok'
);
select is(
  tests.row_count($$update public.notifications set read_at = now() where recipient_id = tests.id('student_b') returning 1$$),
  0::bigint,
  'başkasının satırı 0'
);
select is(
  tests.row_count($$update public.profiles set notification_prefs = '{"weekly_summary": false}'::jsonb where id = tests.id('student_a') returning 1$$),
  1::bigint,
  'öğrenci kendi tercihini yazar'
);
select throws_ok(
  $$update public.profiles set notification_prefs = '[]'::jsonb where id = tests.id('student_a')$$,
  '23514', null,
  'tercih nesne olmalı → 23514'
);
select tests.authenticate_as('coach_x');
select is((select count(*) from public.notifications), 0::bigint, 'koç öğrencisinin bildirimlerini görmez');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.notifications$$, '42501', null, 'anon okuyamaz');
select tests.clear_authentication();
update public.profiles set notification_prefs = '{}'::jsonb where id in (tests.id('student_a'), tests.id('student_b'));
delete from public.notifications;

-- 3. Plan yayını → öğrenci (yalnızca ilk yayın). ------------------------------------------------------
insert into public.weekly_plans (id, student_id, week_start, created_by, status, coach_message)
values (tests.id('plan_n'), tests.id('student_a'), date '2026-09-14', tests.id('coach_x'), 'draft', 'İyi hafta');
insert into public.plan_items (id, plan_id, day_of_week, kind, title, estimated_minutes)
values
  (tests.id('item_n1'), tests.id('plan_n'), 1, 'custom', 'Görev 1', 30),
  (tests.id('item_n2'), tests.id('plan_n'), 2, 'custom', 'Görev 2', 30);
update public.weekly_plans set status = 'published', published_at = now() where id = tests.id('plan_n');
select is(
  (select count(*) from public.notifications where recipient_id = tests.id('student_a') and type = 'plan_published'),
  1::bigint,
  'plan yayınlanınca öğrenciye 1 bildirim'
);
select is(
  (select data from public.notifications where recipient_id = tests.id('student_a') and type = 'plan_published'),
  jsonb_build_object('plan_id', tests.id('plan_n'), 'week_start', '2026-09-14', 'items_count', 2, 'has_message', true),
  'plan bildirimi olguları: plan, hafta, görev sayısı, mesaj var'
);
update public.weekly_plans set coach_message = 'Düzenlendi' where id = tests.id('plan_n');
update public.weekly_plans set status = 'draft' where id = tests.id('plan_n');
update public.weekly_plans set status = 'published' where id = tests.id('plan_n');
select is(
  (select count(*) from public.notifications where type = 'plan_published'),
  2::bigint,
  'canlı düzenleme bildirmez; taslağa dönüp yeniden yayın yeni bildirim üretir'
);

-- 4. Koç notu → görünürlüğe göre. -----------------------------------------------------------------------
insert into public.coach_notes (student_id, author_id, body, visibility)
values (tests.id('student_a'), tests.id('coach_x'), 'Gizli', 'coach_only');
select is((select count(*) from public.notifications where type = 'note_added'), 0::bigint, 'coach_only not bildirmez');
insert into public.coach_notes (student_id, author_id, body, visibility)
values (tests.id('student_a'), tests.id('coach_x'), 'Öğrenciye', 'student');
select is(
  (select array_agg(recipient_id order by recipient_id) from public.notifications where type = 'note_added'),
  array[tests.id('student_a')],
  'student görünürlüğü → yalnızca öğrenci'
);
delete from public.notifications where type = 'note_added';
insert into public.coach_notes (student_id, author_id, body, visibility)
values (tests.id('student_a'), tests.id('coach_x'), 'Veliye', 'parent');
select is(
  (select count(*) from public.notifications where type = 'note_added' and recipient_id in (tests.id('parent_p1'), tests.id('parent_p2'))),
  2::bigint,
  'parent görünürlüğü → her iki veli'
);
select is(
  (select count(*) from public.notifications where type = 'note_added' and recipient_id = tests.id('student_a')),
  0::bigint,
  'parent görünürlüğünde öğrenciye gitmez'
);
delete from public.notifications where type = 'note_added';
insert into public.coach_notes (student_id, author_id, body, visibility)
values (tests.id('student_a'), tests.id('coach_x'), repeat('a', 300), 'student_and_parent');
select is((select count(*) from public.notifications where type = 'note_added'), 3::bigint, 'student_and_parent → öğrenci + 2 veli');
select is(
  (select char_length(data ->> 'excerpt') from public.notifications where type = 'note_added' and recipient_id = tests.id('student_a')),
  120,
  'alıntı 120 karakter'
);
select is(
  (select data ->> 'author_name' from public.notifications where type = 'note_added' and recipient_id = tests.id('student_a')),
  'Koç X',
  'alıntıda yazar adı'
);
delete from public.notifications;

-- 5. Duyuru fan-out. -------------------------------------------------------------------------------------
-- Koç X'in öğrencileri A ve C; B koç Y'nin. Hedef student + parent, student_ids null.
insert into public.announcements (id, organization_id, author_id, title, body, audience)
values (tests.id('ann_x'), tests.id('org_a'), tests.id('coach_x'), 'Duyuru', 'Gövde',
        '{"roles": ["student", "parent"], "student_ids": null}'::jsonb);
select is(
  (select array_agg(recipient_id order by recipient_id) from public.notifications where type = 'announcement'),
  (select array_agg(x order by x) from unnest(array[tests.id('student_a'), tests.id('student_c'), tests.id('parent_p1'), tests.id('parent_p2')]) x),
  'koç duyurusu: kendi öğrencileri (A, C) + A''nın velileri; B ve velisi dışarıda'
);
select is(
  (select data from public.notifications where type = 'announcement' and recipient_id = tests.id('parent_p1')),
  jsonb_build_object('announcement_id', tests.id('ann_x'), 'title', 'Duyuru', 'body', 'Gövde'),
  'duyuru metni bildirime kopyalanır (E3)'
);
delete from public.notifications;
-- Owner, yalnızca veliler, student_ids = [B]
insert into public.announcements (organization_id, author_id, title, body, audience)
values (tests.id('org_a'), tests.id('owner_a'), 'Veliye', 'Gövde',
        jsonb_build_object('roles', jsonb_build_array('parent'), 'student_ids', jsonb_build_array(tests.id('student_b'))));
select is(
  (select array_agg(recipient_id) from public.notifications where type = 'announcement'),
  array[tests.id('parent_p3')],
  'owner + parent + student_ids [B] → yalnızca B''nin velisi'
);
delete from public.notifications;
-- Koç X, student_ids = [B] (kendi öğrencisi değil) → kimseye gitmez
insert into public.announcements (organization_id, author_id, title, body, audience)
values (tests.id('org_a'), tests.id('coach_x'), 'x', 'y',
        jsonb_build_object('roles', jsonb_build_array('student'), 'student_ids', jsonb_build_array(tests.id('student_b'))));
select is((select count(*) from public.notifications), 0::bigint, 'koç başka koçun öğrencisini hedefleyemez');
-- Pasif öğrenci hedeflenmez
update public.students set status = 'paused' where profile_id = tests.id('student_c');
insert into public.announcements (organization_id, author_id, title, body, audience)
values (tests.id('org_a'), tests.id('coach_x'), 'x', 'y', '{"roles": ["student"]}'::jsonb);
select is(
  (select array_agg(recipient_id) from public.notifications where type = 'announcement'),
  array[tests.id('student_a')],
  'pasif öğrenci hedeflenmez'
);
update public.students set status = 'active' where profile_id = tests.id('student_c');
delete from public.notifications;

-- 6. Deneme sonucu: öğrenci girince koça, koç girince yok. -------------------------------------------------
insert into public.mock_exam_results (id, student_id, custom_title, taken_on, created_by)
values (tests.id('res_n1'), tests.id('student_a'), 'Serbest Deneme', date '2026-09-10', tests.id('student_a'));
select is(
  (select recipient_id from public.notifications where type = 'mock_result_added'),
  tests.id('coach_x'),
  'öğrencinin girdiği deneme → koç'
);
select is(
  (select data from public.notifications where type = 'mock_result_added'),
  jsonb_build_object('result_id', tests.id('res_n1'), 'taken_on', '2026-09-10', 'title', 'Serbest Deneme', 'is_branch', false),
  'deneme bildirimi olguları'
);
insert into public.mock_exam_results (student_id, custom_title, subject_id, taken_on, created_by)
values (tests.id('student_a'), 'Koç girdi', tests.id('subj_org_a'), date '2026-09-11', tests.id('coach_x'));
select is((select count(*) from public.notifications where type = 'mock_result_added'), 1::bigint, 'koçun girdiği deneme bildirmez');
delete from public.notifications;

-- 7. Öğrenci görev notu ve hafta değerlendirmesi → koç. -------------------------------------------------
update public.plan_items set student_note = 'Zor geldi' where id = tests.id('item_n1');
select is(
  (select data - 'plan_id' from public.notifications where type = 'student_note'),
  jsonb_build_object('kind', 'item', 'week_start', '2026-09-14', 'item_id', tests.id('item_n1'), 'item_title', 'Görev 1', 'excerpt', 'Zor geldi'),
  'görev notu → koça, olgularla'
);
update public.plan_items set student_note = 'Değişti' where id = tests.id('item_n1');
update public.plan_items set student_note = null where id = tests.id('item_n1');
select is((select count(*) from public.notifications where type = 'student_note'), 1::bigint, 'notun değişmesi/silinmesi bildirmez');
update public.weekly_plans set student_reflection = 'Haftam iyiydi' where id = tests.id('plan_n');
select is(
  (select recipient_id from public.notifications where type = 'student_note' and data ->> 'kind' = 'reflection'),
  tests.id('coach_x'),
  'hafta değerlendirmesi → koç'
);

-- 8. Cascade: alıcı ya da öğrenci silinince bildirim gider. --------------------------------------------------
select is((select count(*) from public.notifications where recipient_id = tests.id('coach_x')), 2::bigint, 'ön koşul: koçta 2 satır');
delete from auth.users where id = tests.id('student_a');
select is((select count(*) from public.notifications), 0::bigint, 'öğrenci silinince ona bağlı bildirimler silinir');

select * from finish();
rollback;
