-- suggestion_dismissals RLS (08 §1.6, 03 §5.4): koç S I U D (kendi öğrencisi, dismissed_by
-- kendisi); owner kurumun tümü; öğrenci ve veli hiçbir şey; anon yok. Ek: unique nulls not
-- distinct (ders düzeyi öneride topic_id null tekil sayılır) ve upsert ile yenileme.
begin;
select plan(24);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Koç X öğrencisi A için konu ve ders düzeyi reddetme yazar, okur, yeniler, siler.
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.suggestion_dismissals (id, student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('dis_a1'), tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), 'review_due', current_date + 14)$$,
  'koç X konu düzeyi reddetme yazar'
);
select lives_ok(
  $$insert into public.suggestion_dismissals (id, student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('dis_a2'), tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14)$$,
  'koç X ders düzeyi reddetme yazar (topic_id null)'
);
select is((select count(*) from public.suggestion_dismissals), 2::bigint, 'koç X kendi yazdıklarını görür');
select is(
  tests.row_count($$update public.suggestion_dismissals set dismissed_until = current_date + 30 where id = tests.id('dis_a1') returning 1$$),
  1::bigint,
  'koç X reddetmeyi günceller'
);

-- Tekillik: aynı (öğrenci, ders, konu, tür) ikinci kez eklenemez; topic_id null da tekil.
select throws_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), 'review_due', current_date + 14)$$,
  '23505', null,
  'aynı konu + tür ikinci kez eklenemez'
);
select throws_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14)$$,
  '23505', null,
  'ders düzeyi (topic_id null) ikinci kez eklenemez (nulls not distinct)'
);
-- Upsert ile yenileme (uygulama böyle yazar).
select lives_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 21)
    on conflict (student_id, subject_id, topic_id, kind) do update
      set dismissed_until = excluded.dismissed_until, dismissed_by = excluded.dismissed_by$$,
  'upsert mevcut reddetmeyi yeniler'
);
select is(
  (select dismissed_until from public.suggestion_dismissals where id = tests.id('dis_a2')),
  current_date + 21,
  'yenilenen satırın tarihi güncellendi, satır sayısı artmadı'
);
select is((select count(*) from public.suggestion_dismissals), 2::bigint, 'upsert yeni satır açmadı');

-- Farklı tür aynı konu için ayrı satır.
select lives_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_a'), tests.id('coach_x'), tests.id('subj_org_a'), tests.id('topic_org_a_1'), 'forgetting_risk', current_date + 14)$$,
  'aynı konu farklı tür ayrı satır'
);

-- 2. Koç X başka koçun öğrencisi için yazamaz; dismissed_by kendisi olmalı.
select throws_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_b'), tests.id('coach_x'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14)$$,
  '42501', null,
  'koç X öğrenci B için reddetme yazamaz'
);
select throws_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_c'), tests.id('coach_y'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14)$$,
  '42501', null,
  'dismissed_by oturum sahibi olmalı'
);

-- 3. Koç Y öğrenci A satırlarını görmez, güncelleyemez.
select tests.authenticate_as('coach_y');
select is((select count(*) from public.suggestion_dismissals), 0::bigint, 'koç Y öğrenci A reddetmelerini görmez');
select is(
  tests.row_count($$update public.suggestion_dismissals set dismissed_until = current_date where id = tests.id('dis_a1') returning 1$$),
  0::bigint,
  'koç Y öğrenci A reddetmesini güncelleyemez (0 satır)'
);

-- 4. Owner kurumun tümünü görür ve yazar; başka kurumun owner'ı görmez.
select tests.authenticate_as('owner_a');
select is((select count(*) from public.suggestion_dismissals), 3::bigint, 'owner A kurumdaki tüm reddetmeleri görür');
select lives_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_b'), tests.id('owner_a'), tests.id('subj_org_a'), tests.id('topic_org_a_2'), 'not_started', current_date + 14)$$,
  'owner A öğrenci B için reddetme yazar'
);
select is(
  tests.row_count($$delete from public.suggestion_dismissals where id = tests.id('dis_a1') returning 1$$),
  1::bigint,
  'owner A reddetme siler'
);
select tests.authenticate_as('owner_b');
select is((select count(*) from public.suggestion_dismissals), 0::bigint, 'owner B başka kurumun reddetmelerini görmez');

-- 5. Öğrenci ve veli hiçbir şey görmez, yazamaz.
select tests.authenticate_as('student_a');
select is((select count(*) from public.suggestion_dismissals), 0::bigint, 'öğrenci A kendi reddetmelerini bile görmez');
select throws_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_a'), tests.id('student_a'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14)$$,
  '42501', null,
  'öğrenci reddetme yazamaz'
);
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.suggestion_dismissals), 0::bigint, 'veli çocuğunun reddetmelerini görmez');
select throws_ok(
  $$insert into public.suggestion_dismissals (student_id, dismissed_by, subject_id, topic_id, kind, dismissed_until)
    values (tests.id('student_a'), tests.id('parent_p1'), tests.id('subj_org_a'), null, 'neglected_subject', current_date + 14)$$,
  '42501', null,
  'veli reddetme yazamaz'
);

-- 6. anon.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.suggestion_dismissals$$,
  '42501', null,
  'anon tabloyu okuyamaz'
);

-- 7. Koç X silince satır kaybolur (delete politikası).
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$delete from public.suggestion_dismissals where student_id = tests.id('student_a') returning 1$$),
  2::bigint,
  'koç X öğrenci A reddetmelerini siler'
);

select * from finish();
rollback;
