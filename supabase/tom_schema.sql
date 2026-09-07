-- ============================================================================
-- TOM MECHANISM SHOWCASE — Fully Corrected Supabase Schema
-- ============================================================================

-- 1. EXTENSIONS & SCHEMA PERMISSIONS
create extension if not exists "pgcrypto";
grant usage on schema public to anon, authenticated, service_role;

-- 2. CREATE TABLES
create table if not exists public.tom_mechanisms (
  id                             uuid primary key default gen_random_uuid(),
  created_at                     timestamptz not null default now(),

  -- Basic Information
  name                           text not null,
  category                       text not null,
  short_description              text,
  detailed_description           text,
  working_principle              text,
  applications                   text,

  -- Technical Information
  num_links                      integer,
  num_joints                     integer,
  kinematic_pairs                text,
  degrees_of_freedom             integer,
  input_link                     text,
  output_link                    text,
  additional_technical_details   text,

  -- Student Information (contributors)
  student_name                   text,
  team_members                   text,
  department                     text default 'Mechanical Engineering',
  college                        text default 'NMIET',
  academic_year                  text,

  -- Misc
  external_links                 jsonb not null default '[]'::jsonb,
  cover_image                    text,
  status                         text not null default 'pending'
                                    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists tom_mechanisms_status_idx   on public.tom_mechanisms (status);
create index if not exists tom_mechanisms_category_idx on public.tom_mechanisms (category);

create table if not exists public.tom_mechanism_media (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  mechanism_id   uuid not null references public.tom_mechanisms (id) on delete cascade,
  file_type      text not null check (file_type in
                   ('image', 'drawing', 'video', 'animation', 'cad', 'document', 'other')),
  file_name      text not null,
  file_path      text not null,
  file_url       text not null
);

create index if not exists tom_mechanism_media_mechanism_idx
  on public.tom_mechanism_media (mechanism_id);

-- 3. GRANT PERMISSIONS TO POSTGREST (CRITICAL: FIXES SCHEMA CACHE ERROR)
grant all on table public.tom_mechanisms to anon, authenticated, service_role;
grant all on table public.tom_mechanism_media to anon, authenticated, service_role;

-- 4. ROW LEVEL SECURITY (SAFE DROP & RECREATE POLICIES)
alter table public.tom_mechanisms      enable row level security;
alter table public.tom_mechanism_media enable row level security;

drop policy if exists "tom_mechanisms_select_all" on public.tom_mechanisms;
create policy "tom_mechanisms_select_all" on public.tom_mechanisms
  for select using (true);

drop policy if exists "tom_mechanisms_insert_public" on public.tom_mechanisms;
create policy "tom_mechanisms_insert_public" on public.tom_mechanisms
  for insert with check (true);

drop policy if exists "tom_mechanisms_update_public" on public.tom_mechanisms;
create policy "tom_mechanisms_update_public" on public.tom_mechanisms
  for update using (true);

drop policy if exists "tom_mechanisms_delete_public" on public.tom_mechanisms;
create policy "tom_mechanisms_delete_public" on public.tom_mechanisms
  for delete using (true);

drop policy if exists "tom_media_select_all" on public.tom_mechanism_media;
create policy "tom_media_select_all" on public.tom_mechanism_media
  for select using (true);

drop policy if exists "tom_media_insert_public" on public.tom_mechanism_media;
create policy "tom_media_insert_public" on public.tom_mechanism_media
  for insert with check (true);

drop policy if exists "tom_media_delete_public" on public.tom_mechanism_media;
create policy "tom_media_delete_public" on public.tom_mechanism_media
  for delete using (true);

-- 5. STORAGE BUCKET (tom-media)
insert into storage.buckets (id, name, public)
values ('tom-media', 'tom-media', true)
on conflict (id) do update set public = true;

drop policy if exists "tom_media_bucket_read" on storage.objects;
create policy "tom_media_bucket_read" on storage.objects
  for select using (bucket_id = 'tom-media');

drop policy if exists "tom_media_bucket_insert" on storage.objects;
create policy "tom_media_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'tom-media');

drop policy if exists "tom_media_bucket_delete" on storage.objects;
create policy "tom_media_bucket_delete" on storage.objects
  for delete using (bucket_id = 'tom-media');

-- 6. FORCE POSTGREST SCHEMA CACHE RELOAD IMMEDIATELY
notify pgrst, 'reload schema';