-- Faz 4d: öneri reddetme hafızası (08 §1.6). Koç bir öneriye "Şimdi değil" dediğinde satır
-- açılır; öneri motoru `dismissed_until >= bugün` satırları filtreler. Süresi geçen satır
-- temizlenmez, upsert ile yenilenir (unique nulls not distinct: ders düzeyi öneride topic_id
-- null). Öğrenci ve veli görmez; koç kendi öğrencisi için yazar (dismissed_by kendisi), owner
-- kurumun tümü (is_coach_of owner'ı kapsar). dismissed_until'i sunucu hesaplar
-- (bugün + suggestions.dismiss_days).

create table public.suggestion_dismissals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (profile_id) on delete cascade,
  -- Koç profili silinince hafızası da gider (satır koça aittir; silme engellenmez).
  dismissed_by uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete cascade,   -- ders düzeyi öneride null
  kind public.topic_alert_kind not null,
  dismissed_until date not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (student_id, subject_id, topic_id, kind)
);

create index suggestion_dismissals_dismissed_by_idx on public.suggestion_dismissals (dismissed_by);
create index suggestion_dismissals_subject_id_idx on public.suggestion_dismissals (subject_id);
create index suggestion_dismissals_topic_id_idx on public.suggestion_dismissals (topic_id);

alter table public.suggestion_dismissals enable row level security;

-- Tablo yetkileri (090_schema_guards matrisiyle birebir) ---------------------------------

revoke all on table public.suggestion_dismissals from anon, authenticated;
grant select, insert, update, delete on table public.suggestion_dismissals to authenticated;
grant all on table public.suggestion_dismissals to service_role;

-- Politikalar (koç S I U D; öğrenci/veli yok) ----------------------------------------------

create policy suggestion_dismissals_select on public.suggestion_dismissals
  for select to authenticated
  using (private.is_coach_of(student_id));

create policy suggestion_dismissals_insert on public.suggestion_dismissals
  for insert to authenticated
  with check (private.is_coach_of(student_id) and dismissed_by = (select auth.uid()));

create policy suggestion_dismissals_update on public.suggestion_dismissals
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id) and dismissed_by = (select auth.uid()));

create policy suggestion_dismissals_delete on public.suggestion_dismissals
  for delete to authenticated
  using (private.is_coach_of(student_id));
