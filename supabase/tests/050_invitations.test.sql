-- invitations RLS (03-veri-modeli.md Bölüm 5.3 / 5.4).
-- Öğrenci ve veli hiç görmez. Koç: kendi oluşturduğu davetler (S I D); veli daveti
-- sadece kendi öğrencisi için; koç daveti sadece owner. Owner: kurumdaki tümü.
begin;
select plan(19);
select tests.seed_fixture();

-- Hazırlık (postgres): iki koç daveti ve bir owner daveti, bir de kurum B daveti.
insert into public.invitations (id, organization_id, code, role, student_id, created_by, expires_at) values
  (tests.id('inv_x'), tests.id('org_a'), 'INVX0001', 'parent', tests.id('student_a'), tests.id('coach_x'), now() + interval '7 days'),
  (tests.id('inv_y'), tests.id('org_a'), 'INVY0001', 'parent', tests.id('student_b'), tests.id('coach_y'), now() + interval '7 days'),
  (tests.id('inv_o'), tests.id('org_a'), 'INVO0001', 'coach',  null,                  tests.id('owner_a'), now() + interval '7 days'),
  (tests.id('inv_z'), tests.id('org_b'), 'INVZ0001', 'parent', tests.id('student_z'), tests.id('coach_z'), now() + interval '7 days');

-- 1-2. Öğrenci hiçbir daveti göremez, ekleyemez.
select tests.authenticate_as('student_a');
select is(
  (select count(*) from public.invitations), 0::bigint,
  'öğrenci hiçbir daveti göremez'
);
select throws_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'STUD0001', 'parent', tests.id('student_a'), tests.id('student_a'), now() + interval '1 day')$$,
  '42501', null,
  'öğrenci davet oluşturamaz'
);

-- 3. Koç kendi davetini görür, başka koçunkini görmez; kurallara uygun ekler/siler.
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from public.invitations), 1::bigint,
  'koç X sadece kendi oluşturduğu daveti görür'
);
select is(
  (select id from public.invitations), tests.id('inv_x'),
  'koç X''in gördüğü davet kendi davetidir'
);
select lives_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'COAX0002', 'parent', tests.id('student_a'), tests.id('coach_x'), now() + interval '1 day')$$,
  'koç X kendi öğrencisi için veli daveti oluşturur'
);
select throws_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'COAX0003', 'parent', tests.id('student_b'), tests.id('coach_x'), now() + interval '1 day')$$,
  '42501', null,
  'koç X başkasının öğrencisi için veli daveti oluşturamaz'
);
select throws_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'COAX0004', 'coach', null, tests.id('coach_x'), now() + interval '1 day')$$,
  '42501', null,
  'koç role=coach daveti oluşturamaz (sadece owner)'
);
select throws_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'COAX0005', 'parent', tests.id('student_a'), tests.id('coach_y'), now() + interval '1 day')$$,
  '42501', null,
  'koç başkasının adına (created_by) davet oluşturamaz'
);
select is(
  tests.row_count($$update public.invitations set expires_at = now() where id = tests.id('inv_x') returning 1$$),
  0::bigint,
  'koç daveti güncelleyemez (UPDATE politikası yok)'
);
select is(
  tests.row_count($$delete from public.invitations where id = tests.id('inv_y') returning 1$$),
  0::bigint,
  'koç X başka koçun davetini silemez'
);
select is(
  tests.row_count($$delete from public.invitations where id = tests.id('inv_x') returning 1$$),
  1::bigint,
  'koç X kendi davetini siler'
);

-- 4. Veli hiçbir daveti göremez, ekleyemez.
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from public.invitations), 0::bigint,
  'veli hiçbir daveti göremez'
);
select throws_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'PAR00001', 'parent', tests.id('student_a'), tests.id('parent_p1'), now() + interval '1 day')$$,
  '42501', null,
  'veli davet oluşturamaz'
);

-- Owner kurumdaki tüm davetleri görür, koç daveti oluşturur, günceller, siler.
select tests.authenticate_as('owner_a');
select is(
  (select count(*) from public.invitations), 3::bigint,
  'owner A kurumdaki 3 daveti görür (inv_y, inv_o, koç X''in yenisi)'
);
select is(
  (select count(*) from public.invitations where id = tests.id('inv_z')), 0::bigint,
  'owner A kurum B''nin davetini göremez'
);
select lives_ok(
  $$insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
    values (tests.id('org_a'), 'OWNR0002', 'coach', null, tests.id('owner_a'), now() + interval '1 day')$$,
  'owner koç daveti oluşturur'
);
select is(
  tests.row_count($$update public.invitations set expires_at = now() where id = tests.id('inv_y') returning 1$$),
  1::bigint,
  'owner kurumdaki bir daveti günceller'
);
select is(
  tests.row_count($$delete from public.invitations where id = tests.id('inv_y') returning 1$$),
  1::bigint,
  'owner kurumdaki bir daveti siler'
);

-- 5. anon hiçbir şey göremez.
select tests.authenticate_as_anon();
select throws_ok(
  $$select count(*) from public.invitations$$,
  '42501', null,
  'anon invitations tablosunu okuyamaz'
);

select * from finish();
rollback;
