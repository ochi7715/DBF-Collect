-- Dragon boat race document portal schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('team_contact', 'staff', 'admin');
exception
  when duplicate_object then null;
end $$;

alter type public.app_role add value if not exists 'team_contact';
alter type public.app_role add value if not exists 'staff';
alter type public.app_role add value if not exists 'admin';

do $$
begin
  create type public.team_contact_role as enum ('captain', 'manager', 'co_captain');
exception
  when duplicate_object then null;
end $$;

alter type public.team_contact_role add value if not exists 'captain';
alter type public.team_contact_role add value if not exists 'manager';
alter type public.team_contact_role add value if not exists 'co_captain';

do $$
begin
  create type public.race_category_rule as enum ('regular', 'usdboc', 'invitational');
exception
  when duplicate_object then null;
end $$;

alter type public.race_category_rule add value if not exists 'regular';
alter type public.race_category_rule add value if not exists 'usdboc';
alter type public.race_category_rule add value if not exists 'invitational';

do $$
begin
  create type public.document_scope as enum ('team', 'member');
exception
  when duplicate_object then null;
end $$;

alter type public.document_scope add value if not exists 'team';
alter type public.document_scope add value if not exists 'member';

do $$
begin
  create type public.document_form_code as enum ('A1', 'A2', 'B1', 'B2', 'C', 'D');
exception
  when duplicate_object then null;
end $$;

alter type public.document_form_code add value if not exists 'A1';
alter type public.document_form_code add value if not exists 'A2';
alter type public.document_form_code add value if not exists 'B1';
alter type public.document_form_code add value if not exists 'B2';
alter type public.document_form_code add value if not exists 'C';
alter type public.document_form_code add value if not exists 'D';

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
  avatar_url text,
  avatar_path text,
  role public.app_role not null default 'team_contact',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_path text;

alter table public.profiles
  alter column role set default 'team_contact';

update public.profiles
set role = 'team_contact'
where role::text = 'care' || 'giver';

create table if not exists public.race_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rule_set public.race_category_rule not null default 'regular',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  race_category_id uuid not null references public.race_categories(id),
  status text not null default 'registration',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, race_category_id)
);

create table if not exists public.team_contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  contact_role public.team_contact_role not null,
  is_authorized boolean not null default true,
  can_view_documents boolean not null default true,
  can_upload_documents boolean not null default true,
  created_at timestamptz not null default now(),
  unique(team_id, profile_id),
  unique(team_id, contact_role)
);

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  contact_role public.team_contact_role not null,
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

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, full_name)
);

create table if not exists public.document_forms (
  code public.document_form_code primary key,
  name text not null,
  description text,
  scope public.document_scope not null,
  requires_upload boolean not null default true,
  requires_signature boolean not null default false,
  dropbox_template_id text,
  template_file_path text,
  template_file_name text,
  template_mime_type text,
  template_file_size_bytes bigint,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_forms
  add column if not exists template_file_path text,
  add column if not exists template_file_name text,
  add column if not exists template_mime_type text,
  add column if not exists template_file_size_bytes bigint;

create table if not exists public.dragon_boat_documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete cascade,
  form_code public.document_form_code not null references public.document_forms(code),
  scope public.document_scope not null,
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
  constraint dragon_boat_documents_scope_member_check check (
    (scope = 'team' and team_member_id is null)
    or (scope = 'member' and team_member_id is not null)
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  team_id uuid references public.teams(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  request_method text,
  request_path text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists team_id uuid references public.teams(id),
  add column if not exists request_method text,
  add column if not exists request_path text,
  add column if not exists user_agent text;

create index if not exists idx_teams_category_id on public.teams(race_category_id);
create index if not exists idx_team_contacts_team_id on public.team_contacts(team_id);
create index if not exists idx_team_contacts_profile_id on public.team_contacts(profile_id);
create index if not exists idx_team_invitations_token on public.team_invitations(token);
create index if not exists idx_team_invitations_team_status on public.team_invitations(team_id, status);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_documents_team_id on public.dragon_boat_documents(team_id);
create index if not exists idx_documents_team_member_id on public.dragon_boat_documents(team_member_id);
create index if not exists idx_documents_status on public.dragon_boat_documents(status);
create index if not exists idx_documents_signature on public.dragon_boat_documents(dropbox_signature_request_id);
create unique index if not exists idx_documents_unique_team_form
  on public.dragon_boat_documents(team_id, form_code)
  where team_member_id is null;
create unique index if not exists idx_documents_unique_member_form
  on public.dragon_boat_documents(team_member_id, form_code)
  where team_member_id is not null;
create index if not exists idx_audit_team_id_created_at on public.audit_logs(team_id, created_at desc);
create index if not exists idx_audit_actor_id_created_at on public.audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_action_created_at on public.audit_logs(action, created_at desc);
create index if not exists idx_audit_created_at on public.audit_logs(created_at desc);

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

drop trigger if exists set_race_categories_updated_at on public.race_categories;
create trigger set_race_categories_updated_at
before update on public.race_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists set_document_forms_updated_at on public.document_forms;
create trigger set_document_forms_updated_at
before update on public.document_forms
for each row execute function public.set_updated_at();

drop trigger if exists set_dragon_boat_documents_updated_at on public.dragon_boat_documents;
create trigger set_dragon_boat_documents_updated_at
before update on public.dragon_boat_documents
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

create or replace function public.can_access_team(target_team_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.is_staff_user(), false)
    or exists (
      select 1
      from public.team_contacts tc
      where tc.team_id = target_team_id
        and tc.profile_id = auth.uid()
        and tc.is_authorized = true
        and tc.can_view_documents = true
    );
$$;

create or replace function public.can_upload_team_documents(target_team_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.is_staff_user(), false)
    or exists (
      select 1
      from public.team_contacts tc
      where tc.team_id = target_team_id
        and tc.profile_id = auth.uid()
        and tc.is_authorized = true
        and tc.can_upload_documents = true
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

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, avatar_path, role, is_active)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatar_path',
    'team_contact',
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        avatar_path = coalesce(public.profiles.avatar_path, excluded.avatar_path),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, email, full_name, avatar_url, avatar_path, role, is_active)
select
  users.id,
  users.email,
  users.raw_user_meta_data->>'full_name',
  users.raw_user_meta_data->>'avatar_url',
  users.raw_user_meta_data->>'avatar_path',
  'team_contact',
  true
from auth.users
where users.email is not null
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      avatar_path = coalesce(public.profiles.avatar_path, excluded.avatar_path),
      updated_at = now();

alter table public.profiles enable row level security;
alter table public.race_categories enable row level security;
alter table public.teams enable row level security;
alter table public.team_contacts enable row level security;
alter table public.team_invitations enable row level security;
alter table public.team_members enable row level security;
alter table public.document_forms enable row level security;
alter table public.dragon_boat_documents enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_self_or_staff" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_staff_update" on public.profiles;

create policy "profiles_select_self_or_staff" on public.profiles
for select using (id = auth.uid() or public.is_staff_user());

create policy "profiles_insert_self" on public.profiles
for insert with check (id = auth.uid() and role = 'team_contact');

create policy "profiles_update_self" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid() and role = 'team_contact');

create policy "profiles_staff_update" on public.profiles
for update using (public.is_staff_user())
with check (public.is_staff_user());

drop policy if exists "race_categories_select_authenticated" on public.race_categories;
drop policy if exists "race_categories_staff_write" on public.race_categories;

create policy "race_categories_select_authenticated" on public.race_categories
for select using ((auth.uid() is not null and is_active = true) or public.is_staff_user());

create policy "race_categories_staff_write" on public.race_categories
for all using (public.is_staff_user()) with check (public.is_staff_user());

drop policy if exists "teams_select_authorized" on public.teams;
drop policy if exists "teams_staff_insert" on public.teams;
drop policy if exists "teams_staff_update" on public.teams;

create policy "teams_select_authorized" on public.teams
for select using (public.can_access_team(id));

create policy "teams_staff_insert" on public.teams
for insert with check (public.is_staff_user());

create policy "teams_staff_update" on public.teams
for update using (public.is_staff_user()) with check (public.is_staff_user());

drop policy if exists "team_contacts_select_self_or_staff" on public.team_contacts;
drop policy if exists "team_contacts_staff_write" on public.team_contacts;

create policy "team_contacts_select_self_or_staff" on public.team_contacts
for select using (profile_id = auth.uid() or public.is_staff_user());

create policy "team_contacts_staff_write" on public.team_contacts
for all using (public.is_staff_user()) with check (public.is_staff_user());

drop policy if exists "team_invitations_staff_all" on public.team_invitations;

create policy "team_invitations_staff_all" on public.team_invitations
for all using (public.is_staff_user()) with check (public.is_staff_user());

drop policy if exists "team_members_select_authorized" on public.team_members;
drop policy if exists "team_members_insert_uploaders" on public.team_members;
drop policy if exists "team_members_update_uploaders" on public.team_members;

create policy "team_members_select_authorized" on public.team_members
for select using (public.can_access_team(team_id));

create policy "team_members_insert_uploaders" on public.team_members
for insert with check (public.can_upload_team_documents(team_id));

create policy "team_members_update_uploaders" on public.team_members
for update using (public.can_upload_team_documents(team_id))
with check (public.can_upload_team_documents(team_id));

drop policy if exists "document_forms_select_authenticated" on public.document_forms;
drop policy if exists "document_forms_staff_write" on public.document_forms;

create policy "document_forms_select_authenticated" on public.document_forms
for select using ((auth.uid() is not null and is_active = true) or public.is_staff_user());

create policy "document_forms_staff_write" on public.document_forms
for all using (public.is_staff_user()) with check (public.is_staff_user());

drop policy if exists "documents_select_authorized_team" on public.dragon_boat_documents;
drop policy if exists "documents_insert_authorized_team" on public.dragon_boat_documents;
drop policy if exists "documents_update_uploaders" on public.dragon_boat_documents;

create policy "documents_select_authorized_team" on public.dragon_boat_documents
for select using (public.can_access_team(team_id));

create policy "documents_insert_authorized_team" on public.dragon_boat_documents
for insert with check (public.can_access_team(team_id));

create policy "documents_update_uploaders" on public.dragon_boat_documents
for update using (public.can_upload_team_documents(team_id))
with check (public.can_upload_team_documents(team_id));

drop policy if exists "audit_staff_select" on public.audit_logs;

create policy "audit_staff_select" on public.audit_logs
for select using (public.is_staff_user());

-- Audit logs are written by server-side code with the service role key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_insert_own_folder" on storage.objects;
drop policy if exists "avatars_update_own_folder" on storage.objects;
drop policy if exists "avatars_delete_own_folder" on storage.objects;

create policy "avatars_select_public" on storage.objects
for select using (bucket_id = 'profile-avatars');

create policy "avatars_insert_own_folder" on storage.objects
for insert with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_update_own_folder" on storage.objects
for update using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_delete_own_folder" on storage.objects
for delete using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'race-documents',
  'race-documents',
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
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_read_authorized_team_folder" on storage.objects;
drop policy if exists "storage_insert_authorized_team_folder" on storage.objects;
drop policy if exists "storage_update_authorized_team_folder" on storage.objects;

create policy "storage_read_authorized_team_folder" on storage.objects
for select using (
  bucket_id = 'race-documents'
  and public.can_access_team(((storage.foldername(name))[1])::uuid)
);

create policy "storage_insert_authorized_team_folder" on storage.objects
for insert with check (
  bucket_id = 'race-documents'
  and public.can_upload_team_documents(((storage.foldername(name))[1])::uuid)
);

create policy "storage_update_authorized_team_folder" on storage.objects
for update using (
  bucket_id = 'race-documents'
  and public.can_upload_team_documents(((storage.foldername(name))[1])::uuid)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-templates',
  'form-templates',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "form_templates_read_authenticated" on storage.objects;
drop policy if exists "form_templates_staff_insert" on storage.objects;
drop policy if exists "form_templates_staff_update" on storage.objects;

create policy "form_templates_read_authenticated" on storage.objects
for select using (
  bucket_id = 'form-templates'
  and auth.uid() is not null
);

create policy "form_templates_staff_insert" on storage.objects
for insert with check (
  bucket_id = 'form-templates'
  and public.is_staff_user()
);

create policy "form_templates_staff_update" on storage.objects
for update using (
  bucket_id = 'form-templates'
  and public.is_staff_user()
) with check (
  bucket_id = 'form-templates'
  and public.is_staff_user()
);
