-- Faz 4b: haftalık plan (08-faz4-plan-sistemi.md §1.4).
-- weekly_plans: öğrenci × hafta (pazartesi) tek plan; taslak/yayınlandı, koç mesajı, öğrenci
-- değerlendirmesi. plan_items: görevler; day_of_week NULL = "bu hafta içinde". Öğrenci yalnızca
-- yayınlanmış planı görür; tamamlama/not/erteleme yazması RPC ile (faz4b_plan_rpcs), tabloya
-- doğrudan UPDATE politikası koç/owner'da. question_logs.plan_item_id: görev ↔ soru kaydı bağı.

create type public.plan_status as enum ('draft', 'published');
-- Faz 4'ün 5 türü (karar A13); Faz 5'te `alter type … add value 'section'`, `'video'`.
create type public.plan_item_kind as enum ('topic_study', 'questions', 'review', 'link', 'custom');

-- Tablolar -------------------------------------------------------------------------

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  created_by uuid references public.profiles (id) on delete set null,
  status public.plan_status not null default 'draft',
  coach_message text check (char_length(coach_message) <= 500),
  student_reflection text check (char_length(student_reflection) <= 1000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, week_start)
);

create index weekly_plans_created_by_idx on public.weekly_plans (created_by);

alter table public.weekly_plans enable row level security;

create trigger weekly_plans_set_updated_at
  before update on public.weekly_plans
  for each row execute function private.set_updated_at();

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.weekly_plans (id) on delete cascade,
  day_of_week smallint check (day_of_week between 1 and 7),   -- NULL = bu hafta içinde
  sort_order smallint not null default 0,
  kind public.plan_item_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  url text,
  target_value int check (target_value > 0),
  target_unit text check (target_unit in ('questions', 'minutes')),
  estimated_minutes int not null check (estimated_minutes between 1 and 600),
  completed_at timestamptz,
  student_note text check (char_length(student_note) <= 200),
  postponed_from smallint check (postponed_from between 1 and 7),
  postponed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'link' or url ~ '^https?://')
);

create index plan_items_plan_day_sort_idx on public.plan_items (plan_id, day_of_week, sort_order);
create index plan_items_subject_id_idx on public.plan_items (subject_id);
create index plan_items_topic_id_idx on public.plan_items (topic_id);

alter table public.plan_items enable row level security;

create trigger plan_items_set_updated_at
  before update on public.plan_items
  for each row execute function private.set_updated_at();

-- Görev ↔ soru kaydı bağı (03 §4.3'teki yorum satırı). Görev silinince kayıt kalır, bağ kopar.
alter table public.question_logs
  add column plan_item_id uuid references public.plan_items (id) on delete set null;
create index question_logs_plan_item_id_idx on public.question_logs (plan_item_id);

-- Yardımcılar ----------------------------------------------------------------------

create or replace function private.plan_student(p_plan_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$ select student_id from public.weekly_plans where id = p_plan_id $$;

-- Okuma: öğrenci/veli yalnızca yayınlanmış plan; koç/owner her durumda.
create or replace function private.can_read_plan(p_plan_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.weekly_plans p
    where p.id = p_plan_id
      and private.can_read_student(p.student_id)
      and (p.status = 'published' or private.is_coach_of(p.student_id))
  )
$$;

create or replace function private.can_write_plan(p_plan_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.weekly_plans p
    where p.id = p_plan_id and private.is_coach_of(p.student_id)
  )
$$;

revoke execute on function
  private.plan_student(uuid),
  private.can_read_plan(uuid),
  private.can_write_plan(uuid)
from public, anon;

grant execute on function
  private.plan_student(uuid),
  private.can_read_plan(uuid),
  private.can_write_plan(uuid)
to authenticated;

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------

revoke all on table public.weekly_plans, public.plan_items from anon, authenticated;
grant select, insert, update, delete on table public.weekly_plans to authenticated;
grant select, insert, update, delete on table public.plan_items to authenticated;
grant all on table public.weekly_plans, public.plan_items to service_role;

-- Politikalar ------------------------------------------------------------------------

create policy weekly_plans_select on public.weekly_plans
  for select to authenticated
  using (
    private.can_read_student(student_id)
    and (status = 'published' or private.is_coach_of(student_id))
  );

create policy weekly_plans_insert on public.weekly_plans
  for insert to authenticated
  with check (private.is_coach_of(student_id) and created_by = (select auth.uid()));

create policy weekly_plans_update on public.weekly_plans
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id));

create policy weekly_plans_delete on public.weekly_plans
  for delete to authenticated
  using (private.is_coach_of(student_id));

create policy plan_items_select on public.plan_items
  for select to authenticated
  using (private.can_read_plan(plan_id));

create policy plan_items_insert on public.plan_items
  for insert to authenticated
  with check (private.can_write_plan(plan_id));

create policy plan_items_update on public.plan_items
  for update to authenticated
  using (private.can_write_plan(plan_id))
  with check (private.can_write_plan(plan_id));

create policy plan_items_delete on public.plan_items
  for delete to authenticated
  using (private.can_write_plan(plan_id));
