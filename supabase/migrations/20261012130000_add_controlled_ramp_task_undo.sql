begin;

alter table public.ramp_checklist_items
drop constraint if exists
  ramp_high_impact_delay_comment_check;

create or replace function public.undo_ramp_task_completion(
  target_checklist_id uuid,
  target_task_code text
)
returns public.ramp_checklist_items
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller_user_id uuid;
  caller_profile_role text;
  selected_checklist public.ramp_checklists;
  selected_item public.ramp_checklist_items;
  updated_item public.ramp_checklist_items;
begin
  caller_user_id := auth.uid();

  if caller_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  select lower(trim(profile.role))
  into caller_profile_role
  from public.profiles as profile
  where profile.id = caller_user_id;

  if caller_profile_role is null then
    raise exception
      'No application role was found for the signed-in user.';
  end if;

  if caller_profile_role not in (
    'administrator',
    'occ_manager',
    'controller',
    'trc_coordinator',
    'turnaround_coordinator',
    'ramp_agent'
  ) then
    raise exception
      'Your role cannot return completed tasks to pending.';
  end if;

  if target_checklist_id is null then
    raise exception
      'A checklist identifier is required.';
  end if;

  if nullif(trim(target_task_code), '') is null then
    raise exception
      'A task code is required.';
  end if;

  select checklist.*
  into selected_checklist
  from public.ramp_checklists as checklist
  where checklist.id = target_checklist_id
  for update;

  if selected_checklist.id is null then
    raise exception
      'The selected checklist could not be found.';
  end if;

  if coalesce(
    selected_checklist.is_locked,
    false
  ) then
    raise exception
      'The checklist is locked and the task cannot be changed.';
  end if;

  if selected_checklist.approved_at is not null
    or selected_checklist.approved_by is not null then
    raise exception
      'The checklist has already been approved and the task cannot be changed.';
  end if;

  select item.*
  into selected_item
  from public.ramp_checklist_items as item
  where item.checklist_id =
      target_checklist_id
    and item.task_code =
      trim(target_task_code)
  for update;

  if selected_item.id is null then
    raise exception
      'The selected checklist task could not be found.';
  end if;

  if selected_item.operational_status =
    'pending' then
    raise exception
      'The task is already pending.';
  end if;

  update public.ramp_checklist_items
  set
    actual_time = null,
    delay_seconds = null,
    operational_status = 'pending',
    started_at = null,
    started_by = null,
    completed_at = null,
    completed_by = null,
    updated_at = now()
  where id = selected_item.id
    and checklist_id =
      target_checklist_id
    and task_code =
      trim(target_task_code)
    and operational_status <> 'pending'
  returning *
  into updated_item;

  if updated_item.id is null then
    raise exception
      'The task state changed during the request and could not be returned to pending.';
  end if;

  update public.ramp_checklists
  set
    checklist_status = 'in_progress',
    updated_at = now()
  where id = target_checklist_id
    and coalesce(is_locked, false) =
      false;

  insert into public.ramp_audit_logs (
    checklist_id,
    item_id,
    user_id,
    action,
    entity_type,
    old_values,
    new_values
  )
  values (
    target_checklist_id,
    selected_item.id,
    caller_user_id,
    'task_undone',
    'ramp_checklist_item',
    jsonb_build_object(
      'task_code',
      selected_item.task_code,
      'item_number',
      selected_item.item_number,
      'operational_status',
      selected_item.operational_status,
      'actual_time',
      selected_item.actual_time,
      'delay_seconds',
      selected_item.delay_seconds,
      'started_at',
      selected_item.started_at,
      'started_by',
      selected_item.started_by,
      'completed_at',
      selected_item.completed_at,
      'completed_by',
      selected_item.completed_by
    ),
    jsonb_build_object(
      'task_code',
      updated_item.task_code,
      'item_number',
      updated_item.item_number,
      'operational_status',
      updated_item.operational_status,
      'actual_time',
      updated_item.actual_time,
      'delay_seconds',
      updated_item.delay_seconds,
      'started_at',
      updated_item.started_at,
      'started_by',
      updated_item.started_by,
      'completed_at',
      updated_item.completed_at,
      'completed_by',
      updated_item.completed_by
    )
  );

  return updated_item;
end;
$function$;

revoke all
on function public.undo_ramp_task_completion(
  uuid,
  text
)
from public;

revoke all
on function public.undo_ramp_task_completion(
  uuid,
  text
)
from anon;

grant execute
on function public.undo_ramp_task_completion(
  uuid,
  text
)
to authenticated;

commit;