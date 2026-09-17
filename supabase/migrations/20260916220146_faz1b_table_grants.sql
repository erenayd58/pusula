-- Faz 1b: tablo yetkileri AÇIKÇA verilir (03-veri-modeli.md Bölüm 5.1).
-- Supabase'in varsayılan "grant all ... to authenticated" davranışına güvenilmez:
-- önce her şey geri alınır, sonra tablo başına politikalarla birebir örtüşen
-- yetkiler verilir. Kolon düzeyi UPDATE (profiles, students) faz1a'daki gibi kalır.
-- Yeni tablolar authenticated için kapalı doğar; yetkiler kendi migration'ında yazılır
-- (090_schema_guards matrisi bunu zorlar). service_role tam yetkilidir (admin istemcisi).

-- Sıfırla ------------------------------------------------------------------------

revoke all on all tables in schema public from authenticated, service_role;

-- authenticated: politikalarla birebir -----------------------------------------

grant select, update on table public.organizations to authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url, phone) on table public.profiles to authenticated;

grant select on table public.students to authenticated;
grant update (
  curriculum_template_id,
  season,
  grade,
  school_name,
  class_section,
  exam_date,
  target_percentile,
  status
) on table public.students to authenticated;

grant select, insert, update, delete on table public.student_parents to authenticated;
grant select, insert, update, delete on table public.invitations to authenticated;
grant select, insert on table public.consents to authenticated;
grant select, insert, update, delete on table public.student_modules to authenticated;

-- service_role: tam yetki (admin istemcisi; RLS'yi atlar) -------------------------

grant all on table
  public.organizations,
  public.profiles,
  public.students,
  public.student_parents,
  public.invitations,
  public.consents,
  public.student_modules
to service_role;

-- Gelecek tablolar: authenticated kapalı doğar, service_role açık doğar.
alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
