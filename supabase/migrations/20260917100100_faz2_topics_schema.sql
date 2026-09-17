-- Faz 2: müfredat şablonları ve konu ilerlemesi (03-veri-modeli.md Bölüm 4.2, 5.3).
-- Şablon/ders/konu: organization_id null = sistem şablonu; herkes okur, koç/owner düzenler
-- (tek kurum ölçeğinde sistem şablonu da düzenlenebilir; 02 karar #28).
-- student_topic_progress: standart öğrenci verisi kalıbı; satırlar tembel oluşur.

create type public.topic_status as enum ('not_started', 'studying', 'completed', 'needs_review', 'mastered');

-- Tablolar -------------------------------------------------------------------------

create table public.curriculum_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id),   -- null = sistem şablonu
  name text not null,
  exam_type text not null,
  grade smallint not null,
  season text not null,
  scoring jsonb not null,
  based_on_id uuid references public.curriculum_templates (id),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index curriculum_templates_organization_id_idx on public.curriculum_templates (organization_id);
create index curriculum_templates_based_on_id_idx on public.curriculum_templates (based_on_id);

alter table public.curriculum_templates enable row level security;

create trigger curriculum_templates_set_updated_at
  before update on public.curriculum_templates
  for each row execute function private.set_updated_at();

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.curriculum_templates (id) on delete cascade,
  code text not null,                              -- 'MAT'
  name text not null,
  short_name text not null,
  color text not null,                             -- token öneki: 'subject-math'
  icon text not null,                              -- lucide ikon adı
  exam_section text,
  exam_question_count smallint,
  sort_order smallint not null,
  unique (template_id, code)
);

alter table public.subjects enable row level security;

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  parent_id uuid references public.topics (id) on delete cascade,
  name text not null,
  semester smallint check (semester in (1, 2)),
  importance smallint not null default 2 check (importance between 1 and 3),
  estimated_minutes int,
  external_code text,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index topics_subject_id_idx on public.topics (subject_id);
create index topics_parent_id_idx on public.topics (parent_id);

alter table public.topics enable row level security;

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function private.set_updated_at();

create table public.student_topic_progress (
  student_id uuid not null references public.students (profile_id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  status public.topic_status not null default 'not_started',
  confidence smallint check (confidence between 1 and 5),
  completed_at timestamptz,
  review_stage smallint not null default 0,
  last_reviewed_at timestamptz,
  next_review_at date,
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

create index student_topic_progress_topic_id_idx on public.student_topic_progress (topic_id);

alter table public.student_topic_progress enable row level security;

create trigger student_topic_progress_set_updated_at
  before update on public.student_topic_progress
  for each row execute function private.set_updated_at();

-- students.curriculum_template_id artık FK (nullable kalır; form zorunlu tutar).
alter table public.students
  add constraint students_curriculum_template_id_fkey
  foreign key (curriculum_template_id) references public.curriculum_templates (id);

-- Yardımcılar ------------------------------------------------------------------------

-- Şablon okunabilir mi: sistem şablonu ya da kendi kurumu.
create or replace function private.can_read_template(p_template_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.curriculum_templates t
    where t.id = p_template_id
      and (t.organization_id is null or t.organization_id = private.my_org())
  )
$$;

-- Şablon düzenlenebilir mi: koç/owner ve okunabilir (sistem ya da kendi kurumu).
create or replace function private.can_edit_template(p_template_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.my_role() in ('coach', 'owner') and private.can_read_template(p_template_id)
$$;

create or replace function private.subject_template(p_subject_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select template_id from public.subjects where id = p_subject_id
$$;

create or replace function private.topic_template(p_topic_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.template_id
  from public.topics t
  join public.subjects s on s.id = t.subject_id
  where t.id = p_topic_id
$$;

revoke execute on function
  private.can_read_template(uuid),
  private.can_edit_template(uuid),
  private.subject_template(uuid),
  private.topic_template(uuid)
from public, anon;

grant execute on function
  private.can_read_template(uuid),
  private.can_edit_template(uuid),
  private.subject_template(uuid),
  private.topic_template(uuid)
to authenticated;

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------

revoke all on table
  public.curriculum_templates,
  public.subjects,
  public.topics,
  public.student_topic_progress
from anon, authenticated;

grant select, insert, update, delete on table public.curriculum_templates to authenticated;
grant select, insert, update, delete on table public.subjects to authenticated;
grant select, insert, update, delete on table public.topics to authenticated;
grant select, insert, update on table public.student_topic_progress to authenticated;

grant all on table
  public.curriculum_templates,
  public.subjects,
  public.topics,
  public.student_topic_progress
to service_role;

-- Politikalar ------------------------------------------------------------------------

create policy curriculum_templates_select on public.curriculum_templates
  for select to authenticated
  using (organization_id is null or organization_id = private.my_org());

create policy curriculum_templates_insert on public.curriculum_templates
  for insert to authenticated
  with check (private.my_role() in ('coach', 'owner') and organization_id = private.my_org());

create policy curriculum_templates_update on public.curriculum_templates
  for update to authenticated
  using (private.can_edit_template(id))
  with check (private.can_edit_template(id) and (organization_id is null or organization_id = private.my_org()));

create policy curriculum_templates_delete on public.curriculum_templates
  for delete to authenticated
  using (private.can_edit_template(id));

create policy subjects_select on public.subjects
  for select to authenticated
  using (private.can_read_template(template_id));

create policy subjects_insert on public.subjects
  for insert to authenticated
  with check (private.can_edit_template(template_id));

create policy subjects_update on public.subjects
  for update to authenticated
  using (private.can_edit_template(template_id))
  with check (private.can_edit_template(template_id));

create policy subjects_delete on public.subjects
  for delete to authenticated
  using (private.can_edit_template(template_id));

create policy topics_select on public.topics
  for select to authenticated
  using (private.can_read_template(private.subject_template(subject_id)));

create policy topics_insert on public.topics
  for insert to authenticated
  with check (private.can_edit_template(private.subject_template(subject_id)));

create policy topics_update on public.topics
  for update to authenticated
  using (private.can_edit_template(private.subject_template(subject_id)))
  with check (private.can_edit_template(private.subject_template(subject_id)));

create policy topics_delete on public.topics
  for delete to authenticated
  using (private.can_edit_template(private.subject_template(subject_id)));

create policy student_topic_progress_select on public.student_topic_progress
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_topic_progress_insert on public.student_topic_progress
  for insert to authenticated
  with check (private.can_write_student(student_id));

create policy student_topic_progress_update on public.student_topic_progress
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));
