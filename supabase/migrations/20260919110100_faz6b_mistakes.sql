-- Faz 6b: yanlış defteri (10-faz6-denemeler.md §1.1, §1.4).
--   mistake_reason / mistake_status enum'ları; topic_alert_kind + 'mock_weak' (karar #32 kalıbı:
--   add value; bu dosyada kullanılmaz, faz6b_mock_alert_facts görünümü de değere bağlı değil).
--   mistakes: öğrencinin yanlış kaydı (ders, isteğe bağlı konu / deneme bağı / fotoğraf yolu,
--   neden, not, durum). Fotoğraf isteğe bağlıdır (C7), neden varsayılan 'unknown' (C9).
--   private.can_read_mistakes: kendisi VEYA koçu VEYA velisi (yalnızca can_view_details) — veli
--   kapısı can_read_student'tan farklıdır (C10: DB kapısı şimdi, veli arayüzü Faz 8).
--   RLS: öğrenci S I U D (kendi; insert created_by kendisi), koç S U D (koç kayıt açmaz — fotoğraf
--   öğrencinin telefonundan), veli S (can_read_mistakes), owner koç gibi (is_coach_of kapsar).
--   Depo: bucket mistake-images (private, 2 MB, webp/jpeg); yol {organization_id}/{student_id}/{uuid}.ext;
--   storage.objects politikaları: select can_read_mistakes, insert/delete can_write_student + kurum
--   klasörü kendi kurumu; update yok.

-- 1. Enum'lar -----------------------------------------------------------------------------------

create type public.mistake_reason as enum (
  'knowledge_gap', 'attention', 'time', 'misread_question', 'calculation', 'unknown'
);
create type public.mistake_status as enum ('open', 'solved');
alter type public.topic_alert_kind add value 'mock_weak';

-- 2. mistakes -----------------------------------------------------------------------------------

create table public.mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  -- Deneme kısayolundan geldiyse; sonuç silinince bağ düşer, kayıt kalır.
  mock_result_id uuid references public.mock_exam_results (id) on delete set null,
  -- Depo yolu; null = fotoğrafsız kayıt (karar C7).
  image_path text check (image_path is null or char_length(image_path) between 1 and 200),
  reason public.mistake_reason not null default 'unknown',
  note text check (note is null or char_length(note) <= 300),
  status public.mistake_status not null default 'open',
  solved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mistakes_solved_at_check check ((status = 'solved') = (solved_at is not null))
);

create index mistakes_student_created_at_idx on public.mistakes (student_id, created_at desc);
create index mistakes_subject_id_idx on public.mistakes (subject_id);
create index mistakes_topic_id_idx on public.mistakes (topic_id);
create index mistakes_mock_result_id_idx on public.mistakes (mock_result_id);
create index mistakes_created_by_idx on public.mistakes (created_by);

alter table public.mistakes enable row level security;

create trigger mistakes_set_updated_at
  before update on public.mistakes
  for each row execute function private.set_updated_at();

-- 3. Yardımcı: veli kapısı can_view_details ile ------------------------------------------------

create or replace function private.can_read_mistakes(p_student_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_student_id = (select auth.uid())
      or private.is_coach_of(p_student_id)
      or private.is_parent_of(p_student_id, true)
$$;

revoke execute on function private.can_read_mistakes(uuid) from public, anon;
grant execute on function private.can_read_mistakes(uuid) to authenticated;

-- 4. Tablo yetkileri (090_schema_guards matrisiyle birebir) -------------------------------------

revoke all on table public.mistakes from anon, authenticated;
grant select, insert, update, delete on table public.mistakes to authenticated;
grant all on table public.mistakes to service_role;

-- 5. Politikalar --------------------------------------------------------------------------------

create policy mistakes_select on public.mistakes
  for select to authenticated
  using (private.can_read_mistakes(student_id));

-- Yalnızca öğrencinin kendisi kayıt açar (koç açmaz; fotoğraf öğrencinin telefonundan).
create policy mistakes_insert on public.mistakes
  for insert to authenticated
  with check (student_id = (select auth.uid()) and created_by = (select auth.uid()));

create policy mistakes_update on public.mistakes
  for update to authenticated
  using (private.can_write_student(student_id))
  with check (private.can_write_student(student_id));

create policy mistakes_delete on public.mistakes
  for delete to authenticated
  using (private.can_write_student(student_id));

-- 6. Depo: bucket + storage.objects politikaları --------------------------------------------------
-- Yol: {organization_id}/{student_id}/{uuid}.webp|jpg → foldername[1] kurum, [2] öğrenci.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mistake-images', 'mistake-images', false, 2097152, '{image/webp,image/jpeg}')
on conflict (id) do nothing;

create policy mistake_images_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mistake-images'
    and private.can_read_mistakes(((storage.foldername(name))[2])::uuid)
  );

create policy mistake_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mistake-images'
    and private.can_write_student(((storage.foldername(name))[2])::uuid)
    and ((storage.foldername(name))[1])::uuid = private.my_org()
  );

create policy mistake_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mistake-images'
    and private.can_write_student(((storage.foldername(name))[2])::uuid)
    and ((storage.foldername(name))[1])::uuid = private.my_org()
  );
