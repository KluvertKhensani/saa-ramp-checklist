-- ============================================================
-- SAA Ramp Checklist
-- Supabase PostgreSQL schema, triggers and RLS policies
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Utility functions
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ============================================================
-- User profiles
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  employee_number text,
  job_title text,
  station text,
  role text not null default 'controller'
    check (role in ('administrator', 'manager', 'controller', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Automatically create a profile after registration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'controller'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================
-- Ramp checklist headers
-- ============================================================

create table if not exists public.ramp_checklists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  flight_in text,
  flight_out text,
  flight_date date,
  bay text,
  aircraft_type text,
  registration text,

  sta time,
  eta time,
  ata time,
  chocks_on time,
  std time,

  trc_coordinator text,

  checklist_status text not null default 'draft'
    check (
      checklist_status in (
        'draft',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  active_tab text not null default 'All',
  last_saved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint flight_in_length check (
    flight_in is null or char_length(flight_in) <= 20
  ),
  constraint flight_out_length check (
    flight_out is null or char_length(flight_out) <= 20
  ),
  constraint bay_length check (
    bay is null or char_length(bay) <= 20
  ),
  constraint registration_length check (
    registration is null or char_length(registration) <= 20
  )
);

create index if not exists ramp_checklists_owner_id_idx
on public.ramp_checklists(owner_id);

create index if not exists ramp_checklists_flight_date_idx
on public.ramp_checklists(flight_date desc);

create index if not exists ramp_checklists_flight_out_idx
on public.ramp_checklists(flight_out);

create index if not exists ramp_checklists_registration_idx
on public.ramp_checklists(registration);

alter table public.ramp_checklists enable row level security;

drop policy if exists "Users can view own checklists"
on public.ramp_checklists;

create policy "Users can view own checklists"
on public.ramp_checklists
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create own checklists"
on public.ramp_checklists;

create policy "Users can create own checklists"
on public.ramp_checklists
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update own checklists"
on public.ramp_checklists;

create policy "Users can update own checklists"
on public.ramp_checklists
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own checklists"
on public.ramp_checklists;

create policy "Users can delete own checklists"
on public.ramp_checklists
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop trigger if exists ramp_checklists_set_updated_at
on public.ramp_checklists;

create trigger ramp_checklists_set_updated_at
before update on public.ramp_checklists
for each row
execute function public.set_updated_at();

-- ============================================================
-- Checklist activity rows
-- ============================================================

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),

  checklist_id uuid not null
    references public.ramp_checklists(id)
    on delete cascade,

  item_index integer not null check (item_index >= 0),
  phase text not null,
  activity text not null,

  base_time text not null
    check (base_time in ('chocks', 'std')),

  offset_seconds integer not null default 0,
  planned_time time,
  actual_time time,
  delay_seconds integer,

  item_status text not null default 'pending'
    check (
      item_status in (
        'pending',
        'ontime',
        'light',
        'delay'
      )
    ),

  observation text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  unique (checklist_id, item_index)
);

create index if not exists checklist_items_checklist_id_idx
on public.checklist_items(checklist_id);

create index if not exists checklist_items_status_idx
on public.checklist_items(item_status);

alter table public.checklist_items enable row level security;

drop policy if exists "Users can view items from own checklists"
on public.checklist_items;

create policy "Users can view items from own checklists"
on public.checklist_items
for select
to authenticated
using (
  exists (
    select 1
    from public.ramp_checklists checklist
    where checklist.id = checklist_items.checklist_id
      and checklist.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can create items for own checklists"
on public.checklist_items;

create policy "Users can create items for own checklists"
on public.checklist_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ramp_checklists checklist
    where checklist.id = checklist_items.checklist_id
      and checklist.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can update items from own checklists"
on public.checklist_items;

create policy "Users can update items from own checklists"
on public.checklist_items
for update
to authenticated
using (
  exists (
    select 1
    from public.ramp_checklists checklist
    where checklist.id = checklist_items.checklist_id
      and checklist.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.ramp_checklists checklist
    where checklist.id = checklist_items.checklist_id
      and checklist.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete items from own checklists"
on public.checklist_items;

create policy "Users can delete items from own checklists"
on public.checklist_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.ramp_checklists checklist
    where checklist.id = checklist_items.checklist_id
      and checklist.owner_id = (select auth.uid())
  )
);

drop trigger if exists checklist_items_set_updated_at
on public.checklist_items;

create trigger checklist_items_set_updated_at
before update on public.checklist_items
for each row
execute function public.set_updated_at();

-- ============================================================
-- User schedule templates
-- ============================================================

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_name text not null default 'Default Schedule',
  schedule_offsets jsonb not null default '[]'::jsonb,
  is_default boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists schedule_templates_owner_id_idx
on public.schedule_templates(owner_id);

alter table public.schedule_templates enable row level security;

drop policy if exists "Users can view own schedule templates"
on public.schedule_templates;

create policy "Users can view own schedule templates"
on public.schedule_templates
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create own schedule templates"
on public.schedule_templates;

create policy "Users can create own schedule templates"
on public.schedule_templates
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update own schedule templates"
on public.schedule_templates;

create policy "Users can update own schedule templates"
on public.schedule_templates
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own schedule templates"
on public.schedule_templates;

create policy "Users can delete own schedule templates"
on public.schedule_templates
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop trigger if exists schedule_templates_set_updated_at
on public.schedule_templates;

create trigger schedule_templates_set_updated_at
before update on public.schedule_templates
for each row
execute function public.set_updated_at();

-- ============================================================
-- Audit log
-- ============================================================

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  checklist_id uuid references public.ramp_checklists(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_owner_id_idx
on public.audit_logs(owner_id);

create index if not exists audit_logs_checklist_id_idx
on public.audit_logs(checklist_id);

create index if not exists audit_logs_created_at_idx
on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Users can view own audit events"
on public.audit_logs;

create policy "Users can view own audit events"
on public.audit_logs
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create own audit events"
on public.audit_logs;

create policy "Users can create own audit events"
on public.audit_logs
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

-- No browser update or delete policies are deliberately provided
-- for audit logs.

-- ============================================================
-- Grants
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
on public.profiles
to authenticated;

grant select, insert, update, delete
on public.ramp_checklists
to authenticated;

grant select, insert, update, delete
on public.checklist_items
to authenticated;

grant select, insert, update, delete
on public.schedule_templates
to authenticated;

grant select, insert
on public.audit_logs
to authenticated;

grant usage, select
on sequence public.audit_logs_id_seq
to authenticated;
