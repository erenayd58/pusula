-- Faz 6a: save_mock_exam_result (10 §1.3). Sonuç + ders satırları + konu işaretleri tek
-- transaction'da. Security INVOKER: RLS uygulanır (öğrenci kendi, koç kendi öğrencisi, owner kurum);
-- ilk satır can_write_student değilse not_allowed (42501). Doğrulamalar 22023:
--   invalid_exam     katalog denemesi öğrencinin kurumunda ve şablonunda değil
--   invalid_subject  ders şablonda değil / tekrar ediyor / branşta tek ders satırı değil ya da o ders değil
--   count_exceeded   correct + wrong + blank > exam_question_count (null ise sınırsız)
--   invalid_topic    konu şablonda değil ya da ders satırı olmayan bir derse ait
--   title_required   katalog dışı kayıtta başlık boş
-- wrong_penalty şablonun scoring->>'wrong_penalty' değerinden (yoksa 0). id boşsa insert
-- (created_by çağıran), doluysa update + alt satırlar silinip yeniden yazılır (RLS 0 satır →
-- not_found). Döner: sonuç id.

create function public.save_mock_exam_result(
  p_result jsonb,
  p_subjects jsonb,
  p_topic_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := (p_result ->> 'id')::uuid;
  v_student uuid := (p_result ->> 'student_id')::uuid;
  v_exam uuid := (p_result ->> 'mock_exam_id')::uuid;
  v_custom_title text := nullif(btrim(coalesce(p_result ->> 'custom_title', '')), '');
  v_subject uuid := (p_result ->> 'subject_id')::uuid;   -- katalog dışı branş dersi
  v_branch uuid;                                          -- etkin branş dersi (katalog ya da serbest)
  v_template uuid;
  v_org uuid;
  v_penalty smallint;
  v_rows int;
begin
  if v_student is null or not private.can_write_student(v_student) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_subjects is null or jsonb_typeof(p_subjects) <> 'array' or jsonb_array_length(p_subjects) = 0 then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;

  select s.curriculum_template_id, s.organization_id into v_template, v_org
  from public.students s where s.profile_id = v_student;
  if v_template is null then
    raise exception 'invalid_exam' using errcode = '22023';
  end if;

  -- Deneme türü: katalog denemesi kurum + şablon içinde olmalı; türü katalog belirler.
  if v_exam is not null then
    select e.subject_id into v_branch
    from public.mock_exams e
    where e.id = v_exam and e.organization_id = v_org and e.template_id = v_template;
    if not found then
      raise exception 'invalid_exam' using errcode = '22023';
    end if;
    v_custom_title := null;
    v_subject := null;
  else
    if v_custom_title is null then
      raise exception 'title_required' using errcode = '22023';
    end if;
    v_branch := v_subject;
  end if;

  -- Ders satırları: şablonda, tekrarsız; branşta tek satır ve o ders.
  if exists (
    select 1 from jsonb_to_recordset(p_subjects) as r(subject_id uuid, correct int, wrong int, blank int)
    where r.subject_id is null
      or not exists (select 1 from public.subjects s where s.id = r.subject_id and s.template_id = v_template)
  ) or (
    select count(*) <> count(distinct r.subject_id)
    from jsonb_to_recordset(p_subjects) as r(subject_id uuid, correct int, wrong int, blank int)
  ) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;
  if v_branch is not null and (
    jsonb_array_length(p_subjects) <> 1
    or (p_subjects -> 0 ->> 'subject_id')::uuid is distinct from v_branch
  ) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;
  if v_branch is not null and not exists (
    select 1 from public.subjects s where s.id = v_branch and s.template_id = v_template
  ) then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;

  -- Soru sayısı sınırı (ders soru sayısı boşsa sınırsız).
  if exists (
    select 1
    from jsonb_to_recordset(p_subjects) as r(subject_id uuid, correct int, wrong int, blank int)
    join public.subjects s on s.id = r.subject_id
    where coalesce(r.correct, 0) < 0 or coalesce(r.wrong, 0) < 0 or coalesce(r.blank, 0) < 0
      or (s.exam_question_count is not null
          and coalesce(r.correct, 0) + coalesce(r.wrong, 0) + coalesce(r.blank, 0) > s.exam_question_count)
  ) then
    raise exception 'count_exceeded' using errcode = '22023';
  end if;

  -- Konu işaretleri: şablonda ve ders satırı olan bir derse ait.
  if exists (
    select 1 from unnest(p_topic_ids) as t(topic_id)
    where not exists (
      select 1
      from public.topics tp
      join public.subjects s on s.id = tp.subject_id
      where tp.id = t.topic_id
        and s.template_id = v_template
        and s.id in (
          select r.subject_id
          from jsonb_to_recordset(p_subjects) as r(subject_id uuid, correct int, wrong int, blank int)
        )
    )
  ) then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;

  select coalesce(nullif(t.scoring ->> 'wrong_penalty', '')::smallint, 0) into v_penalty
  from public.curriculum_templates t where t.id = v_template;
  v_penalty := coalesce(v_penalty, 0);

  if v_id is null then
    insert into public.mock_exam_results (
      student_id, mock_exam_id, custom_title, subject_id, taken_on, duration_minutes,
      score, percentile, note, created_by
    )
    values (
      v_student, v_exam, v_custom_title, v_subject, (p_result ->> 'taken_on')::date,
      (p_result ->> 'duration_minutes')::int, (p_result ->> 'score')::numeric,
      (p_result ->> 'percentile')::numeric, nullif(btrim(coalesce(p_result ->> 'note', '')), ''),
      (select auth.uid())
    )
    returning id into v_id;
  else
    update public.mock_exam_results r
    set mock_exam_id = v_exam,
        custom_title = v_custom_title,
        subject_id = v_subject,
        taken_on = (p_result ->> 'taken_on')::date,
        duration_minutes = (p_result ->> 'duration_minutes')::int,
        score = (p_result ->> 'score')::numeric,
        percentile = (p_result ->> 'percentile')::numeric,
        note = nullif(btrim(coalesce(p_result ->> 'note', '')), '')
    where r.id = v_id and r.student_id = v_student;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'not_found' using errcode = '22023';
    end if;
    delete from public.mock_exam_subject_results where result_id = v_id;
    delete from public.mock_exam_topic_mistakes where result_id = v_id;
  end if;

  insert into public.mock_exam_subject_results (result_id, subject_id, correct_count, wrong_count, blank_count, wrong_penalty)
  select v_id, r.subject_id, coalesce(r.correct, 0), coalesce(r.wrong, 0), coalesce(r.blank, 0), v_penalty
  from jsonb_to_recordset(p_subjects) as r(subject_id uuid, correct int, wrong int, blank int);

  insert into public.mock_exam_topic_mistakes (result_id, topic_id)
  select distinct v_id, t.topic_id from unnest(p_topic_ids) as t(topic_id);

  return v_id;
end;
$$;

revoke execute on function public.save_mock_exam_result(jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.save_mock_exam_result(jsonb, jsonb, uuid[]) to authenticated;
