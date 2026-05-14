-- ABS Connect Phase 1 schema
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('caregiver', 'staff', 'admin');
exception
  when duplicate_object then null;
end $$;

alter type public.app_role add value if not exists 'caregiver';
alter type public.app_role add value if not exists 'staff';
alter type public.app_role add value if not exists 'admin';

do $$
begin
  create type public.document_status as enum (
    'not_started',
    'uploaded',
    'in_review',
    'accepted',
    'rejected',
    'sent_for_signature',
    'signed',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

alter type public.document_status add value if not exists 'not_started';
alter type public.document_status add value if not exists 'uploaded';
alter type public.document_status add value if not exists 'in_review';
alter type public.document_status add value if not exists 'accepted';
alter type public.document_status add value if not exists 'rejected';
alter type public.document_status add value if not exists 'sent_for_signature';
alter type public.document_status add value if not exists 'signed';
alter type public.document_status add value if not exists 'completed';

do $$
begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception
  when duplicate_object then null;
end $$;

alter type public.invitation_status add value if not exists 'pending';
alter type public.invitation_status add value if not exists 'accepted';
alter type public.invitation_status add value if not exists 'expired';
alter type public.invitation_status add value if not exists 'revoked';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'caregiver',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  external_patient_id text unique,
  status text not null default 'intake',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.child_caregivers (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  relationship text,
  is_authorized boolean not null default true,
  can_view_documents boolean not null default true,
  can_upload_documents boolean not null default true,
  created_at timestamptz not null default now(),
  unique(child_id, caregiver_id)
);

create table if not exists public.caregiver_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  child_id uuid not null references public.children(id) on delete cascade,
  relationship text,
  invited_by uuid references public.profiles(id),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  can_view_documents boolean not null default true,
  can_upload_documents boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.caregiver_invitations
  add column if not exists can_view_documents boolean not null default true,
  add column if not exists can_upload_documents boolean not null default true;

create table if not exists public.intake_document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  requires_upload boolean not null default true,
  requires_signature boolean not null default false,
  dropbox_template_id text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.child_intake_documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  template_id uuid not null references public.intake_document_templates(id) on delete cascade,
  status public.document_status not null default 'not_started',
  uploaded_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  file_path text,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  review_notes text,
  dropbox_signature_request_id text,
  dropbox_signature_status text,
  signed_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id, template_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  child_id uuid references public.children(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_child_caregivers_child_id on public.child_caregivers(child_id);
create index if not exists idx_child_caregivers_caregiver_id on public.child_caregivers(caregiver_id);
create index if not exists idx_child_documents_child_id on public.child_intake_documents(child_id);
create index if not exists idx_child_documents_status on public.child_intake_documents(status);
create index if not exists idx_child_documents_signature on public.child_intake_documents(dropbox_signature_request_id);
create index if not exists idx_invitations_token on public.caregiver_invitations(token);
create index if not exists idx_invitations_child_status on public.caregiver_invitations(child_id, status);
create index if not exists idx_audit_child_id_created_at on public.audit_logs(child_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_children_updated_at on public.children;

create trigger set_children_updated_at
before update on public.children
for each row execute function public.set_updated_at();

drop trigger if exists set_child_documents_updated_at on public.child_intake_documents;

create trigger set_child_documents_updated_at
before update on public.child_intake_documents
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff_user()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role in ('staff', 'admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_access_child(target_child_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.is_staff_user(), false)
    or exists (
      select 1
      from public.child_caregivers cc
      where cc.child_id = target_child_id
        and cc.caregiver_id = auth.uid()
        and cc.is_authorized = true
        and cc.can_view_documents = true
    );
$$;

create or replace function public.can_upload_child_documents(target_child_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.is_staff_user(), false)
    or exists (
      select 1
      from public.child_caregivers cc
      where cc.child_id = target_child_id
        and cc.caregiver_id = auth.uid()
        and cc.is_authorized = true
        and cc.can_upload_documents = true
    );
$$;

create or replace function public.promote_user_to_admin(target_email text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  target_user auth.users%rowtype;
begin
  select * into target_user from auth.users where email = target_email limit 1;
  if target_user.id is null then
    raise exception 'No auth user found for email %', target_email;
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (target_user.id, target_user.email, target_user.raw_user_meta_data->>'full_name', 'admin', true)
  on conflict (id) do update set role = 'admin', is_active = true, email = excluded.email;
end;
$$;

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.child_caregivers enable row level security;
alter table public.caregiver_invitations enable row level security;
alter table public.intake_document_templates enable row level security;
alter table public.child_intake_documents enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
drop policy if exists "profiles_select_self_or_staff" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self_name_or_staff" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_staff_update" on public.profiles;

create policy "profiles_select_self_or_staff" on public.profiles
for select using (id = auth.uid() or public.is_staff_user());

create policy "profiles_insert_self" on public.profiles
for insert with check (id = auth.uid() and role = 'caregiver');

create policy "profiles_update_self" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid() and role = 'caregiver');

create policy "profiles_staff_update" on public.profiles
for update using (public.is_staff_user())
with check (public.is_staff_user());

-- Children
drop policy if exists "children_select_authorized" on public.children;
drop policy if exists "children_staff_insert" on public.children;
drop policy if exists "children_staff_update" on public.children;

create policy "children_select_authorized" on public.children
for select using (public.can_access_child(id));

create policy "children_staff_insert" on public.children
for insert with check (public.is_staff_user());

create policy "children_staff_update" on public.children
for update using (public.is_staff_user()) with check (public.is_staff_user());

-- Child caregivers
drop policy if exists "child_caregivers_select_self_or_staff" on public.child_caregivers;
drop policy if exists "child_caregivers_staff_write" on public.child_caregivers;

create policy "child_caregivers_select_self_or_staff" on public.child_caregivers
for select using (caregiver_id = auth.uid() or public.is_staff_user());

create policy "child_caregivers_staff_write" on public.child_caregivers
for all using (public.is_staff_user()) with check (public.is_staff_user());

-- Invitations
drop policy if exists "invitations_staff_all" on public.caregiver_invitations;

create policy "invitations_staff_all" on public.caregiver_invitations
for all using (public.is_staff_user()) with check (public.is_staff_user());

-- Intake templates
drop policy if exists "templates_select_authenticated" on public.intake_document_templates;
drop policy if exists "templates_staff_write" on public.intake_document_templates;

create policy "templates_select_authenticated" on public.intake_document_templates
for select using (auth.uid() is not null and is_active = true or public.is_staff_user());

create policy "templates_staff_write" on public.intake_document_templates
for all using (public.is_staff_user()) with check (public.is_staff_user());

-- Child intake documents
drop policy if exists "documents_select_authorized_child" on public.child_intake_documents;
drop policy if exists "documents_insert_authorized_child" on public.child_intake_documents;
drop policy if exists "documents_staff_update" on public.child_intake_documents;

create policy "documents_select_authorized_child" on public.child_intake_documents
for select using (public.can_access_child(child_id));

create policy "documents_insert_authorized_child" on public.child_intake_documents
for insert with check (public.can_access_child(child_id));

create policy "documents_staff_update" on public.child_intake_documents
for update using (public.is_staff_user()) with check (public.is_staff_user());

-- Audit logs
drop policy if exists "audit_staff_select" on public.audit_logs;
drop policy if exists "audit_authenticated_insert" on public.audit_logs;

create policy "audit_staff_select" on public.audit_logs
for select using (public.is_staff_user());

create policy "audit_authenticated_insert" on public.audit_logs
for insert with check (auth.uid() is not null);

-- Private storage bucket for documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'intake-documents',
  'intake-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set public = false;

drop policy if exists "storage_read_authorized_child_folder" on storage.objects;
drop policy if exists "storage_insert_authorized_child_folder" on storage.objects;
drop policy if exists "storage_update_authorized_child_folder" on storage.objects;

create policy "storage_read_authorized_child_folder" on storage.objects
for select using (
  bucket_id = 'intake-documents'
  and public.can_access_child(((storage.foldername(name))[1])::uuid)
);

create policy "storage_insert_authorized_child_folder" on storage.objects
for insert with check (
  bucket_id = 'intake-documents'
  and public.can_upload_child_documents(((storage.foldername(name))[1])::uuid)
);

create policy "storage_update_authorized_child_folder" on storage.objects
for update using (
  bucket_id = 'intake-documents'
  and public.can_upload_child_documents(((storage.foldername(name))[1])::uuid)
);
