-- organizations RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
begin;
select plan(13);
select tests.seed_fixture();

-- 1. Öğrenci kendi kurumunu görür.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.organizations), 1::bigint,
  'öğrenci A sadece bir kurum görür'
);
select is(
  (select id from public.organizations), tests.id('org_a'),
  'öğrenci A gördüğü kurum kendi kurumudur'
);

-- 2. Öğrenci başka kurumu göremez, ekleyemez, güncelleyemez.
select is(
  (select count(*) from public.organizations where id = tests.id('org_b')), 0::bigint,
  'öğrenci A kurum B''yi göremez'
);
select throws_ok(
  $$insert into public.organizations (name, slug) values ('Yeni', 'yeni')$$,
  '42501', null,
  'öğrenci kurum ekleyemez'
);
select is(
  tests.row_count($$update public.organizations set name = 'X' where id = tests.id('org_a') returning 1$$),
  0::bigint,
  'öğrenci kurumu güncelleyemez'
);

-- 3. Koç kendi kurumunu görür, başka kurumu görmez ve güncelleyemez.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.organizations), 1::bigint,
  'koç X sadece kendi kurumunu görür'
);
select is(
  (select count(*) from public.organizations where id = tests.id('org_b')), 0::bigint,
  'koç X kurum B''yi göremez'
);
select is(
  tests.row_count($$update public.organizations set name = 'X' where id = tests.id('org_a') returning 1$$),
  0::bigint,
  'koç kurumu güncelleyemez'
);

-- 4. Veli kendi kurumunu görür (ayrıntı yetkisinden bağımsız), güncelleyemez.
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from public.organizations), 1::bigint,
  'veli P2 (can_view_details=false) kendi kurumunu görür'
);
select is(
  tests.row_count($$update public.organizations set name = 'X' where id = tests.id('org_a') returning 1$$),
  0::bigint,
  'veli kurumu güncelleyemez'
);

-- Owner kendi kurumunu günceller, başka kurumu göremez.
select tests.authenticate_as('owner_a');
select is(
  tests.row_count($$update public.organizations set name = 'Kurum A (yeni)' where id = tests.id('org_a') returning 1$$),
  1::bigint,
  'owner kendi kurumunu günceller'
);
select is(
  (select count(*) from public.organizations where id = tests.id('org_b')), 0::bigint,
  'owner A kurum B''yi göremez'
);

-- 5. anon hiçbir şey göremez (tablo yetkisi yok).
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.organizations$$,
  '42501', null,
  'anon organizations tablosunu okuyamaz'
);

select * from finish();
rollback;
