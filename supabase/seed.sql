-- Yerel geliştirme verisi (03-veri-modeli.md Bölüm 9). SADECE YEREL: `pnpm db:reset`
-- ile migration'lardan sonra çalışır; üretim/staging'e asla uygulanmaz.
--
-- Demo hesaplar (hepsinin şifresi `pusula-demo`; yalnızca yerel Docker ortamı içindir,
-- gerçek bir sistemde kullanılmaz):
--   owner   sahip@pusula.local
--   koç     koc@pusula.local
--   öğrenci ayse.k / mehmet.y / zeynep.a  (sentetik e-posta: <kullaniciadi>@ogrenci.pusula.local)
--   veli    veli.ayse@pusula.local (Ayşe'nin annesi, ayrıntı izni var)
--           veli.mehmet@pusula.local (Mehmet'in babası, ayrıntı izni yok)
--
-- auth.users / auth.identities satırları Supabase'in yerel seed kalıbıyla doğrudan
-- yazılır; giriş yapılabilirliği Faz 1b'de doğrulanır.
-- Şablon verisi (LGS 2027) migration'dadır (faz2_lgs_2027_template); seed yalnızca demo ilerleme ekler.

-- Kurum -------------------------------------------------------------------------

insert into public.organizations (id, name, slug)
values ('a0000000-0000-4000-8000-000000000001', 'Demo Koçluk', 'demo');

-- Auth kullanıcıları --------------------------------------------------------------

with demo_users (id, email) as (
  values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'sahip@pusula.local'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'koc@pusula.local'),
    ('b0000000-0000-4000-8000-000000000011'::uuid, 'ayse.k@ogrenci.pusula.local'),
    ('b0000000-0000-4000-8000-000000000012'::uuid, 'mehmet.y@ogrenci.pusula.local'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'zeynep.a@ogrenci.pusula.local'),
    ('b0000000-0000-4000-8000-000000000021'::uuid, 'veli.ayse@pusula.local'),
    ('b0000000-0000-4000-8000-000000000022'::uuid, 'veli.mehmet@pusula.local')
),
inserted_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    -- GoTrue token kolonlarını NULL yerine '' bekler (NULL scan hatası).
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('pusula-demo', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  from demo_users
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
from inserted_users;

-- Profiller -----------------------------------------------------------------------

insert into public.profiles (id, organization_id, role, full_name, username) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'owner',   'Selin Demir',    null),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'coach',   'Murat Kaya',     null),
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'student', 'Ayşe Kılıç',     'ayse.k'),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'student', 'Mehmet Yılmaz',  'mehmet.y'),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'student', 'Zeynep Arslan',  'zeynep.a'),
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'parent',  'Fatma Kılıç',    null),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001', 'parent',  'Ahmet Yılmaz',   null);

-- Öğrenciler (farklı profiller: hedefli, orta, yeni başlayan) -----------------------
-- exam_date: LGS tarihi tahmini, MEB takvimiyle doğrulanacak.

-- curriculum_template_id: LGS 2027 sistem şablonu (faz2_lgs_2027_template migration'ındaki sabit kimlik).
insert into public.students (profile_id, organization_id, coach_id, season, grade, school_name, class_section, exam_date, target_percentile, status, curriculum_template_id) values
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '2026-2027', 8, 'Atatürk Ortaokulu', '8-A', date '2027-06-13', 1.00,  'active', 'c0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '2026-2027', 8, 'Atatürk Ortaokulu', '8-B', date '2027-06-13', 5.00,  'active', 'c0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '2026-2027', 8, 'Cumhuriyet Ortaokulu', '8-C', date '2027-06-13', null, 'active', 'c0000000-0000-4000-8000-000000000001');

-- Veli bağlantıları -------------------------------------------------------------------

insert into public.student_parents (student_id, parent_id, relation, can_view_details) values
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000021', 'mother', true),
  ('b0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000022', 'father', false);

-- KVKK onayı: Ayşe için veli onayı tam (iki tür); Mehmet ve Zeynep onaysız (kâğıt onayı denemesi) --

insert into public.consents (student_id, given_by, recorded_by, type, document_version) values
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000021', null, 'privacy_notice',   'aydinlatma-v1'),
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000021', null, 'explicit_consent', 'aydinlatma-v1');

-- student_modules: satır yok → her modül manifestteki defaultEnabled ile açık (Faz 1c).

-- Konu ilerlemesi (Faz 2): Ayşe'de her durumdan örnek; Mehmet ve Zeynep'te satır yok
-- (tembel: hepsi "başlanmadı"). Konu kimlikleri faz2_lgs_2027_template migration'ındaki sabitler.

insert into public.student_topic_progress (student_id, topic_id, status, confidence, completed_at) values
  -- Türkçe: 1-2 oturdu, 3-4 tamamlandı, 5 çalışılıyor, 6 tekrar gerekli
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000001001', 'mastered',     5, now() - interval '20 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000001002', 'mastered',     4, now() - interval '18 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000001003', 'completed',    4, now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000001004', 'completed',    3, now() - interval '5 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000001005', 'studying',     2, null),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000001006', 'needs_review', 2, now() - interval '30 days'),
  -- Matematik: 1 oturdu, 2-3 tamamlandı, 4 çalışılıyor
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000002001', 'mastered',     5, now() - interval '25 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000002002', 'completed',    4, now() - interval '12 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000002003', 'completed',    3, now() - interval '3 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000002004', 'studying',     null, null),
  -- Fen: 1 tamamlandı, 2 tekrar gerekli
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000003001', 'completed',    4, now() - interval '15 days'),
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000003002', 'needs_review', 2, now() - interval '28 days'),
  -- İnkılap: 1 tamamlandı
  ('b0000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000004001', 'completed',    3, now() - interval '7 days');
