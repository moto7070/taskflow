-- RLS configuration checks for TaskFlow schema.

-- 1) Ensure RLS is enabled for all app tables.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'teams',
    'team_members',
    'projects',
    'project_members',
    'milestones',
    'columns',
    'tasks',
    'task_subtasks',
    'task_comments',
    'comment_reactions',
    'comment_attachments',
    'wiki_pages',
    'wiki_revisions',
    'invitations'
  )
order by c.relname;

-- 2) List policies.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Optional membership helper checks.
-- Replace UUIDs with actual records from your project.
-- select public.is_team_member('<team-uuid>');
-- select public.is_team_admin('<team-uuid>');
-- select public.can_access_project('<project-uuid>');
