-- Koç notları (faz8a_notes_announcements; 12 §1.1). 5 senaryo + görünürlük matrisi: koç kendi
-- öğrencisine yazar/okur/günceller/siler; öğrenci yalnızca student / student_and_parent, veli
-- yalnızca parent / student_and_parent görür; coach_only yalnızca koç; öğrenci ve veli yazamaz
-- (42501); başka koç 0; owner kurumu okur; anon 42501; gövde uzunluğu check; koç silinince not kalır.
begin;
select plan(23);
select tests.seed_fixture();

-- 1. Koç X öğrenci A'ya dört görünürlükte not yazar. --------------------------------------------
select tests.authenticate_as('coach_x');
select lives_ok(
  $$insert into public.coach_notes (id, student_id, author_id, body, visibility)
    values
      (tests.id('note_coach'),  tests.id('student_a'), tests.id('coach_x'), 'Sadece bana', 'coach_only'),
      (tests.id('note_stu'),    tests.id('student_a'), tests.id('coach_x'), 'Öğrenciye', 'student'),
      (tests.id('note_par'),    tests.id('student_a'), tests.id('coach_x'), 'Veliye', 'parent'),
      (tests.id('note_both'),   tests.id('student_a'), tests.id('coach_x'), 'İkisine', 'student_and_parent')$$,
  'koç X dört görünürlükte not yazar'
);
select throws_ok(
  $$insert into public.coach_notes (student_id, author_id, body)
    values (tests.id('student_a'), tests.id('coach_y'), 'Başkası adına')$$,
  '42501', null,
  'author_id başkası → 42501'
);
select throws_ok(
  $$insert into public.coach_notes (student_id, author_id, body)
    values (tests.id('student_b'), tests.id('coach_x'), 'Başka koçun öğrencisi')$$,
  '42501', null,
  'koç X başka koçun öğrencisine yazamaz'
);
select throws_ok(
  $$insert into public.coach_notes (student_id, author_id, body)
    values (tests.id('student_a'), tests.id('coach_x'), '')$$,
  '23514', null,
  'boş gövde → 23514'
);
select is((select count(*) from public.coach_notes), 4::bigint, 'koç X dört notu da okur');
select is(
  tests.row_count($$update public.coach_notes set is_pinned = true where id = tests.id('note_par') returning 1$$),
  1::bigint,
  'koç X notu sabitler'
);
select is(
  tests.row_count($$update public.coach_notes set visibility = 'coach_only' where id = tests.id('note_stu') returning 1$$),
  1::bigint,
  'koç X görünürlüğü değiştirir'
);
select lives_ok(
  $$update public.coach_notes set visibility = 'student' where id = tests.id('note_stu')$$,
  'geri alınır'
);

-- 2. Öğrenci A: yalnızca student / student_and_parent; yazamaz. -----------------------------------
select tests.authenticate_as('student_a');
select is((select count(*) from public.coach_notes), 2::bigint, 'öğrenci A kendisine açık 2 notu görür');
select is(
  (select count(*) from public.coach_notes where visibility in ('coach_only', 'parent')),
  0::bigint,
  'öğrenci A coach_only ve parent notlarını görmez'
);
select throws_ok(
  $$insert into public.coach_notes (student_id, author_id, body)
    values (tests.id('student_a'), tests.id('student_a'), 'Öğrenci yazamaz')$$,
  '42501', null,
  'öğrenci not yazamaz'
);
select is(
  tests.row_count($$update public.coach_notes set body = 'x' where id = tests.id('note_stu') returning 1$$),
  0::bigint,
  'öğrenci notu güncelleyemez (0 satır)'
);
select is(
  tests.row_count($$delete from public.coach_notes where id = tests.id('note_stu') returning 1$$),
  0::bigint,
  'öğrenci notu silemez (0 satır)'
);

-- 3. Başka öğrenci ve başka koç 0; owner kurumu okur. ------------------------------------------------
select tests.authenticate_as('student_c');
select is((select count(*) from public.coach_notes), 0::bigint, 'başka öğrenci 0 satır');
select tests.authenticate_as('coach_y');
select is((select count(*) from public.coach_notes), 0::bigint, 'başka koç 0 satır');
select tests.authenticate_as('owner_a');
select is((select count(*) from public.coach_notes), 4::bigint, 'owner kurumun notlarını okur');
select tests.authenticate_as('coach_z');
select is((select count(*) from public.coach_notes), 0::bigint, 'başka kurumun koçu 0 satır');

-- 4. Veli: yalnızca parent / student_and_parent (can_view_details fark etmez). -------------------
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.coach_notes), 2::bigint, 'veli (detaysız) veliye açık 2 notu görür');
select is(
  (select count(*) from public.coach_notes where visibility in ('coach_only', 'student')),
  0::bigint,
  'veli coach_only ve student notlarını görmez'
);
select throws_ok(
  $$insert into public.coach_notes (student_id, author_id, body)
    values (tests.id('student_a'), tests.id('parent_p2'), 'Veli yazamaz')$$,
  '42501', null,
  'veli not yazamaz'
);
select tests.authenticate_as('parent_p3');
select is((select count(*) from public.coach_notes), 0::bigint, 'başka çocuğun velisi 0 satır');

-- 5. anon. -------------------------------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.coach_notes$$, '42501', null, 'anon okuyamaz');

-- 6. Koç silinince not kalır, author_id boşalır. -----------------------------------------------------
select tests.clear_authentication();
select tests.create_user('coach_w', 'coach', tests.id('org_a'), 'Koç W');
insert into public.coach_notes (id, student_id, author_id, body)
values (tests.id('note_w'), tests.id('student_a'), tests.id('coach_w'), 'W yazdı');
delete from auth.users where id = tests.id('coach_w');
select is(
  (select author_id is null from public.coach_notes where id = tests.id('note_w')),
  true,
  'koç silinince not kalır, author_id set null'
);

select * from finish();
rollback;
