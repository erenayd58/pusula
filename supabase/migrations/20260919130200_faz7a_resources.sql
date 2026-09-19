-- Faz 7a: kaynaklar (11-faz7-kaynaklar.md §1.2).
--   resources          kitap; student_id null = kurum kataloğu (paylaşılan), dolu = yalnızca o öğrencinin
--                      özel kaynağı (karar D1). created_by kimin eklediğini tutar.
--   resource_sections  test / bölüm; çok dersli kitapta subject_id dolu, tek dersli kitapta null.
--   student_resources  atama (koç ya da öğrencinin kendine alması).
--   question_logs.section_id, plan_items.section_id  bağlar (on delete set null; kayıt ve görev kalır).
-- Tek veri kaynağı: bir testin bittiği bilgisi ayrı tutulmaz; question_logs.section_id dolu en az bir
-- kayıt varsa test bitmiştir.
-- RLS: kurum kataloğunu kurum içi herkes okur; özel kaynağı öğrenci, koçu ve velisi (can_read_student).
-- Öğrenci yalnızca kendi özel kaynağını yazar (paylaşıma açamaz); koç/owner kataloğu ve kendi
-- öğrencilerinin özel kaynağını yazar ("Katalogda tut" = student_id → null).

-- 1. resources ----------------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null references public.curriculum_templates (id) on delete cascade,
  -- null = çok dersli kitap (testler ders taşır).
  subject_id uuid references public.subjects (id) on delete restrict,
  -- null = kurum kataloğu; dolu = öğrencinin özel kaynağı (öğrenci silinince gider).
  student_id uuid references public.students (profile_id) on delete cascade,
  type public.resource_type not null default 'question_bank',
  title text not null check (char_length(title) between 1 and 120),
  publisher text check (publisher is null or char_length(publisher) <= 60),
  publish_year smallint check (publish_year is null or publish_year between 2000 and 2100),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resources_org_title_idx on public.resources (organization_id, title);
create index resources_template_id_idx on public.resources (template_id);
create index resources_subject_id_idx on public.resources (subject_id);
create index resources_student_id_idx on public.resources (student_id);
create index resources_created_by_idx on public.resources (created_by);

alter table public.resources enable row level security;

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function private.set_updated_at();

-- 2. resource_sections --------------------------------------------------------------------------

create table public.resource_sections (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  -- Çok dersli kitapta dolu; tek dersli kitapta null (kitabın dersi geçerli).
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  question_count smallint check (question_count is null or question_count between 1 and 200),
  page_start smallint check (page_start is null or page_start >= 1),
  page_end smallint check (page_end is null or page_end >= 1),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_sections_pages_check check (page_end is null or page_start is null or page_end >= page_start)
);

create index resource_sections_resource_sort_idx on public.resource_sections (resource_id, sort_order);
create index resource_sections_subject_id_idx on public.resource_sections (subject_id);
create index resource_sections_topic_id_idx on public.resource_sections (topic_id);

alter table public.resource_sections enable row level security;

create trigger resource_sections_set_updated_at
  before update on public.resource_sections
  for each row execute function private.set_updated_at();

-- 3. student_resources --------------------------------------------------------------------------

create table public.student_resources (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (student_id, resource_id)
);

create index student_resources_resource_id_idx on public.student_resources (resource_id);
create index student_resources_assigned_by_idx on public.student_resources (assigned_by);

alter table public.student_resources enable row level security;

-- 4. Bağ kolonları ------------------------------------------------------------------------------

alter table public.question_logs
  add column section_id uuid references public.resource_sections (id) on delete set null;
create index question_logs_section_id_idx on public.question_logs (section_id);

alter table public.plan_items
  add column section_id uuid references public.resource_sections (id) on delete set null;
create index plan_items_section_id_idx on public.plan_items (section_id);

-- Yardımcılar -----------------------------------------------------------------------------------

create or replace function private.can_read_resource(p_resource_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.resources r
    where r.id = p_resource_id
      and r.organization_id = private.my_org()
      and (r.student_id is null or private.can_read_student(r.student_id))
  )
$$;

create or replace function private.can_edit_resource(p_resource_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.resources r
    where r.id = p_resource_id
      and r.organization_id = private.my_org()
      and (
        (r.student_id is null and private.my_role() in ('coach', 'owner'))
        or (r.student_id is not null and private.can_write_student(r.student_id))
      )
  )
$$;

revoke execute on function private.can_read_resource(uuid), private.can_edit_resource(uuid) from public, anon;
grant execute on function private.can_read_resource(uuid), private.can_edit_resource(uuid) to authenticated;

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------------

revoke all on table public.resources, public.resource_sections, public.student_resources
from anon, authenticated;
grant select, insert, update, delete on table public.resources, public.resource_sections to authenticated;
grant select, insert, delete on table public.student_resources to authenticated;
grant all on table public.resources, public.resource_sections, public.student_resources to service_role;

-- Politikalar: resources -----------------------------------------------------------------------

create policy resources_select on public.resources
  for select to authenticated
  using (
    organization_id = private.my_org()
    and (student_id is null or private.can_read_student(student_id))
  );

-- Koç/owner kataloğa (student_id null); öğrenci kendine (student_id = kendisi). created_by çağıran.
create policy resources_insert on public.resources
  for insert to authenticated
  with check (
    organization_id = private.my_org()
    and created_by = (select auth.uid())
    and (
      (student_id is null and private.my_role() in ('coach', 'owner'))
      or student_id = (select auth.uid())
    )
  );

-- Öğrenci kendi özel kaynağını düzenler ama student_id'yi değiştiremez (paylaşıma açamaz);
-- koç/owner kataloğu ve öğrencisinin özelini düzenler, "Katalogda tut" ile student_id'yi boşaltır.
create policy resources_update on public.resources
  for update to authenticated
  using (private.can_edit_resource(id))
  with check (
    organization_id = private.my_org()
    and (
      (student_id is null and private.my_role() in ('coach', 'owner'))
      or student_id = (select auth.uid())
      or (student_id is not null and private.is_coach_of(student_id))
    )
  );

create policy resources_delete on public.resources
  for delete to authenticated
  using (private.can_edit_resource(id));

-- Politikalar: resource_sections ---------------------------------------------------------------

create policy resource_sections_select on public.resource_sections
  for select to authenticated
  using (private.can_read_resource(resource_id));

create policy resource_sections_insert on public.resource_sections
  for insert to authenticated
  with check (private.can_edit_resource(resource_id));

create policy resource_sections_update on public.resource_sections
  for update to authenticated
  using (private.can_edit_resource(resource_id))
  with check (private.can_edit_resource(resource_id));

create policy resource_sections_delete on public.resource_sections
  for delete to authenticated
  using (private.can_edit_resource(resource_id));

-- Politikalar: student_resources ---------------------------------------------------------------
-- Öğrenci okuyabildiği bir kaynağı kendine alır (katalogdaki mevcut kitabı seçmek); koçun
-- atamasını kaldıramaz (delete yalnızca koç/owner). Kendi özel kaynağını silince atama cascade.

create policy student_resources_select on public.student_resources
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_resources_insert on public.student_resources
  for insert to authenticated
  with check (
    private.can_write_student(student_id)
    and assigned_by = (select auth.uid())
    and private.can_read_resource(resource_id)
  );

create policy student_resources_delete on public.student_resources
  for delete to authenticated
  using (private.is_coach_of(student_id));
