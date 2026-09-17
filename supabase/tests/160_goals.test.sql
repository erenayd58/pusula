-- goals RLS (03 §5.3): koç/owner S I U D; öğrenci ve veli yalnızca S; anon yok.
-- Dönem başına tek aktif hedef (kısmi tekil indeks).
begin;
select plan(15);
select tests.seed_fixture();
select tests.seed_templates();

-- 3. Koç X kendi öğrencisine hedef koyar.
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.goals (id, student_id, created_by, period, target_value)
    values (tests.id('goal_a_daily'), tests.id('student_a'), tests.id('coach_x'), 'daily', 60)$$,
  'koç X öğrencisi A için günlük hedef ekler'
);
select lives_ok(
  $$insert into public.goals (id, student_id, created_by, period, target_value)
    values (tests.id('goal_a_weekly'), tests.id('student_a'), tests.id('coach_x'), 'weekly', 300)$$,
  'koç X öğrencisi A için haftalık hedef ekler'
);
select throws_ok(
  $$insert into public.goals (student_id, created_by, period, target_value)
    values (tests.id('student_a'), tests.id('coach_x'), 'weekly', 400)$$,
  '23505', null,
  'dönem başına ikinci aktif hedef reddedilir'
);
select is(
  tests.row_count($$update public.goals set target_value = 80 where id = tests.id('goal_a_daily') returning 1$$),
  1::bigint,
  'koç X hedefi günceller'
);
select throws_ok(
  $$insert into public.goals (student_id, created_by, period, target_value)
    values (tests.id('student_b'), tests.id('coach_x'), 'daily', 60)$$,
  '42501', null,
  'koç X başka koçun öğrencisi B için hedef ekleyemez'
);
select throws_ok(
  $$insert into public.goals (student_id, created_by, period, target_value)
    values (tests.id('student_c'), tests.id('coach_y'), 'daily', 60)$$,
  '42501', null,
  'created_by başkası olamaz'
);
select is(
  (select weekly_target from public.v_coach_student_overview where student_id = tests.id('student_a')),
  300::numeric,
  'v_coach_student_overview aktif haftalık hedefi verir'
);
select tests.authenticate_as('coach_y');
select is((select count(*) from public.goals), 0::bigint, 'koç Y öğrenci A''nın hedefini göremez');

-- Owner kendi kurumunda hedef yazar.
select tests.authenticate_as('owner_a');
select lives_ok(
  $$insert into public.goals (student_id, created_by, period, target_value)
    values (tests.id('student_b'), tests.id('owner_a'), 'daily', 40)$$,
  'owner A kurumundaki öğrenci B için hedef ekler'
);

-- 1-2. Öğrenci A kendi hedefini görür ama yazamaz; B'ninkini göremez.
select tests.authenticate_as('student_a');
select is((select count(*) from public.goals), 2::bigint, 'öğrenci A kendi hedeflerini görür (B''ninkini değil)');
select throws_ok(
  $$insert into public.goals (student_id, created_by, period, target_value)
    values (tests.id('student_a'), tests.id('student_a'), 'daily', 10)$$,
  '42501', null,
  'öğrenci hedef ekleyemez'
);
select is(
  tests.row_count($$update public.goals set target_value = 1 where id = tests.id('goal_a_daily') returning 1$$),
  0::bigint,
  'öğrenci hedefi değiştiremez'
);
select is(
  tests.row_count($$delete from public.goals where id = tests.id('goal_a_daily') returning 1$$),
  0::bigint,
  'öğrenci hedefi silemez'
);

-- 4. Veli çocuğunun hedefini görür.
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.goals), 2::bigint, 'veli P2 çocuğunun hedeflerini görür');

-- 5. anon.
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.goals$$, '42501', null, 'anon goals tablosunu okuyamaz');

select * from finish();
rollback;
