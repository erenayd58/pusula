-- Şema geneli koruma testleri. Katalogdan döngüyle üretilir; sonraki fazlarda
-- eklenen her tablo ve fonksiyon otomatik kapsanır.
--   * public'teki her tabloda RLS açık.
--   * anon'un public'teki hiçbir tabloda select/insert/update/delete yetkisi yok
--     (kolon düzeyi dahil).
--   * public'teki hiçbir fonksiyonda anon execute yok.
--   * private'taki hiçbir fonksiyonda anon veya PUBLIC execute yok.
begin;

select plan((
    (select count(*) from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')) * 5
  + (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace)
  + (select count(*) from pg_proc p where p.pronamespace = 'private'::regnamespace) * 2
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
