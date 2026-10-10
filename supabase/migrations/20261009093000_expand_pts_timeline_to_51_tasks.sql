begin;

alter table public.ramp_checklist_items
drop constraint if exists
  ramp_checklist_items_base_time_check;

alter table public.ramp_checklist_items
add constraint
  ramp_checklist_items_base_time_check
check (
  base_time in (
    'sta',
    'arrival',
    'chocks_on',
    'std',
    'defined_push',
    'chocks'
  )
);

update public.ramp_checklist_items
set base_time = 'sta'
where phase = 'Pre-Arrival'
  and base_time in (
    'arrival',
    'chocks'
  );

alter table public.ramp_checklist_items
add constraint
  ramp_checklist_items_checklist_task_code_key
unique (
  checklist_id,
  task_code
);

alter table public.ramp_checklist_items
drop constraint if exists
  ramp_checklist_items_checklist_id_item_number_key;

create index if not exists
  ramp_checklist_items_checklist_item_number_idx
on public.ramp_checklist_items (
  checklist_id,
  item_number
);

commit;