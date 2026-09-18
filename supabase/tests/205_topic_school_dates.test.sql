-- topics.school_finish_on ve set_topic_school_dates (faz5a_topic_school_dates; 09 §1.3).
-- Koç sistem/kurum şablonunda yazar; öğrenci ve veli yazamaz (RLS 0 satır → RPC 42501);
-- başka kurumun şablonu görünmez; tek ifadede atomik (bir satır yetkisizse hiçbiri yazılmaz);
-- v_topic_alert_facts.school_finish_on dolu gelir.
begin;
select plan(15);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Koç X doğrudan ve RPC ile yazar.
select tests.authenticate_as('coach_x');
select is(
  tests.row_count($$update public.topics set school_finish_on = date '2026-10-12'
    where id = tests.id('topic_system_1') returning 1$$),
  1::bigint,
  'koç X sistem şablonunda school_finish_on yazar (karar #28)'
);
select is(
  public.set_topic_school_dates(jsonb_build_array(
    jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'on', '2026-10-19'),
    jsonb_build_object('topic_id', tests.id('topic_org_a_2'), 'on', '2026-11-02')
  )),
  2,
  'RPC iki konuya tarih yazar, güncellenen sayıyı döner'
);
select results_eq(
  $$select school_finish_on from public.topics where subject_id = tests.id('subj_org_a') order by sort_order$$,
  $$values (date '2026-10-19'), (date '2026-11-02')$$,
  'tarihler yazıldı'
);
select is(
  public.set_topic_school_dates(jsonb_build_array(
    jsonb_build_object('topic_id', tests.id('topic_org_a_2'), 'on', null)
  )),
  1,
  'RPC null ile tarihi temizler'
);
select is(
  (select school_finish_on from public.topics where id = tests.id('topic_org_a_2')),
  null::date,
  'temizlenen konunun tarihi boş'
);

-- 2. Atomiklik: payload'da görünmeyen (kurum B) konu varsa 42501 ve hiçbir satır yazılmaz.
select throws_ok(
  $$select public.set_topic_school_dates(jsonb_build_array(
      jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'on', '2027-01-04'),
      jsonb_build_object('topic_id', tests.id('topic_org_b_1'), 'on', '2027-01-04')
    ))$$,
  '42501', null,
  'koç X kurum B konusunu içeren payload ile 42501 alır'
);
select is(
  (select school_finish_on from public.topics where id = tests.id('topic_org_a_1')),
  date '2026-10-19',
  'hatalı payload''daki geçerli satır da yazılmadı (atomik)'
);
select throws_ok(
  $$select public.set_topic_school_dates('{"topic_id": "x"}'::jsonb)$$,
  '22023', null,
  'dizi olmayan payload 22023'
);

-- 3. Görünüm: öğrenci A'nın olgularında okul tarihi.
select is(
  (select school_finish_on from public.v_topic_alert_facts
    where student_id = tests.id('student_a') and topic_id = tests.id('topic_org_a_1')),
  date '2026-10-19',
  'v_topic_alert_facts.school_finish_on konudan gelir'
);

-- 4. Öğrenci: okur, yazamaz (0 satır); RPC 42501.
select tests.authenticate_as('student_a');
select is(
  (select school_finish_on from public.topics where id = tests.id('topic_org_a_1')),
  date '2026-10-19',
  'öğrenci A okul tarihini okur'
);
select is(
  tests.row_count($$update public.topics set school_finish_on = date '2026-01-05'
    where id = tests.id('topic_org_a_1') returning 1$$),
  0::bigint,
  'öğrenci doğrudan yazamaz (0 satır)'
);
select throws_ok(
  $$select public.set_topic_school_dates(jsonb_build_array(
      jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'on', '2026-01-05')
    ))$$,
  '42501', null,
  'öğrenci RPC ile yazamaz (42501)'
);

-- 5. Veli yazamaz; kurum B koçu kurum A konusunu göremez ve yazamaz; anon hiçbir şey.
select tests.authenticate_as('parent_p1');
select throws_ok(
  $$select public.set_topic_school_dates(jsonb_build_array(
      jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'on', '2026-01-05')
    ))$$,
  '42501', null,
  'veli RPC ile yazamaz (42501)'
);
select tests.authenticate_as('coach_z');
select throws_ok(
  $$select public.set_topic_school_dates(jsonb_build_array(
      jsonb_build_object('topic_id', tests.id('topic_org_a_1'), 'on', '2026-01-05')
    ))$$,
  '42501', null,
  'kurum B koçu kurum A konusuna yazamaz (42501)'
);
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.set_topic_school_dates('[]'::jsonb)$$,
  '42501', null,
  'anon RPC çağıramaz'
);

select * from finish();
rollback;
