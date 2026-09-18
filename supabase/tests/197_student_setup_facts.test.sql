-- v_student_setup_facts (faz4e): kurulum olguları — program, aktif hedef, bu haftanın yayınlanmış
-- planı, soru kaydı sayısı, hesap tarihi. Görünüm RLS (students): koç kendi öğrencisi, owner
-- kurumu, öğrenci kendini görür (uygulama yalnızca koça gösterir), anon 42501. Karar TS'te.
begin;
select plan(14);
select tests.seed_fixture();
select tests.seed_templates();

select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.v_student_setup_facts), 2::bigint,
  'koç X yalnızca kendi öğrencilerini (A, C) görür'
);
select is(
  (select has_schedule from public.v_student_setup_facts where student_id = tests.id('student_a')), false,
  'program girilmemiş'
);
select is(
  (select has_active_goal from public.v_student_setup_facts where student_id = tests.id('student_a')), false,
  'aktif hedef yok'
);
select is(
  (select has_published_plan_week from public.v_student_setup_facts where student_id = tests.id('student_a')), false,
  'bu hafta yayınlanmış plan yok'
);
select is(
  (select question_log_count from public.v_student_setup_facts where student_id = tests.id('student_a')), 0,
  'soru kaydı yok'
);

-- Olgular değişince bayraklar döner.
select lives_ok(
  $$insert into public.schedule_exceptions (student_id, on_date, title, created_by)
    values (tests.id('student_a'), date '2026-10-05', 'Yazılı', tests.id('coach_x'))$$,
  'program istisnası (tek satır yeter)'
);
select is(
  (select has_schedule from public.v_student_setup_facts where student_id = tests.id('student_a')), true,
  'program girildi'
);
select lives_ok(
  $$insert into public.goals (student_id, created_by, period, target_value)
    values (tests.id('student_a'), tests.id('coach_x'), 'daily', 30)$$,
  'günlük hedef'
);
select is(
  (select has_active_goal from public.v_student_setup_facts where student_id = tests.id('student_a')), true,
  'aktif hedef var'
);
select lives_ok(
  $$insert into public.weekly_plans (student_id, week_start, created_by, status)
    values (tests.id('student_a'), (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date, tests.id('coach_x'), 'draft')$$,
  'taslak plan'
);
select is(
  (select has_published_plan_week from public.v_student_setup_facts where student_id = tests.id('student_a')), false,
  'taslak plan yayınlanmış sayılmaz'
);
select is(
  tests.row_count($$update public.weekly_plans set status = 'published' where student_id = tests.id('student_a') returning 1$$),
  1::bigint,
  'plan yayınlandı'
);
select is(
  (select has_published_plan_week from public.v_student_setup_facts where student_id = tests.id('student_a')), true,
  'bu hafta yayınlanmış plan var'
);

select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.v_student_setup_facts$$,
  '42501', null,
  'anon görünümü okuyamaz'
);

select * from finish();
rollback;
