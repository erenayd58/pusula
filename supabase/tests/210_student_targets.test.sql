-- student_subject_targets / student_topic_targets RLS (09 §1.4; 03 §5.2 kalıbı) ve
-- set_student_targets RPC: koç kendi öğrencisine yazar, başka koç 42501, öğrenci çağıramaz;
-- geçersiz konu → invalid_target ve hiçbir satır yok (atomik); yeniden üretimde payload dışı
-- satırlar silinir; students.topics_finish_by doğrudan UPDATE 42501 (kolon grant'ı yok);
-- wake_* koç yazar, check kısıtı.
begin;
select plan(26);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Koç X: RPC ile öğrenci A'ya hedef kurar.
select tests.authenticate_as('coach_x');
select is(
  public.set_student_targets(
    tests.id('student_a'), date '2027-04-19', date '2026-09-14',
    jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'questions', 1200)),
    jsonb_build_array(
      jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'target_on', '2026-10-05'),
      jsonb_build_object('topic_id', tests.id('topic_org_a_2'), 'target_on', '2026-11-02')
    )
  ),
  '{"subjects": 1, "topics": 2}'::jsonb,
  'koç X öğrenci A''ya hedef kurar (1 ders, 2 konu)'
);
select is(
  (select (topics_finish_by, target_starts_on) from public.students where profile_id = tests.id('student_a')),
  (date '2027-04-19', date '2026-09-14'),
  'students hedef kolonları RPC ile yazıldı'
);
select is(
  (select created_by from public.student_topic_targets
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  tests.id('coach_x'),
  'konu hedefinde created_by koç'
);

-- 2. Yeniden üretim: payload dışı satırlar silinir, mevcutlar güncellenir.
select is(
  public.set_student_targets(
    tests.id('student_a'), date '2027-04-19', date '2026-09-21',
    jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'questions', 900)),
    jsonb_build_array(jsonb_build_object('topic_id', tests.id('topic_org_a_2'), 'target_on', '2026-12-07'))
  ),
  '{"subjects": 1, "topics": 1}'::jsonb,
  'yeniden üretim: 1 konu'
);
select results_eq(
  $$select topic_id, target_on from public.student_topic_targets where student_id = tests.id('student_a')$$,
  $$values (tests.id('topic_org_a_2'), date '2026-12-07')$$,
  'payload dışı konu hedefi silindi, diğeri güncellendi'
);
select is(
  (select questions from public.student_subject_targets
    where student_id = tests.id('student_a') and subject_id = tests.id('subj_org_a')),
  900,
  'ders hedefi güncellendi'
);

-- 3. Atomiklik: geçersiz konu (kurum B) → invalid_target, hiçbir satır değişmez.
select throws_ok(
  $$select public.set_student_targets(
      tests.id('student_a'), date '2027-04-19', date '2026-09-21',
      jsonb_build_array(jsonb_build_object('subject_id', tests.id('subj_org_a'), 'questions', 500)),
      jsonb_build_array(jsonb_build_object('topic_id', tests.id('topic_org_b_1'), 'target_on', '2026-12-07'))
    )$$,
  '22023', 'invalid_target',
  'başka şablonun konusu → invalid_target'
);
select is(
  (select questions from public.student_subject_targets
    where student_id = tests.id('student_a') and subject_id = tests.id('subj_org_a')),
  900,
  'hatalı çağrıda ders hedefi değişmedi (atomik)'
);
select throws_ok(
  $$select public.set_student_targets(
      tests.id('student_a'), date '2026-09-01', date '2026-09-21', '[]'::jsonb, '[]'::jsonb
    )$$,
  '22023', 'invalid_dates',
  'bitiş başlangıçtan önce → invalid_dates'
);

-- 4. Tek konu düzenleme RLS ile (updateTopicTarget); koç ders hedefini doğrudan da yazar.
select is(
  tests.row_count($$update public.student_topic_targets set target_on = date '2026-12-14'
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_2') returning 1$$),
  1::bigint,
  'koç X konu hedef tarihini doğrudan günceller'
);
select lives_ok(
  $$insert into public.student_topic_targets (student_id, topic_id, target_on, created_by)
    values (tests.id('student_a'), tests.id('topic_org_a_1'), date '2026-10-12', tests.id('coach_x'))$$,
  'koç X konu hedefi ekler'
);
select throws_ok(
  $$insert into public.student_topic_targets (student_id, topic_id, target_on, created_by)
    values (tests.id('student_b'), tests.id('topic_org_a_1'), date '2026-10-12', tests.id('coach_x'))$$,
  '42501', null,
  'koç X başka koçun öğrencisi B''ye konu hedefi ekleyemez'
);
select throws_ok(
  $$insert into public.student_subject_targets (student_id, subject_id, questions)
    values (tests.id('student_b'), tests.id('subj_org_a'), 100)$$,
  '42501', null,
  'koç X öğrenci B''ye ders hedefi ekleyemez'
);
select throws_ok(
  $$select public.set_student_targets(tests.id('student_b'), date '2027-04-19', date '2026-09-21', '[]'::jsonb, '[]'::jsonb)$$,
  '42501', null,
  'koç X başka koçun öğrencisi için RPC çağıramaz'
);

-- 5. students: hedef kolonları doğrudan yazılamaz (kolon grant'ı yok); wake_* koç yazar.
select throws_ok(
  $$update public.students set topics_finish_by = date '2027-01-01' where profile_id = tests.id('student_a')$$,
  '42501', null,
  'topics_finish_by doğrudan UPDATE 42501'
);
select is(
  tests.row_count($$update public.students set wake_start = '07:30', wake_end = '23:00'
    where profile_id = tests.id('student_a') returning 1$$),
  1::bigint,
  'koç X uyanık aralığı yazar'
);
select throws_ok(
  $$update public.students set wake_start = '23:00', wake_end = '07:30' where profile_id = tests.id('student_a')$$,
  '23514', null,
  'wake_end > wake_start kısıtı'
);
select throws_ok(
  $$update public.students set wake_start = null, wake_end = '23:00' where profile_id = tests.id('student_a')$$,
  '23514', null,
  'uyanık aralık birlikte boş ya da dolu'
);
select is(
  tests.row_count($$update public.students set wake_start = null, wake_end = null
    where profile_id = tests.id('student_a') returning 1$$),
  1::bigint,
  'ikisi birden boş → kurum varsayılanına döner'
);

-- 6. Öğrenci A: okur, yazamaz; RPC çağıramaz.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.student_topic_targets), 2::bigint,
  'öğrenci A kendi konu hedeflerini görür'
);
select is(
  tests.row_count($$update public.student_topic_targets set target_on = date '2027-01-01'
    where student_id = tests.id('student_a') returning 1$$),
  0::bigint,
  'öğrenci konu hedefini değiştiremez (0 satır)'
);
select throws_ok(
  $$insert into public.student_subject_targets (student_id, subject_id, questions)
    values (tests.id('student_a'), tests.id('subj_org_a'), 100)$$,
  '42501', null,
  'öğrenci ders hedefi ekleyemez'
);
select throws_ok(
  $$select public.set_student_targets(tests.id('student_a'), date '2027-04-19', date '2026-09-21', '[]'::jsonb, '[]'::jsonb)$$,
  '42501', null,
  'öğrenci RPC çağıramaz'
);

-- 7. Öğrenci B başka öğrencinin hedefini göremez; veli P1 çocuğununkini okur; anon 42501.
select tests.authenticate_as('student_b');
select is((select count(*) from public.student_topic_targets), 0::bigint, 'öğrenci B öğrenci A''nın hedefini göremez');
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.student_subject_targets), 1::bigint, 'veli P1 çocuğunun ders hedefini okur');
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.student_topic_targets$$,
  '42501', null,
  'anon konu hedeflerini okuyamaz'
);

select * from finish();
rollback;
