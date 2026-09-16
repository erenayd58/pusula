-- Faz 1a: bu fazda gereken enum tipleri (03-veri-modeli.md Bölüm 3).
-- Diğer enum'lar ilgili fazların migration'larında eklenir.

create type public.user_role       as enum ('owner', 'coach', 'student', 'parent');
create type public.student_status  as enum ('active', 'paused', 'archived');
create type public.parent_relation as enum ('mother', 'father', 'guardian', 'other');
create type public.consent_type    as enum ('privacy_notice', 'explicit_consent', 'photo_upload');
