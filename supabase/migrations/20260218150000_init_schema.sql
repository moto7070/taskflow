create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'milestone_status') then
    create type public.milestone_status as enum ('planned', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  due_date date not null,
  status public.milestone_status not null default 'planned',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name),
  unique (project_id, sort_order)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  parent_comment_id uuid references public.task_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.task_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, emoji)
);

create table if not exists public.comment_attachments (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.task_comments(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.wiki_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.wiki_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.wiki_pages(id) on delete cascade,
  body text not null,
  edited_by uuid not null references auth.users(id) on delete restrict,
  edited_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'user',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_projects_team_id on public.projects(team_id);
create index if not exists idx_milestones_project_id_due_date on public.milestones(project_id, due_date);
create index if not exists idx_columns_project_id_order on public.columns(project_id, sort_order);
create index if not exists idx_tasks_project_id_column_id on public.tasks(project_id, column_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_task_subtasks_task_id_order on public.task_subtasks(task_id, sort_order);
create index if not exists idx_task_comments_task_id_created_at on public.task_comments(task_id, created_at desc);
create index if not exists idx_task_comments_parent_comment_id on public.task_comments(parent_comment_id);
create index if not exists idx_wiki_pages_project_id_deleted_at on public.wiki_pages(project_id, deleted_at);
create index if not exists idx_wiki_revisions_page_id on public.wiki_revisions(page_id);
create index if not exists idx_invitations_team_id_email on public.invitations(team_id, email);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at before update on public.teams
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_team_members_updated_at on public.team_members;
create trigger trg_team_members_updated_at before update on public.team_members
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_project_members_updated_at on public.project_members;
create trigger trg_project_members_updated_at before update on public.project_members
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_milestones_updated_at on public.milestones;
create trigger trg_milestones_updated_at before update on public.milestones
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_columns_updated_at on public.columns;
create trigger trg_columns_updated_at before update on public.columns
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at before update on public.tasks
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_task_subtasks_updated_at on public.task_subtasks;
create trigger trg_task_subtasks_updated_at before update on public.task_subtasks
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_task_comments_updated_at on public.task_comments;
create trigger trg_task_comments_updated_at before update on public.task_comments
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_wiki_pages_updated_at on public.wiki_pages;
create trigger trg_wiki_pages_updated_at before update on public.wiki_pages
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at before update on public.invitations
for each row execute procedure public.set_current_timestamp_updated_at();

create or replace function public.is_team_member(team_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_uuid
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(team_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_uuid
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
  );
$$;

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    left join public.project_members pm
      on pm.project_id = p.id
     and pm.user_id = auth.uid()
    left join public.team_members tm
      on tm.team_id = p.team_id
     and tm.user_id = auth.uid()
    where p.id = project_uuid
      and (
        pm.user_id is not null
        or tm.role = 'admin'
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.comment_attachments enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.wiki_revisions enable row level security;
alter table public.invitations enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "teams_select_member"
on public.teams for select
using (public.is_team_member(id));

create policy "teams_insert_authenticated"
on public.teams for insert
with check (auth.uid() is not null and created_by = auth.uid());

create policy "teams_update_admin"
on public.teams for update
using (public.is_team_admin(id))
with check (public.is_team_admin(id));

create policy "teams_delete_admin"
on public.teams for delete
using (public.is_team_admin(id));

create policy "team_members_select_member"
on public.team_members for select
using (public.is_team_member(team_id));

create policy "team_members_insert_admin"
on public.team_members for insert
with check (public.is_team_admin(team_id));

create policy "team_members_update_admin"
on public.team_members for update
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

create policy "team_members_delete_admin"
on public.team_members for delete
using (public.is_team_admin(team_id));

create policy "projects_select_accessible"
on public.projects for select
using (public.can_access_project(id));

create policy "projects_insert_team_admin"
on public.projects for insert
with check (public.is_team_admin(team_id) and created_by = auth.uid());

create policy "projects_update_team_admin"
on public.projects for update
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

create policy "projects_delete_team_admin"
on public.projects for delete
using (public.is_team_admin(team_id));

create policy "project_members_select_accessible"
on public.project_members for select
using (public.can_access_project(project_id));

create policy "project_members_insert_team_admin"
on public.project_members for insert
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.is_team_admin(p.team_id)
  )
);

create policy "project_members_update_team_admin"
on public.project_members for update
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.is_team_admin(p.team_id)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.is_team_admin(p.team_id)
  )
);

create policy "project_members_delete_team_admin"
on public.project_members for delete
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.is_team_admin(p.team_id)
  )
);

create policy "milestones_select_project_access"
on public.milestones for select
using (public.can_access_project(project_id));

create policy "milestones_insert_project_access"
on public.milestones for insert
with check (public.can_access_project(project_id) and created_by = auth.uid());

create policy "milestones_update_project_access"
on public.milestones for update
using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

create policy "milestones_delete_project_access"
on public.milestones for delete
using (public.can_access_project(project_id));

create policy "columns_select_project_access"
on public.columns for select
using (public.can_access_project(project_id));

create policy "columns_insert_project_access"
on public.columns for insert
with check (public.can_access_project(project_id));

create policy "columns_update_project_access"
on public.columns for update
using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

create policy "columns_delete_project_access"
on public.columns for delete
using (public.can_access_project(project_id));

create policy "tasks_select_project_access"
on public.tasks for select
using (public.can_access_project(project_id));

create policy "tasks_insert_project_access"
on public.tasks for insert
with check (public.can_access_project(project_id) and created_by = auth.uid());

create policy "tasks_update_project_access"
on public.tasks for update
using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

create policy "tasks_delete_project_access"
on public.tasks for delete
using (public.can_access_project(project_id));

create policy "task_subtasks_select_project_access"
on public.task_subtasks for select
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "task_subtasks_insert_project_access"
on public.task_subtasks for insert
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "task_subtasks_update_project_access"
on public.task_subtasks for update
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "task_subtasks_delete_project_access"
on public.task_subtasks for delete
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "task_comments_select_project_access"
on public.task_comments for select
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "task_comments_insert_project_access"
on public.task_comments for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "task_comments_update_own"
on public.task_comments for update
using (
  author_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
)
with check (author_id = auth.uid());

create policy "task_comments_delete_own_or_admin"
on public.task_comments for delete
using (
  author_id = auth.uid()
  or exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.id = task_id
      and public.is_team_admin(p.team_id)
  )
);

create policy "comment_reactions_select_project_access"
on public.comment_reactions for select
using (
  exists (
    select 1
    from public.task_comments tc
    join public.tasks t on t.id = tc.task_id
    where tc.id = comment_id
      and public.can_access_project(t.project_id)
  )
);

create policy "comment_reactions_insert_project_access"
on public.comment_reactions for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.task_comments tc
    join public.tasks t on t.id = tc.task_id
    where tc.id = comment_id
      and public.can_access_project(t.project_id)
  )
);

create policy "comment_reactions_delete_own"
on public.comment_reactions for delete
using (user_id = auth.uid());

create policy "comment_attachments_select_project_access"
on public.comment_attachments for select
using (
  exists (
    select 1
    from public.task_comments tc
    join public.tasks t on t.id = tc.task_id
    where tc.id = comment_id
      and public.can_access_project(t.project_id)
  )
);

create policy "comment_attachments_insert_project_access"
on public.comment_attachments for insert
with check (
  exists (
    select 1
    from public.task_comments tc
    join public.tasks t on t.id = tc.task_id
    where tc.id = comment_id
      and public.can_access_project(t.project_id)
  )
);

create policy "comment_attachments_delete_project_access"
on public.comment_attachments for delete
using (
  exists (
    select 1
    from public.task_comments tc
    join public.tasks t on t.id = tc.task_id
    where tc.id = comment_id
      and public.can_access_project(t.project_id)
  )
);

create policy "wiki_pages_select_project_access"
on public.wiki_pages for select
using (public.can_access_project(project_id));

create policy "wiki_pages_insert_project_access"
on public.wiki_pages for insert
with check (
  public.can_access_project(project_id)
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy "wiki_pages_update_project_access"
on public.wiki_pages for update
using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

create policy "wiki_pages_delete_team_admin"
on public.wiki_pages for delete
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.is_team_admin(p.team_id)
  )
);

create policy "wiki_revisions_select_project_access"
on public.wiki_revisions for select
using (
  exists (
    select 1
    from public.wiki_pages wp
    where wp.id = page_id
      and public.can_access_project(wp.project_id)
  )
);

create policy "wiki_revisions_insert_project_access"
on public.wiki_revisions for insert
with check (
  edited_by = auth.uid()
  and exists (
    select 1
    from public.wiki_pages wp
    where wp.id = page_id
      and public.can_access_project(wp.project_id)
  )
);

create policy "invitations_select_team_admin"
on public.invitations for select
using (public.is_team_admin(team_id));

create policy "invitations_insert_team_admin"
on public.invitations for insert
with check (public.is_team_admin(team_id) and created_by = auth.uid());

create policy "invitations_update_team_admin"
on public.invitations for update
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

create policy "invitations_delete_team_admin"
on public.invitations for delete
using (public.is_team_admin(team_id));
