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

-- Soru kayıtları (Faz 3): Ayşe için son 14 gün; 4, 8 ve 13 gün önce boş (seri = son 4 gün).
-- Tarihler İstanbul gününe göre (current_date değil). Mehmet ve Zeynep'te kayıt yok.
-- Ders/konu kimlikleri faz2_lgs_2027_template migration'ındaki sabitler.

insert into public.question_logs (student_id, log_date, subject_id, topic_id, total_count, correct_count, wrong_count, blank_count, duration_minutes)
select
  'b0000000-0000-4000-8000-000000000011',
  (now() at time zone 'Europe/Istanbul')::date - r.days_ago,
  r.subject_id::uuid, r.topic_id::uuid, r.total, r.correct, r.wrong, r.blank, r.minutes
from (values
  -- bugün
  (0,  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002004', 20, 15, 4, 1, 35),
  (0,  'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001005', 15, 12, 2, 1, 20),
  -- dün
  (1,  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002003', 30, 24, 5, 1, 45),
  (1,  'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000003002', 20, 13, 6, 1, 30),
  (1,  'c1000000-0000-4000-8000-000000000006', null,                                    20, 17, 3, 0, 15),
  -- 2 gün önce
  (2,  'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001003', 25, 19, 5, 1, 35),
  (2,  'c1000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000004001', 20, 16, 3, 1, 20),
  (2,  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002002', 20, 14, 5, 1, 30),
  -- 3 gün önce
  (3,  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002003', 40, 30, 8, 2, 60),
  (3,  'c1000000-0000-4000-8000-000000000005', null,                                    20, 18, 2, 0, 15),
  -- 4 gün önce boş
  (5,  'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001004', 30, 22, 6, 2, 40),
  (5,  'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000003001', 20, 15, 4, 1, 30),
  (6,  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002001', 40, 34, 5, 1, 50),
  (6,  'c1000000-0000-4000-8000-000000000006', null,                                    10, 8,  2, 0, 10),
  (7,  'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001003', 30, 21, 7, 2, 40),
  (7,  'c1000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000004001', 15, 12, 3, 0, 15),
  -- 8 gün önce boş
  (9,  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002002', 30, 21, 7, 2, 45),
  (10, 'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000003001', 25, 17, 6, 2, 35),
  (10, 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001002', 20, 17, 3, 0, 20),
  (11, 'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002001', 35, 26, 7, 2, 50),
  (12, 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001001', 30, 25, 4, 1, 30),
  (12, 'c1000000-0000-4000-8000-000000000005', null,                                    15, 13, 2, 0, 10)
  -- 13 gün önce boş
) as r (days_ago, subject_id, topic_id, total, correct, wrong, blank, minutes);

-- Hedefler (Faz 3): Ayşe'ye koç Murat günlük 60 / haftalık 300 soru.
insert into public.goals (student_id, created_by, period, target_value, starts_on) values
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000002', 'daily',  60,  (now() at time zone 'Europe/Istanbul')::date - 20),
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000002', 'weekly', 300, (now() at time zone 'Europe/Istanbul')::date - 20);

-- Haftalık program (Faz 4a): Ayşe hafta içi okul, salı/perşembe dershane, cumartesi kurs;
-- gelecek haftanın çarşambası tüm gün yazılı (istisna). Öğrencinin kendi girdiği kabul edilir.
insert into public.busy_slots (student_id, day_of_week, starts_at, ends_at, kind, note, created_by)
select 'b0000000-0000-4000-8000-000000000011', r.day, r.starts_at::time, r.ends_at::time, r.kind::public.busy_slot_kind, r.note,
       'b0000000-0000-4000-8000-000000000011'
from (values
  (1, '08:30', '15:00', 'school', null),
  (2, '08:30', '15:00', 'school', null),
  (3, '08:30', '15:00', 'school', null),
  (4, '08:30', '15:00', 'school', null),
  (5, '08:30', '15:00', 'school', null),
  (2, '17:00', '19:30', 'tutoring_center', 'Matematik'),
  (4, '17:00', '19:30', 'tutoring_center', 'Fen'),
  (6, '10:00', '12:00', 'course', 'İngilizce kursu')
) as r (day, starts_at, ends_at, kind, note);

insert into public.schedule_exceptions (student_id, on_date, title, created_by)
values (
  'b0000000-0000-4000-8000-000000000011',
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date + 9,
  'Yazılı: Türkçe',
  'b0000000-0000-4000-8000-000000000011'
);

-- Haftalık plan (Faz 4b): Ayşe için bu haftanın yayınlanmış planı (koç Murat), 7 görev; pazartesi
-- görevleri tamamlanmış, biri ertelenmiş; koç mesajı. Sabit kimlik: d0000000-…-0001.
insert into public.weekly_plans (id, student_id, week_start, created_by, status, coach_message, published_at)
values (
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000011',
  (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date,
  'b0000000-0000-4000-8000-000000000002',
  'published',
  'Bu hafta paragrafa ağırlık veriyoruz. Her gün 30 soru yeterli, acele etme.',
  now() - interval '2 days'
);

insert into public.plan_items (plan_id, day_of_week, sort_order, kind, title, subject_id, topic_id, target_value, target_unit, estimated_minutes, completed_at, postponed_from, postponed_at)
values
  ('d0000000-0000-4000-8000-000000000001', 1, 0, 'questions',   'Sözcükte Anlam · 30 soru',      'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001001', 30, 'questions', 45, now() - interval '1 day', null, null),
  ('d0000000-0000-4000-8000-000000000001', 1, 1, 'topic_study', 'Çarpanlar ve Katlar · konu çalışması', 'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002001', null, null, 40, now() - interval '1 day', null, null),
  ('d0000000-0000-4000-8000-000000000001', 2, 0, 'questions',   'Çarpanlar ve Katlar · 40 soru', 'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000002001', 40, 'questions', 60, null, null, null),
  ('d0000000-0000-4000-8000-000000000001', 3, 0, 'review',      'Mevsimler ve İklim · tekrar',   'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000003001', null, null, 20, null, 2, now() - interval '12 hours'),
  ('d0000000-0000-4000-8000-000000000001', 4, 0, 'questions',   'Cümlenin Ögeleri · 20 soru',    'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000001005', 20, 'questions', 30, null, null, null),
  ('d0000000-0000-4000-8000-000000000001', 6, 0, 'link',        'Paragraf kampı · bağlantı',     'c1000000-0000-4000-8000-000000000001', null, null, null, 15, null, null, null),
  ('d0000000-0000-4000-8000-000000000001', null, 0, 'custom',   'Kitap oku · 40 sayfa',          null, null, null, null, 30, null, null, null);
update public.plan_items set url = 'https://www.youtube.com/' where kind = 'link' and plan_id = 'd0000000-0000-4000-8000-000000000001';
