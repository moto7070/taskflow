alter table public.milestones
add column if not exists sort_order integer not null default 0;

with ranked as (
  select id, row_number() over (partition by project_id order by due_date, created_at) * 100 as next_order
  from public.milestones
)
update public.milestones m
set sort_order = ranked.next_order
from ranked
where ranked.id = m.id
  and m.sort_order = 0;

create unique index if not exists idx_milestones_project_id_sort_order
  on public.milestones(project_id, sort_order);
