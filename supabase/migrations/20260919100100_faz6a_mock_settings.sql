-- Faz 6a: kurum ayarı `mock_exams` anahtarı (10-faz6-denemeler.md §1.2). "Son N deneme" penceresi,
-- mock_weak eşikleri (Parça 2) ve subjectGap deneme ağırlığı. Üst düzey anahtar olduğu için sığ
-- birleştirme yeter: mevcut kurumlara yalnızca eksik anahtar yazılır (mevcut değer kazanır).
-- Uygulama features/core/lib/org-settings.ts zod şemasıyla okur.

create or replace function private.default_org_settings()
returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'schedule', jsonb_build_object('wake_start', '08:00', 'wake_end', '22:00'),
    'planner', jsonb_build_object(
      'minutes_per_question', 1.5,
      'topic_study_minutes', 40, 'review_minutes', 20, 'link_minutes', 15, 'custom_minutes', 30,
      'questions_target', 20,
      'day_capacity_ratio', 0.7, 'max_items_per_subject_per_day', 2
    ),
    'alerts', jsonb_build_object(
      'lookback_days', 60,
      'knowledge_gap', jsonb_build_object('min_questions', 40, 'max_accuracy', 55),
      'low_accuracy', jsonb_build_object('min_questions', 20, 'max_accuracy', 60),
      'review_due_days', jsonb_build_array(7, 15, 30),
      'forgetting_risk', jsonb_build_object('min_accuracy', 60, 'idle_days', 21),
      'stale_days', 45,
      'neglected_subject_days', 10,
      'setup_account_days', 7
    ),
    'suggestions', jsonb_build_object('max_per_student', 5, 'dismiss_days', 14),
    'strategy', jsonb_build_object(
      'periods', jsonb_build_array(),
      'proximity_days', 120,
      'school_lag_weeks', 2,
      'topic_minutes_default', 90,
      'pace_window_days', 28,
      'topics_finish_weeks_before_exam', 8
    ),
    'mock_exams', jsonb_build_object(
      'recent_count', 3,
      'weak_min_marks', 2,
      'weak_min_mistakes', 3,
      'gap_weight', 0.5
    )
  )
$$;

revoke all on function private.default_org_settings() from public, anon, authenticated;

-- Mevcut kurumlara yalnızca eksik anahtar yazılır (mevcut değer kazanır).
update public.organizations
  set settings = private.default_org_settings() || settings;
