-- Kurum ayarı `mock_exams` anahtarı (faz6a_mock_settings; 10 §1.2): varsayılanlar ve
-- "mevcut değer kazanır" (defaults || settings).
begin;
select plan(5);
select tests.seed_fixture();

-- 1. Yeni kurum kolon varsayılanından mock_exams anahtarını alır.
select tests.authenticate_as('owner_a');
select is(
  (select (
     (settings #>> '{mock_exams,recent_count}')::int,
     (settings #>> '{mock_exams,weak_min_marks}')::int,
     (settings #>> '{mock_exams,weak_min_mistakes}')::int
   ) from public.organizations where id = tests.id('org_a')),
  (3, 2, 3),
  'recent_count 3, weak_min_marks 2, weak_min_mistakes 3'
);
select is(
  (select (settings #>> '{mock_exams,gap_weight}')::numeric from public.organizations where id = tests.id('org_a')),
  0.5,
  'gap_weight 0,5'
);

-- 2. Mevcut değer kazanır: migration `defaults || settings` kalıbı (üst düzey anahtar, sığ birleştirme).
select tests.clear_authentication();
select is(
  ((private.default_org_settings() || '{"mock_exams": {"recent_count": 5, "weak_min_marks": 2, "weak_min_mistakes": 3, "gap_weight": 0.5}}'::jsonb) #>> '{mock_exams,recent_count}')::int,
  5,
  'mevcut mock_exams değeri varsayılanı ezer'
);
select is(
  ((private.default_org_settings() || '{"alerts": {"stale_days": 60}}'::jsonb) #>> '{mock_exams,recent_count}')::int,
  3,
  'başka anahtar doluyken mock_exams varsayılanı yine gelir'
);

-- 3. Koç kurumunun ayarını okur.
select tests.authenticate_as('coach_x');
select is(
  (select (settings #>> '{mock_exams,recent_count}')::int from public.organizations where id = tests.id('org_a')),
  3,
  'koç mock_exams ayarını okur'
);

select * from finish();
rollback;
