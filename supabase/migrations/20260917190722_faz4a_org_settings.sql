-- Faz 4a: kurum ayarı varsayılanları (08-faz4-plan-sistemi.md §1.2).
-- Eşikler ve varsayılan süreler koda gömülmez: mevcut kurumlara varsayılanlar yazılır
-- (mevcut anahtar kazanır), kolon varsayılanı da aynı JSON olur. Uygulama
-- features/core/lib/org-settings.ts zod şemasıyla okur; oradaki .default() değerleri
-- yalnızca eksik anahtar güvencesidir.

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
      'neglected_subject_days', 10
    ),
    'suggestions', jsonb_build_object('max_per_student', 5, 'dismiss_days', 14)
  )
$$;

-- Yalnızca migration ve kolon varsayılanı kullanır; API'ye açılmaz (default privileges zaten kapalı).
revoke all on function private.default_org_settings() from public, anon, authenticated;

update public.organizations
  set settings = private.default_org_settings() || settings;

alter table public.organizations
  alter column settings set default private.default_org_settings();
