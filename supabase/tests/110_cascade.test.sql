-- Öğrenci silme = auth.users satırının silinmesi (admin API). Cascade zinciri:
-- auth.users → profiles → students → student_parents, consents, invitations(student_id),
-- student_modules. Veli profili silinmez (başka çocuğu olabilir).
begin;
select plan(8);
select tests.seed_fixture();

-- Öğrenci A'ya bağlı satırlar
insert into public.consents (student_id, given_by, type, document_version)
values (tests.id('student_a'), tests.id('parent_p1'), 'explicit_consent', 'test-v1');
insert into public.invitations (organization_id, code, role, student_id, created_by, expires_at)
values (tests.id('org_a'), 'CASCADE1', 'parent', tests.id('student_a'), tests.id('coach_x'), now() + interval '7 days');
insert into public.student_modules (student_id, module_id, enabled)
values (tests.id('student_a'), 'topics', true);

select is(
  (select count(*) from public.student_parents where student_id = tests.id('student_a')),
  2::bigint,
  'ön koşul: öğrenci A''nın 2 veli bağlantısı var'
);

-- Silme (admin API auth.users'ı siler; burada doğrudan)
delete from auth.users where id = tests.id('student_a');

select is((select count(*) from public.profiles where id = tests.id('student_a')), 0::bigint, 'profil silindi');
select is((select count(*) from public.students where profile_id = tests.id('student_a')), 0::bigint, 'öğrenci satırı silindi');
select is((select count(*) from public.student_parents where student_id = tests.id('student_a')), 0::bigint, 'veli bağlantıları silindi');
select is((select count(*) from public.consents where student_id = tests.id('student_a')), 0::bigint, 'onaylar silindi');
select is((select count(*) from public.invitations where code = 'CASCADE1'), 0::bigint, 'öğrencinin davetleri silindi');
select is((select count(*) from public.student_modules where student_id = tests.id('student_a')), 0::bigint, 'modül ayarları silindi');
select is((select count(*) from public.profiles where id = tests.id('parent_p1')), 1::bigint, 'veli profili kalır');

select * from finish();
rollback;
