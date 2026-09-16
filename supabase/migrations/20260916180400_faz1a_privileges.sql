-- Faz 1a: yetki sertleştirme (03-veri-modeli.md Bölüm 5.1).
-- RLS asıl güvenliktir; buradaki GRANT/REVOKE'lar ikinci katmandır:
--   * private şeması yalnızca authenticated'a açık, fonksiyonlar tek tek açılır.
--   * anon'un public tablolarında/fonksiyonlarında hiçbir yetkisi yok (şimdi ve gelecekte).
--   * profiles ve students'ta kolon düzeyi UPDATE: rol, kurum, koç gibi kolonlar API'den değişmez.

-- private şeması ---------------------------------------------------------------

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Postgres, yeni fonksiyonlara yerleşik olarak PUBLIC execute verir; kapat.
-- Not: yerleşik varsayılan şema düzeyindeki "alter default privileges ... in schema"
-- ile kaldırılamaz (şema girdileri globale eklenir); bu yüzden global ifade kullanılır.
-- postgres'in oluşturduğu her fonksiyon (hangi şemada olursa olsun) PUBLIC execute'suz doğar.
revoke execute on all functions in schema private from public, anon;
alter default privileges for role postgres revoke execute on functions from public;

-- Sadece politikalarda kullanılan yardımcılar authenticated'a açılır
-- (set_updated_at dahil değil: trigger tetiklenirken execute denetlenmez).
grant execute on function
  private.my_role(),
  private.my_org(),
  private.is_coach_of(uuid),
  private.is_parent_of(uuid, boolean),
  private.can_read_student(uuid),
  private.can_write_student(uuid),
  private.can_see_profile(uuid),
  private.is_parent_profile_in_my_org(uuid)
to authenticated;

-- public şeması: anon'a hiçbir yetki ------------------------------------------

revoke all on table
  public.organizations,
  public.profiles,
  public.students,
  public.student_parents,
  public.invitations,
  public.consents,
  public.student_modules
from anon;

-- Gelecekte postgres tarafından oluşturulan nesneler de anon'a kapalı doğsun.
-- public fonksiyonlarda authenticated execute'u fonksiyon başına açıkça verilir
-- (Supabase'in authenticated'a verdiği varsayılan execute de kaldırılır).
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- profiles: authenticated sadece full_name, avatar_url, phone güncelleyebilir.
-- role, organization_id, username API'den değiştirilemez; INSERT politikası yok
-- (Faz 1b'de secret key ile oluşturulur).

revoke update on table public.profiles from authenticated;
grant update (full_name, avatar_url, phone) on table public.profiles to authenticated;

-- students: profile_id, organization_id, coach_id API'den değiştirilemez
-- (koç ataması Faz 1b'de owner kontrollü sunucu işlemi/RPC ile).

revoke update on table public.students from authenticated;
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
