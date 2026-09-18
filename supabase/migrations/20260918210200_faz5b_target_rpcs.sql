-- Faz 5b: set_student_targets (09 §1.4). Tek transaction: students.topics_finish_by /
-- target_starts_on güncellenir; student_subject_targets payload ile değiştirilir (payload'da
-- olmayan ders silinir); student_topic_targets upsert edilir ve payload'da olmayan satırlar silinir
-- (yeniden üretimde bitmiş konuların eski hedefi temizlenir). Ders/konu öğrencinin şablonunda
-- değilse invalid_target (22023), hiçbir şey yazılmaz. Security definer: students hedef kolonlarının
-- API grant'ı yok, niyet burada açık (03 §5.3 seçenek (a)); ilk satır is_coach_of.

create function public.set_student_targets(
  p_student_id uuid,
  p_topics_finish_by date,
  p_starts_on date,
  p_subject_targets jsonb,
  p_topic_targets jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template uuid;
  v_subjects int;
  v_topics int;
begin
  if not private.is_coach_of(p_student_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_topics_finish_by is null or p_starts_on is null or p_topics_finish_by < p_starts_on then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;
  if p_subject_targets is null or jsonb_typeof(p_subject_targets) <> 'array'
     or p_topic_targets is null or jsonb_typeof(p_topic_targets) <> 'array' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  select curriculum_template_id into v_template from public.students where profile_id = p_student_id;
  if v_template is null then
    raise exception 'no_template' using errcode = '22023';
  end if;

  -- Ders ve konular öğrencinin şablonunda olmalı (konular ünite düzeyi).
  if exists (
    select 1 from jsonb_to_recordset(p_subject_targets) as r(subject_id uuid, questions int)
    where not exists (
      select 1 from public.subjects s where s.id = r.subject_id and s.template_id = v_template
    )
  ) or exists (
    select 1 from jsonb_to_recordset(p_topic_targets) as r(topic_id uuid, target_on date)
    where not exists (
      select 1 from public.topics t
      join public.subjects s on s.id = t.subject_id
      where t.id = r.topic_id and t.parent_id is null and s.template_id = v_template
    )
  ) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;

  update public.students
  set topics_finish_by = p_topics_finish_by, target_starts_on = p_starts_on
  where profile_id = p_student_id;

  -- Ders hedefleri: payload ile değiştir.
  delete from public.student_subject_targets t
  where t.student_id = p_student_id
    and t.subject_id not in (
      select r.subject_id from jsonb_to_recordset(p_subject_targets) as r(subject_id uuid, questions int)
    );
  insert into public.student_subject_targets (student_id, subject_id, questions)
  select p_student_id, r.subject_id, r.questions
  from jsonb_to_recordset(p_subject_targets) as r(subject_id uuid, questions int)
  on conflict (student_id, subject_id) do update set questions = excluded.questions;
  get diagnostics v_subjects = row_count;

  -- Konu hedefleri: upsert + payload dışı satırları sil.
  delete from public.student_topic_targets t
  where t.student_id = p_student_id
    and t.topic_id not in (
      select r.topic_id from jsonb_to_recordset(p_topic_targets) as r(topic_id uuid, target_on date)
    );
  insert into public.student_topic_targets (student_id, topic_id, target_on, created_by)
  select p_student_id, r.topic_id, r.target_on, (select auth.uid())
  from jsonb_to_recordset(p_topic_targets) as r(topic_id uuid, target_on date)
  on conflict (student_id, topic_id) do update set target_on = excluded.target_on;
  get diagnostics v_topics = row_count;

  return jsonb_build_object('subjects', v_subjects, 'topics', v_topics);
end;
$$;

revoke execute on function public.set_student_targets(uuid, date, date, jsonb, jsonb) from public, anon;
grant execute on function public.set_student_targets(uuid, date, date, jsonb, jsonb) to authenticated;
