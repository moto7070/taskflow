create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_team_id_created_at_idx
  on public.audit_logs (team_id, created_at desc);

create index if not exists audit_logs_actor_user_id_created_at_idx
  on public.audit_logs (actor_user_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit logs insert by team admins" on public.audit_logs;
create policy "audit logs insert by team admins"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.team_members tm
      where tm.team_id = audit_logs.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

drop policy if exists "audit logs select by team admins" on public.audit_logs;
create policy "audit logs select by team admins"
  on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.team_id = audit_logs.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
    )
  );
