begin;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select lower(trim(profile.role))
  from public.profiles as profile
  where profile.id = auth.uid();
$function$;

create or replace function public.can_operate_ramp_checklists()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and public.current_user_role() in (
      'administrator',
      'occ_manager',
      'controller',
      'trc_coordinator',
      'turnaround_coordinator',
      'ramp_agent',
      'duty_officer',
      'station_manager'
    );
$function$;

create or replace function public.can_view_ramp_checklists()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and public.current_user_role() in (
      'administrator',
      'occ_manager',
      'controller',
      'qa_inspector',
      'trc_coordinator',
      'turnaround_coordinator',
      'ramp_agent',
      'auditor',
      'viewer',
      'data_analyst',
      'duty_officer',
      'station_manager',
      'senior_manager'
    );
$function$;

create or replace function public.can_view_ramp_audit_logs()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and public.current_user_role() in (
      'administrator',
      'occ_manager',
      'controller',
      'qa_inspector',
      'trc_coordinator',
      'turnaround_coordinator',
      'auditor',
      'data_analyst',
      'station_manager',
      'senior_manager'
    );
$function$;

create or replace function public.can_approve_ramp_checklists()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and public.current_user_role() in (
      'administrator',
      'occ_manager',
      'controller',
      'qa_inspector',
      'trc_coordinator',
      'turnaround_coordinator'
    );
$function$;

create or replace function public.can_undo_ramp_tasks()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and public.current_user_role() in (
      'administrator',
      'occ_manager',
      'controller',
      'trc_coordinator',
      'turnaround_coordinator',
      'ramp_agent'
    );
$function$;

revoke all
on function public.current_user_role()
from public;

revoke all
on function public.can_operate_ramp_checklists()
from public;

revoke all
on function public.can_view_ramp_checklists()
from public;

revoke all
on function public.can_view_ramp_audit_logs()
from public;

revoke all
on function public.can_approve_ramp_checklists()
from public;

revoke all
on function public.can_undo_ramp_tasks()
from public;

grant execute
on function public.current_user_role()
to authenticated;

grant execute
on function public.can_operate_ramp_checklists()
to authenticated;

grant execute
on function public.can_view_ramp_checklists()
to authenticated;

grant execute
on function public.can_view_ramp_audit_logs()
to authenticated;

grant execute
on function public.can_approve_ramp_checklists()
to authenticated;

grant execute
on function public.can_undo_ramp_tasks()
to authenticated;

drop policy if exists
  "Users can create own checklists"
on public.ramp_checklists;

drop policy if exists
  "Operational users can create own checklists"
on public.ramp_checklists;

drop policy if exists
  "Users can view own checklists"
on public.ramp_checklists;

drop policy if exists
  "Users can read permitted checklists"
on public.ramp_checklists;

drop policy if exists
  "Operational roles can view ramp checklists"
on public.ramp_checklists;

drop policy if exists
  "Users can update own unlocked checklists"
on public.ramp_checklists;

drop policy if exists
  "Operational roles can update ramp checklists"
on public.ramp_checklists;

drop policy if exists
  "Users can delete own checklists"
on public.ramp_checklists;

create policy
  "Authorised roles can create own ramp checklists"
on public.ramp_checklists
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.can_operate_ramp_checklists()
);

create policy
  "Authorised roles can view ramp checklists"
on public.ramp_checklists
for select
to authenticated
using (
  public.can_view_ramp_checklists()
);

create policy
  "Operational roles can update unlocked ramp checklists"
on public.ramp_checklists
for update
to authenticated
using (
  public.can_operate_ramp_checklists()
  and coalesce(is_locked, false) = false
)
with check (
  public.can_operate_ramp_checklists()
  and coalesce(is_locked, false) = false
);

create policy
  "Checklist owners with operational roles can delete unlocked drafts"
on public.ramp_checklists
for delete
to authenticated
using (
  owner_id = auth.uid()
  and public.can_operate_ramp_checklists()
  and coalesce(is_locked, false) = false
  and checklist_status = 'draft'
);

drop policy if exists
  "Users can create own checklist items"
on public.ramp_checklist_items;

drop policy if exists
  "Operational roles can insert ramp checklist items"
on public.ramp_checklist_items;

drop policy if exists
  "Users can read permitted checklist items"
on public.ramp_checklist_items;

drop policy if exists
  "Operational roles can view ramp checklist items"
on public.ramp_checklist_items;

drop policy if exists
  "Users can update own checklist items"
on public.ramp_checklist_items;

drop policy if exists
  "Operational roles can update ramp checklist items"
on public.ramp_checklist_items;

create policy
  "Operational roles can insert unlocked ramp checklist items"
on public.ramp_checklist_items
for insert
to authenticated
with check (
  public.can_operate_ramp_checklists()
  and exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      ramp_checklist_items.checklist_id
      and coalesce(
        checklist.is_locked,
        false
      ) = false
  )
);

create policy
  "Authorised roles can view ramp checklist items"
on public.ramp_checklist_items
for select
to authenticated
using (
  public.can_view_ramp_checklists()
  and exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      ramp_checklist_items.checklist_id
  )
);

create policy
  "Operational roles can update unlocked ramp checklist items"
on public.ramp_checklist_items
for update
to authenticated
using (
  public.can_operate_ramp_checklists()
  and exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      ramp_checklist_items.checklist_id
      and coalesce(
        checklist.is_locked,
        false
      ) = false
  )
)
with check (
  public.can_operate_ramp_checklists()
  and exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      ramp_checklist_items.checklist_id
      and coalesce(
        checklist.is_locked,
        false
      ) = false
  )
);

drop policy if exists
  "Users can read audit logs for own checklists"
on public.ramp_audit_logs;

drop policy if exists
  "Users can read permitted audit logs"
on public.ramp_audit_logs;

create policy
  "Authorised roles can view ramp audit logs"
on public.ramp_audit_logs
for select
to authenticated
using (
  public.can_view_ramp_audit_logs()
  and exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      ramp_audit_logs.checklist_id
  )
);

create or replace function public.start_ramp_task_once(
  target_checklist_id uuid,
  target_task_code text
)
returns public.ramp_checklist_items
language plpgsql
security definer
set search_path to ''
as $function$
declare
  updated_item
    public.ramp_checklist_items;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.can_operate_ramp_checklists() then
    raise exception
      'Your role cannot start checklist tasks.';
  end if;

  if nullif(
    trim(target_task_code),
    ''
  ) is null then
    raise exception
      'A task code is required.';
  end if;

  if not exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      target_checklist_id
  ) then
    raise exception
      'The checklist could not be found.';
  end if;

  if exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      target_checklist_id
      and coalesce(
        checklist.is_locked,
        false
      ) = true
  ) then
    raise exception
      'The checklist is locked.';
  end if;

  update public.ramp_checklist_items
  set
    started_at = now(),
    started_by = auth.uid(),
    updated_at = now()
  where checklist_id =
      target_checklist_id
    and task_code =
      trim(target_task_code)
    and operational_status =
      'pending'
    and started_at is null
  returning *
  into updated_item;

  if updated_item.id is null then
    raise exception
      'The task was not found, is already started, or is completed.';
  end if;

  return updated_item;
end;
$function$;

create or replace function public.complete_ramp_task_once(
  target_checklist_id uuid,
  target_task_code text,
  recorded_actual_time time,
  calculated_delay_seconds integer,
  calculated_operational_status text
)
returns public.ramp_checklist_items
language plpgsql
security definer
set search_path to ''
as $function$
declare
  updated_item
    public.ramp_checklist_items;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.can_operate_ramp_checklists() then
    raise exception
      'Your role cannot complete checklist tasks.';
  end if;

  if nullif(
    trim(target_task_code),
    ''
  ) is null then
    raise exception
      'A task code is required.';
  end if;

  if calculated_operational_status
    not in (
      'on_time',
      'light_delay',
      'delay'
    ) then
    raise exception
      'Invalid operational status.';
  end if;

  if calculated_delay_seconds
    is null then
    raise exception
      'A calculated delay value is required.';
  end if;

  if recorded_actual_time
    is null then
    raise exception
      'An actual completion time is required.';
  end if;

  if not exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      target_checklist_id
  ) then
    raise exception
      'The checklist could not be found.';
  end if;

  if exists (
    select 1
    from public.ramp_checklists
      as checklist
    where checklist.id =
      target_checklist_id
      and coalesce(
        checklist.is_locked,
        false
      ) = true
  ) then
    raise exception
      'The checklist is locked.';
  end if;

  update public.ramp_checklist_items
  set
    actual_time =
      recorded_actual_time,
    delay_seconds =
      calculated_delay_seconds,
    operational_status =
      calculated_operational_status,
    completed_by =
      auth.uid(),
    completed_at =
      now(),
    updated_at =
      now()
  where checklist_id =
      target_checklist_id
    and task_code =
      trim(target_task_code)
    and operational_status =
      'pending'
    and started_at is not null
  returning *
  into updated_item;

  if updated_item.id is null then
    raise exception
      'Start the task before completing it, or the task is already completed.';
  end if;

  return updated_item;
end;
$function$;

create or replace function public.approve_ramp_checklist(
  target_checklist_id uuid,
  supervisor_notes text default null::text
)
returns public.ramp_checklists
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller_user_id uuid;
  updated_checklist
    public.ramp_checklists;
begin
  caller_user_id :=
    auth.uid();

  if caller_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.can_approve_ramp_checklists() then
    raise exception
      'Your role cannot approve checklists.';
  end if;

  update public.ramp_checklists
  set
    checklist_status =
      'completed',
    approved_by =
      caller_user_id,
    approved_at =
      now(),
    approval_notes =
      nullif(
        trim(supervisor_notes),
        ''
      ),
    is_locked =
      true,
    locked_by =
      caller_user_id,
    locked_at =
      now(),
    updated_at =
      now()
  where id =
      target_checklist_id
    and coalesce(
      is_locked,
      false
    ) = false
  returning *
  into updated_checklist;

  if updated_checklist.id is null then
    raise exception
      'Checklist not found or already locked.';
  end if;

  return updated_checklist;
end;
$function$;

revoke all
on function public.start_ramp_task_once(
  uuid,
  text
)
from public;

revoke all
on function public.complete_ramp_task_once(
  uuid,
  text,
  time,
  integer,
  text
)
from public;

revoke all
on function public.approve_ramp_checklist(
  uuid,
  text
)
from public;

grant execute
on function public.start_ramp_task_once(
  uuid,
  text
)
to authenticated;

grant execute
on function public.complete_ramp_task_once(
  uuid,
  text,
  time,
  integer,
  text
)
to authenticated;

grant execute
on function public.approve_ramp_checklist(
  uuid,
  text
)
to authenticated;

commit;