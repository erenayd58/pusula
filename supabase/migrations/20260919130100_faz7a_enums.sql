-- Faz 7a: enum'lar (11-faz7-kaynaklar.md §1.1).
--   resource_type    kitap türü
--   plan_item_kind   + 'section' (kaynak testi), + 'video'
-- Yeni enum değeri aynı transaction'da kullanılamadığı için ("unsafe use of new value") bu
-- dosya yalnızca tip değişikliği içerir; tablolar ve RPC'ler sonraki migration'larda (karar A13 kalıbı).

create type public.resource_type as enum ('lecture_book', 'question_bank', 'worksheet', 'booklet', 'mock_book', 'other');

alter type public.plan_item_kind add value 'section';
alter type public.plan_item_kind add value 'video';
