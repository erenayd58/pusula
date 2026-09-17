-- Şema geneli koruma testleri. Katalogdan döngüyle üretilir; sonraki fazlarda
-- eklenen her tablo ve fonksiyon otomatik kapsanır.
--   * public'teki her tabloda RLS açık.
--   * anon'un public'teki hiçbir tabloda select/insert/update/delete yetkisi yok
--     (kolon düzeyi dahil).
--   * public'teki hiçbir fonksiyonda anon execute yok.
--   * private'taki hiçbir fonksiyonda anon veya PUBLIC execute yok.
--   * authenticated her tabloda TAM OLARAK beklenen yetkilere sahip (aşağıdaki matris);
--     matriste olmayan tablo testi düşürür → yeni tablo eklerken satırı da ekle.
--   * service_role her tabloda tam yetkili (admin istemcisi).
--   * public'teki her görünümde security_invoker açık; anon yetkisiz, authenticated yalnızca select.
begin;

-- Beklenen authenticated yetkileri (faz1b_table_grants, faz2_topics_schema, faz3_question_logs_goals ve faz4a_schedule ile birebir).
-- columns NULL = tablo düzeyi; dolu = sadece bu kolonlar (kolon düzeyi GRANT).
create temporary table expected_grants (
  table_name text not null,
  privilege text not null,
  allowed boolean not null,
  columns text[],
  primary key (table_name, privilege)
) on commit drop;

insert into expected_grants (table_name, privilege, allowed, columns) values
  ('organizations',   'select', true,  null),
  ('organizations',   'insert', false, null),
  ('organizations',   'update', true,  null),
  ('organizations',   'delete', false, null),
  ('profiles',        'select', true,  null),
  ('profiles',        'insert', false, null),
  ('profiles',        'update', true,  array['full_name', 'avatar_url', 'phone']),
  ('profiles',        'delete', false, null),
  ('students',        'select', true,  null),
  ('students',        'insert', false, null),
  ('students',        'update', true,  array['curriculum_template_id', 'season', 'grade', 'school_name',
                                             'class_section', 'exam_date', 'target_percentile', 'status']),
  ('students',        'delete', false, null),
  ('student_parents', 'select', true,  null),
  ('student_parents', 'insert', true,  null),
  ('student_parents', 'update', true,  null),
  ('student_parents', 'delete', true,  null),
  ('invitations',     'select', true,  null),
  ('invitations',     'insert', true,  null),
  ('invitations',     'update', true,  null),
  ('invitations',     'delete', true,  null),
  ('consents',        'select', true,  null),
  ('consents',        'insert', true,  null),
  ('consents',        'update', false, null),
  ('consents',        'delete', false, null),
  ('student_modules', 'select', true,  null),
  ('student_modules', 'insert', true,  null),
  ('student_modules', 'update', true,  null),
  ('student_modules', 'delete', true,  null),
  ('curriculum_templates',   'select', true,  null),
  ('curriculum_templates',   'insert', true,  null),
  ('curriculum_templates',   'update', true,  null),
  ('curriculum_templates',   'delete', true,  null),
  ('subjects',               'select', true,  null),
  ('subjects',               'insert', true,  null),
  ('subjects',               'update', true,  null),
  ('subjects',               'delete', true,  null),
  ('topics',                 'select', true,  null),
  ('topics',                 'insert', true,  null),
  ('topics',                 'update', true,  null),
  ('topics',                 'delete', true,  null),
  ('student_topic_progress', 'select', true,  null),
  ('student_topic_progress', 'insert', true,  null),
  ('student_topic_progress', 'update', true,  null),
  ('student_topic_progress', 'delete', false, null),
  ('question_logs',          'select', true,  null),
  ('question_logs',          'insert', true,  null),
  ('question_logs',          'update', true,  null),
  ('question_logs',          'delete', true,  null),
  ('goals',                  'select', true,  null),
  ('goals',                  'insert', true,  null),
  ('goals',                  'update', true,  null),
  ('goals',                  'delete', true,  null),
  ('busy_slots',             'select', true,  null),
  ('busy_slots',             'insert', true,  null),
  ('busy_slots',             'update', true,  null),
  ('busy_slots',             'delete', true,  null),
  ('schedule_exceptions',    'select', true,  null),
  ('schedule_exceptions',    'insert', true,  null),
  ('schedule_exceptions',    'update', true,  null),
  ('schedule_exceptions',    'delete', true,  null);

select plan((
    (select count(*) from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')) * 11
  + (select count(*) from expected_grants where columns is not null)
  + (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace)
  + (select count(*) from pg_proc p where p.pronamespace = 'private'::regnamespace) * 2
  + (select count(*) from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind = 'v') * 3
  + 1
)::int);

-- En az bir tablo var (aksi halde döngüler boş geçer ve test anlamsızlaşır).
select ok(
  (select count(*) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')) > 0,
  'public şemasında en az bir tablo var'
);

-- Tablolar ------------------------------------------------------------------------
select ok(c.relrowsecurity, format('RLS açık: public.%I', c.relname))
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname;

-- select/insert/update kolon düzeyinde de verilebilir → has_any_column_privilege;
-- delete sadece tablo düzeyindedir → has_table_privilege.
select ok(
  not has_any_column_privilege('anon', c.oid, priv.name),
  format('anon %s yetkisi yok: public.%I', priv.name, c.relname)
)
from pg_class c
cross join (values ('select'), ('insert'), ('update')) as priv (name)
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname, priv.name;

select ok(
  not has_table_privilege('anon', c.oid, 'delete'),
  format('anon delete yetkisi yok: public.%I', c.relname)
)
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname;

-- Görünümler (Faz 3+): security_invoker açık, anon yetkisiz, authenticated yalnızca select ---
select ok(
  coalesce(c.reloptions::text[] @> array['security_invoker=true'], false)
    or coalesce(c.reloptions::text[] @> array['security_invoker=on'], false),
  format('security_invoker açık: public.%I', c.relname)
)
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
order by c.relname;

select ok(
  not has_any_column_privilege('anon', c.oid, 'select'),
  format('anon select yetkisi yok (görünüm): public.%I', c.relname)
)
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
order by c.relname;

select ok(
  has_table_privilege('authenticated', c.oid, 'select')
    and not has_any_column_privilege('authenticated', c.oid, 'insert')
    and not has_any_column_privilege('authenticated', c.oid, 'update')
    and not has_table_privilege('authenticated', c.oid, 'delete'),
  format('authenticated yalnızca select (görünüm): public.%I', c.relname)
)
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
order by c.relname;

-- authenticated: tam olarak beklenen yetkiler -----------------------------------------
-- Her tablo matriste olmalı (1 test/tablo).
select ok(
  (select count(*) from expected_grants e where e.table_name = c.relname) = 4,
  format('yetki matrisinde tanımlı: public.%I (4 satır)', c.relname)
)
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname;

-- 4 test/tablo: beklenen izin varsa var, yoksa hiçbir kolonda bile yok.
select ok(
  case
    when e.allowed and e.columns is null then has_table_privilege('authenticated', c.oid, e.privilege)
    when e.allowed then has_any_column_privilege('authenticated', c.oid, e.privilege)
    when e.privilege = 'delete' then not has_table_privilege('authenticated', c.oid, 'delete')
    else not has_any_column_privilege('authenticated', c.oid, e.privilege)
  end,
  format('authenticated %s %s: public.%I', e.privilege, case when e.allowed then 'var' else 'yok' end, c.relname)
)
from pg_class c
join expected_grants e on e.table_name = c.relname
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname, e.privilege;

-- Kolon düzeyi kısıt: listedeki her kolonda var, listede olmayan hiçbir kolonda yok (1 test/satır).
select ok(
  not has_table_privilege('authenticated', c.oid, e.privilege)
  and not exists (
    select 1 from pg_attribute a
    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      and a.attname = any (e.columns)
      and not has_column_privilege('authenticated', c.oid, a.attname, e.privilege)
  )
  and not exists (
    select 1 from pg_attribute a
    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      and not (a.attname = any (e.columns))
      and has_column_privilege('authenticated', c.oid, a.attname, e.privilege)
  ),
  format('authenticated %s sadece şu kolonlarda: public.%I (%s)', e.privilege, c.relname, array_to_string(e.columns, ', '))
)
from pg_class c
join expected_grants e on e.table_name = c.relname and e.columns is not null
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname, e.privilege;

-- service_role: her tabloda tam yetki (1 test/tablo).
select ok(
  has_table_privilege('service_role', c.oid, 'select')
  and has_table_privilege('service_role', c.oid, 'insert')
  and has_table_privilege('service_role', c.oid, 'update')
  and has_table_privilege('service_role', c.oid, 'delete'),
  format('service_role tam yetkili: public.%I', c.relname)
)
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by c.relname;

-- public fonksiyonları ------------------------------------------------------------
select ok(
  not has_function_privilege('anon', p.oid, 'execute'),
  format('anon execute yok: %s', p.oid::regprocedure)
)
from pg_proc p
where p.pronamespace = 'public'::regnamespace
order by p.oid;

-- private fonksiyonları -----------------------------------------------------------
select ok(
  not has_function_privilege('anon', p.oid, 'execute'),
  format('anon execute yok: %s', p.oid::regprocedure)
)
from pg_proc p
where p.pronamespace = 'private'::regnamespace
order by p.oid;

-- proacl NULL ise yerleşik varsayılan geçerlidir (PUBLIC execute); grantee 0 = PUBLIC.
select ok(
  p.proacl is not null
  and not exists (
    select 1 from aclexplode(p.proacl) a
    where a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ),
  format('PUBLIC execute yok: %s', p.oid::regprocedure)
)
from pg_proc p
where p.pronamespace = 'private'::regnamespace
order by p.oid;

select * from finish();
rollback;
