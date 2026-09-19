-- Faz 6a: denemeler (10-faz6-denemeler.md §1.3).
--   mock_exams                 deneme kataloğu (kurum düzeyi; subject_id null = genel, dolu = branş)
--   mock_exam_results          öğrencinin deneme sonucu (katalog denemesi ya da serbest başlık)
--   mock_exam_subject_results  ders satırı: D/Y/B + kayıt anındaki ceza → net (generated)
--   mock_exam_topic_mistakes   "bu konuda yanlış yaptım" işareti (sayı yok)
-- RLS: katalog kurum içi herkes okur (öğrenci/veli yazamaz), koç kurumunda S I U D; sonuç ve alt
-- tablolar standart öğrenci verisi kalıbı (öğrenci kendi S I U D, koç `is_coach_of`, veli S).
-- Alt tablolar `private.mock_result_student` ile öğrenciye bağlanır (plan_student kalıbı).
-- Tablo yetkisi authenticated S I U D (090 matrisi).

-- 1. mock_exams ---------------------------------------------------------------------------------

create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null references public.curriculum_templates (id) on delete cascade,
  -- null = genel deneme; dolu = branş denemesi (03'teki is_full_exam yerine).
  subject_id uuid references public.subjects (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  publisher text check (publisher is null or char_length(publisher) <= 60),
  exam_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mock_exams_org_exam_date_idx on public.mock_exams (organization_id, exam_date desc);
create index mock_exams_template_id_idx on public.mock_exams (template_id);
create index mock_exams_subject_id_idx on public.mock_exams (subject_id);
create index mock_exams_created_by_idx on public.mock_exams (created_by);

alter table public.mock_exams enable row level security;

create trigger mock_exams_set_updated_at
  before update on public.mock_exams
  for each row execute function private.set_updated_at();

-- 2. mock_exam_results --------------------------------------------------------------------------

create table public.mock_exam_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  -- Katalog denemesi; sonucu olan deneme silinemez (karar C5).
  mock_exam_id uuid references public.mock_exams (id) on delete restrict,
  custom_title text check (custom_title is null or char_length(custom_title) between 1 and 80),
  -- Katalog dışı branş denemesi; katalogdan geliyorsa null (türü katalog belirler).
  subject_id uuid references public.subjects (id) on delete restrict,
  taken_on date not null check (taken_on <= (now() at time zone 'Europe/Istanbul')::date),
  duration_minutes int check (duration_minutes between 1 and 600),
  score numeric(6,3) check (score between 0 and 999.999),
  percentile numeric(5,2) check (percentile between 0 and 100),
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_exam_results_title_check check (mock_exam_id is not null or custom_title is not null),
  constraint mock_exam_results_branch_check check (mock_exam_id is null or subject_id is null)
);

create index mock_exam_results_student_taken_on_idx on public.mock_exam_results (student_id, taken_on desc);
create index mock_exam_results_mock_exam_id_idx on public.mock_exam_results (mock_exam_id);
create index mock_exam_results_subject_id_idx on public.mock_exam_results (subject_id);
create index mock_exam_results_created_by_idx on public.mock_exam_results (created_by);
-- Katalog denemesi öğrenci başına bir kez; yeniden giriş = düzenleme (karar C6).
create unique index mock_exam_results_student_exam_uniq
  on public.mock_exam_results (student_id, mock_exam_id)
  where mock_exam_id is not null;

alter table public.mock_exam_results enable row level security;

create trigger mock_exam_results_set_updated_at
  before update on public.mock_exam_results
  for each row execute function private.set_updated_at();

-- 3. mock_exam_subject_results ------------------------------------------------------------------

create table public.mock_exam_subject_results (
  result_id uuid not null references public.mock_exam_results (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  correct_count smallint not null default 0 check (correct_count >= 0),
  wrong_count smallint not null default 0 check (wrong_count >= 0),
  blank_count smallint not null default 0 check (blank_count >= 0),
  -- Kayıt anında şablon scoring'inden; 0 = ceza yok.
  wrong_penalty smallint not null check (wrong_penalty >= 0),
  net numeric(6,2) generated always as
    (correct_count - case when wrong_penalty > 0 then wrong_count::numeric / wrong_penalty else 0 end) stored,
  primary key (result_id, subject_id)
);

create index mock_exam_subject_results_subject_id_idx on public.mock_exam_subject_results (subject_id);

alter table public.mock_exam_subject_results enable row level security;

-- 4. mock_exam_topic_mistakes -------------------------------------------------------------------

create table public.mock_exam_topic_mistakes (
  result_id uuid not null references public.mock_exam_results (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (result_id, topic_id)
);

create index mock_exam_topic_mistakes_topic_id_idx on public.mock_exam_topic_mistakes (topic_id);

alter table public.mock_exam_topic_mistakes enable row level security;

-- Yardımcı -------------------------------------------------------------------------------------

create or replace function private.mock_result_student(p_result_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$ select student_id from public.mock_exam_results where id = p_result_id $$;

revoke execute on function private.mock_result_student(uuid) from public, anon;
grant execute on function private.mock_result_student(uuid) to authenticated;

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------------

revoke all on table
  public.mock_exams, public.mock_exam_results,
  public.mock_exam_subject_results, public.mock_exam_topic_mistakes
from anon, authenticated;
grant select, insert, update, delete on table
  public.mock_exams, public.mock_exam_results,
  public.mock_exam_subject_results, public.mock_exam_topic_mistakes
to authenticated;
grant all on table
  public.mock_exams, public.mock_exam_results,
  public.mock_exam_subject_results, public.mock_exam_topic_mistakes
to service_role;

-- Politikalar: mock_exams (kurum kataloğu) -----------------------------------------------------
-- Katalog kurum düzeyi olduğu için can_read_template değil my_org kullanılır; sistem şablonu için
-- de katalog kurumundur. Yazma: koç ve owner (my_role).

create policy mock_exams_select on public.mock_exams
  for select to authenticated
  using (organization_id = private.my_org());

create policy mock_exams_insert on public.mock_exams
  for insert to authenticated
  with check (
    organization_id = private.my_org()
    and private.my_role() in ('coach', 'owner')
    and created_by = (select auth.uid())
  );

create policy mock_exams_update on public.mock_exams
  for update to authenticated
  using (organization_id = private.my_org() and private.my_role() in ('coach', 'owner'))
  with check (organization_id = private.my_org() and private.my_role() in ('coach', 'owner'));

create policy mock_exams_delete on public.mock_exams
  for delete to authenticated
  using (organization_id = private.my_org() and private.my_role() in ('coach', 'owner'));

-- Politikalar: mock_exam_results ---------------------------------------------------------------

create policy mock_exam_results_select on public.mock_exam_results
  for select to authenticated
  using (private.can_read_student(student_id));

create policy mock_exam_results_insert on public.mock_exam_results
  for insert to authenticated
  with check (private.can_write_student(student_id) and created_by = (select auth.uid()));

create policy mock_exam_results_update on public.mock_exam_results
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));

create policy mock_exam_results_delete on public.mock_exam_results
  for delete to authenticated
  using (private.can_write_student(student_id));

-- Politikalar: alt tablolar (sonuç üzerinden öğrenciye bağlı) ----------------------------------

create policy mock_exam_subject_results_select on public.mock_exam_subject_results
  for select to authenticated
  using (private.can_read_student(private.mock_result_student(result_id)));

create policy mock_exam_subject_results_insert on public.mock_exam_subject_results
  for insert to authenticated
  with check (private.can_write_student(private.mock_result_student(result_id)));

create policy mock_exam_subject_results_update on public.mock_exam_subject_results
  for update to authenticated
  using (private.can_write_student(private.mock_result_student(result_id)))
  with check (private.can_write_student(private.mock_result_student(result_id)));

create policy mock_exam_subject_results_delete on public.mock_exam_subject_results
  for delete to authenticated
  using (private.can_write_student(private.mock_result_student(result_id)));

create policy mock_exam_topic_mistakes_select on public.mock_exam_topic_mistakes
  for select to authenticated
  using (private.can_read_student(private.mock_result_student(result_id)));

create policy mock_exam_topic_mistakes_insert on public.mock_exam_topic_mistakes
  for insert to authenticated
  with check (private.can_write_student(private.mock_result_student(result_id)));

create policy mock_exam_topic_mistakes_update on public.mock_exam_topic_mistakes
  for update to authenticated
  using (private.can_write_student(private.mock_result_student(result_id)))
  with check (private.can_write_student(private.mock_result_student(result_id)));

create policy mock_exam_topic_mistakes_delete on public.mock_exam_topic_mistakes
  for delete to authenticated
  using (private.can_write_student(private.mock_result_student(result_id)));
