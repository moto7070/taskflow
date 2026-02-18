drop policy if exists "team_members_insert_admin_or_self_with_invite" on public.team_members;

create policy "team_members_insert_admin_or_self_with_invite"
on public.team_members
for insert
with check (
  public.is_team_admin(team_id)
  or (
    user_id = auth.uid()
    and role = 'admin'
    and exists (
      select 1
      from public.teams t
      where t.id = public.team_members.team_id
        and t.created_by = auth.uid()
    )
  )
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.invitations i
      where i.team_id = public.team_members.team_id
        and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and i.accepted_at is null
        and i.expires_at > now()
    )
  )
);
