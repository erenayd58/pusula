-- Duyurular (faz8a_notes_announcements; 12 §1.1, karar E3). Koç/owner kendi kurumunda yazar, okur,
-- siler; düzenleme yok (tablo yetkisi update yok → 42501); audience check (23514); öğrenci ve veli
-- tabloyu hiç okuyamaz (politika yok → 0 satır) ve yazamaz; başka kurum 0; anon 42501.
-- Bildirim fan-out'u 270_notifications'ta.
begin;
select plan(14);
select tests.seed_fixture();

-- 1. Koç X duyuru yazar ve okur. -----------------------------------------------------------------
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.announcements (id, organization_id, author_id, title, body, audience)
    values (tests.id('ann_1'), tests.id('org_a'), tests.id('coach_x'), 'Deneme günü',
            'Cumartesi 10:00', '{"roles": ["student", "parent"], "student_ids": null}'::jsonb)$$,
  'koç X duyuru yazar'
);
select throws_ok(
  $$insert into public.announcements (organization_id, author_id, title, body, audience)
    values (tests.id('org_a'), tests.id('coach_y'), 'x', 'y', '{"roles": ["student"]}'::jsonb)$$,
  '42501', null,
  'author_id başkası → 42501'
);
select throws_ok(
  $$insert into public.announcements (organization_id, author_id, title, body, audience)
    values (tests.id('org_b'), tests.id('coach_x'), 'x', 'y', '{"roles": ["student"]}'::jsonb)$$,
  '42501', null,
  'başka kuruma yazamaz'
);
select throws_ok(
  $$insert into public.announcements (organization_id, author_id, title, body, audience)
    values (tests.id('org_a'), tests.id('coach_x'), 'x', 'y', '{"roles": []}'::jsonb)$$,
  '23514', null,
  'boş roller → 23514'
);
select throws_ok(
  $$insert into public.announcements (organization_id, author_id, title, body, audience)
    values (tests.id('org_a'), tests.id('coach_x'), 'x', 'y', '{"roles": ["coach"]}'::jsonb)$$,
  '23514', null,
  'rol yalnızca student / parent → 23514'
);
select throws_ok(
  $$insert into public.announcements (organization_id, author_id, title, body, audience)
    values (tests.id('org_a'), tests.id('coach_x'), 'x', 'y', '{"roles": ["student"], "student_ids": "abc"}'::jsonb)$$,
  '23514', null,
  'student_ids dizi değilse → 23514'
);
select is((select count(*) from public.announcements), 1::bigint, 'koç X duyuruyu okur');
select throws_ok(
  $$update public.announcements set title = 'Değişti' where id = tests.id('ann_1')$$,
  '42501', null,
  'düzenleme yok (tablo yetkisi update yok)'
);

-- 2. Diğer roller. ----------------------------------------------------------------------------------
select tests.authenticate_as('coach_y');
select is((select count(*) from public.announcements), 1::bigint, 'aynı kurumun diğer koçu okur');
select tests.authenticate_as('owner_a');
select is((select count(*) from public.announcements), 1::bigint, 'owner okur');
select tests.authenticate_as('student_a');
select is((select count(*) from public.announcements), 0::bigint, 'öğrenci tabloyu okumaz (E3)');
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.announcements), 0::bigint, 'veli tabloyu okumaz (E3)');
select tests.authenticate_as('coach_z');
select is((select count(*) from public.announcements), 0::bigint, 'başka kurum 0 satır');
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.announcements$$, '42501', null, 'anon okuyamaz');

select * from finish();
rollback;
