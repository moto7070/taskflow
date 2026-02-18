-- Minimal seed for local development.
-- Inserts only when at least one auth user exists.

with first_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
upsert_profile as (
  insert into public.profiles (id, display_name)
  select fu.id, 'Owner'
  from first_user fu
  on conflict (id) do update
  set display_name = excluded.display_name
  returning id
),
upsert_team as (
  insert into public.teams (name, created_by)
  select 'TaskFlow Team', fu.id
  from first_user fu
  where not exists (
    select 1
    from public.teams t
    where t.created_by = fu.id
      and t.name = 'TaskFlow Team'
  )
  returning id, created_by
),
team_row as (
  select id, created_by from upsert_team
  union all
  select t.id, t.created_by
  from first_user fu
  join public.teams t
    on t.created_by = fu.id
   and t.name = 'TaskFlow Team'
  limit 1
),
ensure_team_member as (
  insert into public.team_members (team_id, user_id, role)
  select tr.id, tr.created_by, 'admin'::public.app_role
  from team_row tr
  on conflict (team_id, user_id) do update
  set role = excluded.role
  returning team_id, user_id
),
upsert_project as (
  insert into public.projects (team_id, name, description, created_by)
  select tr.id, 'Initial Project', 'Seeded sample project', tr.created_by
  from team_row tr
  where not exists (
    select 1
    from public.projects p
    where p.team_id = tr.id
      and p.name = 'Initial Project'
  )
  returning id, team_id, created_by
),
project_row as (
  select id, team_id, created_by from upsert_project
  union all
  select p.id, p.team_id, p.created_by
  from team_row tr
  join public.projects p
    on p.team_id = tr.id
   and p.name = 'Initial Project'
  limit 1
),
ensure_project_member as (
  insert into public.project_members (project_id, user_id, role)
  select pr.id, pr.created_by, 'admin'::public.app_role
  from project_row pr
  on conflict (project_id, user_id) do update
  set role = excluded.role
)
insert into public.columns (project_id, name, sort_order)
select pr.id, col.name, col.sort_order
from project_row pr
cross join (
  values
    ('To Do', 100),
    ('In Progress', 200),
    ('Review', 300),
    ('Done', 400)
) as col(name, sort_order)
where not exists (
  select 1
  from public.columns c
  where c.project_id = pr.id
    and c.name = col.name
);
