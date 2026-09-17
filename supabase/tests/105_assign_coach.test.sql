-- assign_coach: sadece owner, aynı kurum, hedef role = 'coach'.
begin;
select plan(9);
select tests.seed_fixture();

-- Koç ve veli çağıramaz --------------------------------------------------------------
select tests.authenticate_as('coach_x');
select throws_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('coach_y'))$$,
  '42501', null,
  'koç öğrencisini başka koça atayamaz'
);
select tests.authenticate_as('parent_p1');
select throws_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('coach_y'))$$,
  '42501', null,
  'veli koç atayamaz'
);
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('coach_y'))$$,
  '42501', null,
  'anon assign_coach çağıramaz'
);

-- Owner: kurum sınırı ve rol kontrolü ---------------------------------------------------
select tests.authenticate_as('owner_a');
select throws_ok(
  $$select public.assign_coach(tests.id('student_z'), tests.id('coach_x'))$$,
  '42501', null,
  'owner A başka kurumun öğrencisini (Z) atayamaz'
);
select throws_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('coach_z'))$$,
  '42501', null,
  'owner A başka kurumun koçuna (Z) atayamaz'
);
select throws_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('parent_p1'))$$,
  '42501', null,
  'hedef veli ise reddedilir'
);
select throws_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('owner_a'))$$,
  '42501', null,
  'hedef owner ise reddedilir (role = coach şart)'
);

select lives_ok(
  $$select public.assign_coach(tests.id('student_a'), tests.id('coach_y'))$$,
  'owner A öğrenci A''yı koç Y''ye atar'
);
select is(
  (select coach_id from public.students where profile_id = tests.id('student_a')),
  tests.id('coach_y'),
  'students.coach_id güncellendi'
);

select * from finish();
rollback;
