-- Faz 1a: kimlik ve kurum tabloları (03-veri-modeli.md Bölüm 4.1).
-- RLS burada açılır; politikalar ayrı migration'da gelir (o zamana kadar varsayılan red).

-- private şeması: API'ye açık olmayan yardımcı fonksiyonlar (yetkiler faz1a_privileges'ta).
create schema if not exists private;

-- Ortak updated_at tetikleyicisi. Trigger fonksiyonu olduğu için RPC ile çağrılamaz;
-- tetiklenirken EXECUTE yetkisi denetlenmez, bu yüzden hiçbir role execute verilmez.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Kurumlar -------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,   -- uyarı eşikleri, tekrar aralıkları vb.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

-- Profiller -----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  role public.user_role not null,
  full_name text not null,
  username text unique,                           -- sadece öğrencide dolu: küçük harf, [a-z0-9._], 3-30
  avatar_url text,
  phone text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9._]{3,30}$'),
  constraint profiles_username_only_students check ((role = 'student') = (username is not null))
);

create index profiles_organization_id_idx on public.profiles (organization_id);

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Öğrenciler ----------------------------------------------------------------

create table public.students (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  coach_id uuid not null references public.profiles (id),
  curriculum_template_id uuid,                    -- FK Faz 2'de (curriculum_templates)
  season text not null,                           -- '2026-2027'
  grade smallint not null default 8,
  school_name text,
  class_section text,
  exam_date date,                                 -- LGS tarihi (geri sayım)
  target_percentile numeric(5, 2),
  status public.student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_organization_id_idx on public.students (organization_id);
create index students_coach_id_idx on public.students (coach_id);
create index students_curriculum_template_id_idx on public.students (curriculum_template_id);

alter table public.students enable row level security;

create trigger students_set_updated_at
  before update on public.students
  for each row execute function private.set_updated_at();

-- Öğrenci-veli bağlantıları -------------------------------------------------

create table public.student_parents (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  relation public.parent_relation not null,
  can_view_details boolean not null default false, -- yanlış defteri, günlük durum vb.
  created_at timestamptz not null default now(),
  primary key (student_id, parent_id)
);

create index student_parents_parent_id_idx on public.student_parents (parent_id);

alter table public.student_parents enable row level security;

-- Davetler ------------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  code text not null unique,                      -- 8 karakter, karışması kolay karakterler hariç (üretim Faz 1b)
  role public.user_role not null,
  student_id uuid references public.students (profile_id) on delete cascade, -- veli davetinde dolu
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  used_by uuid references public.profiles (id),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_role_check check (role in ('coach', 'parent')),
  constraint invitations_student_for_parent check ((role = 'parent') = (student_id is not null))
);

create index invitations_organization_id_idx on public.invitations (organization_id);
create index invitations_student_id_idx on public.invitations (student_id);
create index invitations_created_by_idx on public.invitations (created_by);
create index invitations_used_by_idx on public.invitations (used_by);

alter table public.invitations enable row level security;

-- KVKK onayları -------------------------------------------------------------

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  given_by uuid references public.profiles (id),  -- veli; kâğıt onayda null + recorded_by dolu
  recorded_by uuid references public.profiles (id),
  type public.consent_type not null,
  document_version text not null,                 -- 'aydinlatma-v1'
  given_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint consents_given_or_recorded check (given_by is not null or recorded_by is not null)
);

create index consents_student_id_idx on public.consents (student_id);
create index consents_given_by_idx on public.consents (given_by);
create index consents_recorded_by_idx on public.consents (recorded_by);

alter table public.consents enable row level security;

-- Öğrenci modül ayarları ----------------------------------------------------

create table public.student_modules (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  module_id text not null,                        -- manifest id
  enabled boolean not null,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (student_id, module_id)
);

alter table public.student_modules enable row level security;

create trigger student_modules_set_updated_at
  before update on public.student_modules
  for each row execute function private.set_updated_at();
