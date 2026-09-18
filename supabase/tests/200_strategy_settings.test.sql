-- Kurum ayarı `strategy` anahtarı (faz5a_strategy_settings; 09 §1.2): varsayılanlar
-- (`periods` boş, sayılar) ve "mevcut değer kazanır" (defaults || settings).
begin;
select plan(8);
select tests.seed_fixture();

-- 1. Yeni kurum kolon varsayılanından strategy anahtarını alır.
select tests.authenticate_as('owner_a');
select is(
  (select jsonb_typeof(settings #> '{strategy,periods}') from public.organizations where id = tests.id('org_a')),
  'array',
  'strategy.periods dizi'
);
select is(
  (select jsonb_array_length(settings #> '{strategy,periods}') from public.organizations where id = tests.id('org_a')),
  0,
  'strategy.periods varsayılanı boş (karar B3)'
);
select is(
  (select (settings #>> '{strategy,proximity_days}')::int from public.organizations where id = tests.id('org_a')),
  120,
  'proximity_days 120'
);
select is(
  (select (settings #>> '{strategy,school_lag_weeks}')::int from public.organizations where id = tests.id('org_a')),
  2,
  'school_lag_weeks 2'
);
select is(
  (select (
     (settings #>> '{strategy,topic_minutes_default}')::int,
     (settings #>> '{strategy,pace_window_days}')::int,
     (settings #>> '{strategy,topics_finish_weeks_before_exam}')::int
   ) from public.organizations where id = tests.id('org_a')),
  (90, 28, 8),
  'topic_minutes_default 90, pace_window_days 28, topics_finish_weeks_before_exam 8'
);

-- 2. Mevcut değer kazanır: migration `defaults || settings` kalıbı.
select tests.clear_authentication();
select is(
  ((private.default_org_settings() || '{"strategy": {"proximity_days": 90}}'::jsonb) #>> '{strategy,proximity_days}')::int,
  90,
  'mevcut strategy değeri varsayılanı ezer'
);
select is(
  ((private.default_org_settings() || '{"alerts": {"stale_days": 60}}'::jsonb) #>> '{strategy,school_lag_weeks}')::int,
  2,
  'başka anahtar doluyken strategy varsayılanı yine gelir'
);

-- 3. Owner dönemleri yazar (ayar formu bu JSON'u kaydeder); koç yazamaz (organizations UPDATE politikası).
select tests.authenticate_as('owner_a');
update public.organizations
  set settings = jsonb_set(settings, '{strategy,periods}',
    '[{"name": "Yeni konu öğrenme", "starts_on": "2026-09-14", "ends_on": "2027-03-20",
       "mix": {"new_topic": 50, "weak": 30, "review": 20}}]'::jsonb)
  where id = tests.id('org_a');
select tests.authenticate_as('coach_x');
select is(
  (select settings #>> '{strategy,periods,0,name}' from public.organizations where id = tests.id('org_a')),
  'Yeni konu öğrenme',
  'koç kurumunun dönemlerini okur'
);

select * from finish();
rollback;
