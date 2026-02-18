drop policy if exists "team_members_insert_admin" on public.team_members;
drop policy if exists "invitations_select_team_admin" on public.invitations;

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
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  )
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.invitations i
      where i.team_id = team_id
        and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and i.accepted_at is null
        and i.expires_at > now()
    )
  )
);

create policy "invitations_select_team_admin_or_invitee"
on public.invitations
for select
using (
  public.is_team_admin(team_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "invitations_update_invitee_accept"
on public.invitations
for update
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and accepted_at is null
  and expires_at > now()
)
with check (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
