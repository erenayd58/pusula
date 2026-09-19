-- Faz 7b düzeltme: `video_playlists_youtube_scope_uniq` (nulls not distinct) elle kurulan listeleri
-- (youtube_playlist_id null) de tekilleştiriyordu → aynı kapsamda ikinci elle liste 23505. Kısıt
-- kaldırılır; tekillik yalnızca YouTube kimliği olan listeler için kısmi indeksle (student_id null =
-- katalog, dolu = öğrencinin özeli; nulls not distinct).

alter table public.video_playlists drop constraint video_playlists_youtube_scope_uniq;

create unique index video_playlists_youtube_scope_uniq
  on public.video_playlists (organization_id, youtube_playlist_id, student_id)
  nulls not distinct
  where youtube_playlist_id is not null;
