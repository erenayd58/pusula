-- Duman testi: pgTAP çalışıyor ve migration'lar uygulanmış.
-- Faz 1a'da gerçek RLS testleri bu klasöre eklenecek.
begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

select has_schema('public', 'public şeması mevcut');
select has_extension('pgtap', 'pgTAP eklentisi kullanılabilir');

select * from finish();
rollback;