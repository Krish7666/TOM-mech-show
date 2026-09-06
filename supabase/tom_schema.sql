-- ============================================================================
-- TOM MECHANISM SHOWCASE — Supabase schema
-- Run this once in your Supabase project's SQL editor.
-- Mirrors the existing "projects" table's approach: no Supabase Auth, a single
-- shared admin flag on the client, and RLS policies open enough for the anon
-- key to do everything the UI needs (see SECURITY NOTE at the bottom).
-- ============================================================================

-- 1. MECHANISMS ---------------------------------------------------------------
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
  num_higher_pairs               integer default 0,  -- H term in Grubler's equation, used by the live DOF calculator
  kinematic_pairs                text,
  degrees_of_freedom             integer,             -- declared DOF shown on the spec card (may differ from the live calculator's result)
  input_link                     text,
  output_link                    text,
  additional_technical_details   text,
  mechanism_type                 text,                -- optional hint for the live-preview renderer, e.g. "pick-and-place"

  -- Student Information (contributors)
  student_name                   text,
  team_members                   text,
  department                     text,
  college                        text,
  academic_year                  text,

  -- Misc
  external_links                 jsonb not null default '[]'::jsonb,
  cover_image                    text,               -- optional, auto-set to first uploaded image
  video_url                      text,               -- optional external video embed (e.g. YouTube /embed/ URL)
  animation_description          text,               -- short caption shown under the live preview
  status                         text not null default 'pending'
                                    check (status in ('pending', 'approved', 'rejected'))
);

-- If you already ran an earlier version of this file, these bring an existing
-- table up to date without losing data (safe to re-run either way).
alter table public.tom_mechanisms add column if not exists num_higher_pairs      integer default 0;
alter table public.tom_mechanisms add column if not exists mechanism_type       text;
alter table public.tom_mechanisms add column if not exists video_url            text;
alter table public.tom_mechanisms add column if not exists animation_description text;

create index if not exists tom_mechanisms_status_idx   on public.tom_mechanisms (status);
create index if not exists tom_mechanisms_category_idx on public.tom_mechanisms (category);

-- 2. MECHANISM MEDIA ------------------------------------------------------------
create table if not exists public.tom_mechanism_media (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  mechanism_id   uuid not null references public.tom_mechanisms (id) on delete cascade,
  file_type      text not null check (file_type in
                   ('image', 'drawing', 'video', 'animation', 'cad', 'document', 'other')),
  file_name      text not null,
  file_path      text not null,   -- path inside the "tom-media" storage bucket
  file_url       text not null    -- cached public URL
);

create index if not exists tom_mechanism_media_mechanism_idx
  on public.tom_mechanism_media (mechanism_id);

-- 3. ROW LEVEL SECURITY ----------------------------------------------------------
alter table public.tom_mechanisms      enable row level security;
alter table public.tom_mechanism_media enable row level security;

-- Anyone can read approved mechanisms; the app filters pending/rejected out for
-- non-admins client-side, so pending rows are still readable by anon here —
-- acceptable for a student showcase, same trust model as the existing "projects"
-- table. Tighten this if you need pending submissions to stay private.
create policy "tom_mechanisms_select_all" on public.tom_mechanisms
  for select using (true);

create policy "tom_mechanisms_insert_public" on public.tom_mechanisms
  for insert with check (true);

create policy "tom_mechanisms_update_public" on public.tom_mechanisms
  for update using (true);

create policy "tom_mechanisms_delete_public" on public.tom_mechanisms
  for delete using (true);

create policy "tom_media_select_all" on public.tom_mechanism_media
  for select using (true);

create policy "tom_media_insert_public" on public.tom_mechanism_media
  for insert with check (true);

create policy "tom_media_delete_public" on public.tom_mechanism_media
  for delete using (true);

-- ============================================================================
-- 4. STORAGE BUCKET (run separately, or via Dashboard → Storage → New bucket)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('tom-media', 'tom-media', true)
on conflict (id) do nothing;

create policy "tom_media_bucket_read" on storage.objects
  for select using (bucket_id = 'tom-media');

create policy "tom_media_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'tom-media');

create policy "tom_media_bucket_delete" on storage.objects
  for delete using (bucket_id = 'tom-media');

-- ============================================================================
-- SECURITY NOTE (read before deploying)
-- ----------------------------------------------------------------------------
-- Just like the existing "projects" table, admin status here is a client-side
-- flag (ADMIN_PASSWORD checked in the browser, then a localStorage flag).
-- The RLS policies above are permissive (anon can insert/update/delete) because
-- there is no server-side way to verify "isAdmin" without adding real Supabase
-- Auth. In practice this means anyone who opens devtools could call the same
-- delete/approve endpoints directly, bypassing the UI gate — exactly as is
-- already true for deleting a project today. If you want real enforcement
-- (e.g. so only you can approve/reject/delete), the fix is to move to Supabase
-- Auth + an "is_admin" claim and rewrite these policies to check auth.uid().
-- That is a bigger change than this feature adds, so it's called out here
-- rather than silently done for you.
-- ============================================================================
