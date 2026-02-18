do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('mention');
  end if;
end
$$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  comment_id uuid references public.task_comments(id) on delete cascade,
  type public.notification_type not null default 'mention',
  body text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

create index if not exists idx_notifications_project_id
  on public.notifications(project_id);

create index if not exists idx_notifications_task_id
  on public.notifications(task_id);

create index if not exists idx_notifications_comment_id
  on public.notifications(comment_id);

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications
for each row execute procedure public.set_current_timestamp_updated_at();

alter table public.notifications enable row level security;

create policy "notifications_select_own"
on public.notifications for select
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_delete_own"
on public.notifications for delete
using (user_id = auth.uid());
