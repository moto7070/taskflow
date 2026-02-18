insert into public.columns (project_id, name, sort_order)
select p.id, c.name, c.sort_order
from public.projects p
cross join (
  values
    ('To Do'::text, 100),
    ('In Progress'::text, 200),
    ('Review'::text, 300),
    ('Done'::text, 400)
) as c(name, sort_order)
where not exists (
  select 1
  from public.columns existing
  where existing.project_id = p.id
);
