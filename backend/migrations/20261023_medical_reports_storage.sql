-- ============================================================
-- Medical Reports: private Supabase Storage bucket
-- Date: 2026-10-23
--
-- The live project already contains public.medical_reports with
-- owner-scoped RLS for SELECT, INSERT and DELETE. This migration does
-- not recreate that table or change its data.
--
-- Run this once in the Supabase SQL editor if the bucket is missing.
-- The bucket is private on purpose: the FastAPI backend uploads and
-- downloads with the server-only service-role key after resolving the
-- patient from the verified JWT. No anon/authenticated storage policy is
-- granted, so browsers cannot list or read objects directly.
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'medical-reports',
    'medical-reports',
    false,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Keeps the existing metadata table protected even if a future manual
-- change accidentally disables RLS. Existing owner policies remain intact.
alter table public.medical_reports enable row level security;
