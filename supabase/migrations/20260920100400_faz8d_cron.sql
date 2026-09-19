-- Faz 8d: zamanlanmış işler (12-faz8-veli-bildirim.md §1.4; 02 §10). pg_cron UTC ile çalışır,
-- İstanbul sabit UTC+3 (yaz saati yok). İşler postgres olarak koşar (RLS'yi geçer); fonksiyonlar
-- private.* security definer, hiçbir role execute verilmez. Metin üretilmez, yalnızca olgu (E2).
--   send_daily_reminders  07:30  tekrar zamanı gelen konular → öğrenci (review_due); 90 günlük saklama
--   detect_inactivity     21:00  hareketsizlik → koç (student_inactive; dedupe inactivity_notify_days)
--   generate_weekly_summaries  Pazar 20:00  haftalık özet → öğrenci, velileri, koç (toplu)

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

-- 1. Günlük: tekrar hatırlatması + saklama -------------------------------------------------------

create or replace function private.send_daily_reminders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select
      q.student_id,
      count(*)::int as cnt,
      (array_agg(q.topic_name order by q.overdue_days desc, q.subject_name, q.topic_name))[1:3] as topics
    from public.v_review_queue q
    join public.students s on s.profile_id = q.student_id
    where s.status = 'active'
      and coalesce(
        (select m.enabled from public.student_modules m
          where m.student_id = s.profile_id and m.module_id = 'topics'),
        true
      )
    group by q.student_id
  loop
    if private.notify(
      r.student_id,
      'review_due',
      r.student_id,
      jsonb_build_object('count', r.cnt, 'topics', to_jsonb(r.topics)),
      interval '20 hours'
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  -- Saklama: 90 günden eski bildirimler silinir (teknik sabit; uyarı eşiği değil).
  delete from public.notifications where created_at < now() - interval '90 days';

  return v_count;
end;
$$;

revoke all on function private.send_daily_reminders() from public, anon, authenticated;

-- 2. Günlük: hareketsizlik → koç -------------------------------------------------------------------

create or replace function private.detect_inactivity()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select
      s.profile_id as student_id,
      s.coach_id,
      (t.d - ll.last_log_date)::int as days,
      coalesce((o.settings #>> '{student_alerts,inactivity_notify_days}')::int, 7) as notify_days
    from public.students s
    join public.organizations o on o.id = s.organization_id
    join (
      select student_id, max(log_date) as last_log_date
      from public.question_logs
      group by student_id
    ) ll on ll.student_id = s.profile_id
    cross join (select (now() at time zone 'Europe/Istanbul')::date as d) t
    where s.status = 'active'
      and (t.d - ll.last_log_date) >= coalesce((o.settings #>> '{student_alerts,inactivity_days}')::int, 3)
  loop
    if private.notify(
      r.coach_id,
      'student_inactive',
      r.student_id,
      jsonb_build_object('days', r.days),
      make_interval(days => r.notify_days)
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.detect_inactivity() from public, anon, authenticated;

-- 3. Haftalık özet ---------------------------------------------------------------------------------
-- Bu ISO haftası (pazartesi … çalıştığı an). Öğrenci başına: soru, süre, plan, biten konu, son net →
-- öğrenci + velileri; koç başına tek toplu satır (student_id null). Dedupe 6 gün (haftada bir).

create or replace function private.generate_weekly_summaries()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week date := (date_trunc('week', (now() at time zone 'Europe/Istanbul')::date))::date;
  r record;
  c record;
  v_data jsonb;
  v_parent uuid;
  v_count int := 0;
begin
  for r in
    select
      s.profile_id as student_id,
      s.coach_id,
      p.full_name,
      coalesce((select sum(d.questions)::int from public.v_student_daily_summary d
        where d.student_id = s.profile_id and d.day >= v_week and d.day < v_week + 7), 0) as questions,
      coalesce((select sum(d.study_minutes)::int from public.v_student_daily_summary d
        where d.student_id = s.profile_id and d.day >= v_week and d.day < v_week + 7), 0) as study_minutes,
      pc.items_total as plan_total,
      pc.items_completed as plan_done,
      pc.percent as plan_percent,
      (select count(*)::int from public.student_topic_progress tp
        where tp.student_id = s.profile_id
          and tp.status in ('completed', 'mastered')
          and tp.completed_at is not null
          and (tp.completed_at at time zone 'Europe/Istanbul')::date >= v_week
          and (tp.completed_at at time zone 'Europe/Istanbul')::date < v_week + 7) as topics_done,
      ov.last_net
    from public.students s
    join public.profiles p on p.id = s.profile_id
    left join public.v_plan_completion pc
      on pc.student_id = s.profile_id and pc.week_start = v_week and pc.status = 'published'
    left join public.v_coach_student_overview ov on ov.student_id = s.profile_id
    where s.status = 'active'
    order by p.full_name
  loop
    v_data := jsonb_build_object(
      'week_start', v_week,
      'questions', r.questions,
      'study_minutes', r.study_minutes,
      'plan_total', r.plan_total,
      'plan_done', r.plan_done,
      'plan_percent', r.plan_percent,
      'topics_done', r.topics_done,
      'last_net', r.last_net
    );
    if private.notify(r.student_id, 'weekly_summary', r.student_id, v_data, interval '6 days') is not null then
      v_count := v_count + 1;
    end if;
    for v_parent in
      select sp.parent_id from public.student_parents sp where sp.student_id = r.student_id
    loop
      if private.notify(v_parent, 'weekly_summary', r.student_id, v_data, interval '6 days') is not null then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- Koç başına toplu özet.
  for c in
    select
      s.coach_id,
      jsonb_agg(jsonb_build_object(
        'student_id', s.profile_id,
        'name', p.full_name,
        'questions', coalesce((select sum(d.questions)::int from public.v_student_daily_summary d
          where d.student_id = s.profile_id and d.day >= v_week and d.day < v_week + 7), 0),
        'plan_percent', pc.percent
      ) order by p.full_name) as students,
      count(*)::int as student_count,
      coalesce(sum((select sum(d.questions)::int from public.v_student_daily_summary d
        where d.student_id = s.profile_id and d.day >= v_week and d.day < v_week + 7)), 0)::int as questions,
      round(avg(pc.percent))::int as plan_percent_avg
    from public.students s
    join public.profiles p on p.id = s.profile_id
    left join public.v_plan_completion pc
      on pc.student_id = s.profile_id and pc.week_start = v_week and pc.status = 'published'
    where s.status = 'active'
    group by s.coach_id
  loop
    if private.notify(
      c.coach_id,
      'weekly_summary',
      null,
      jsonb_build_object(
        'week_start', v_week,
        'students', c.students,
        'totals', jsonb_build_object(
          'students', c.student_count,
          'questions', c.questions,
          'plan_percent_avg', c.plan_percent_avg
        )
      ),
      interval '6 days'
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.generate_weekly_summaries() from public, anon, authenticated;

-- 4. Zamanlama (UTC; ad tekil, yeniden koşulunca günceller) ---------------------------------------

select cron.schedule('pusula_daily_reminders', '30 4 * * *', $$select private.send_daily_reminders()$$);
select cron.schedule('pusula_detect_inactivity', '0 18 * * *', $$select private.detect_inactivity()$$);
select cron.schedule('pusula_weekly_summaries', '0 17 * * 0', $$select private.generate_weekly_summaries()$$);
