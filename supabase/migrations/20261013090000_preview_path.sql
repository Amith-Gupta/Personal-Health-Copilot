-- Downscaled JPEG preview of each original, for fast viewing on phones.
alter table public.health_records add column if not exists preview_path text;
