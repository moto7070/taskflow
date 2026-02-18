import { AccessDenied } from "@/components/access-denied";
import { isTeamAdmin, requireUserId } from "@/lib/rbac/guards";
import { inviteMemberAction, removeMemberAction, updateMemberRoleAction } from "@/lib/server/team-actions";
import { createClient } from "@/utils/supabase/server";

interface TeamSettingsPageProps {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default async function TeamSettingsPage({ params, searchParams }: TeamSettingsPageProps) {
  const { teamId } = await params;
  const q = await searchParams;
  const message = pickParam(q.message);
  const error = pickParam(q.error);

  const userId = await requireUserId();
  const canManageTeam = await isTeamAdmin(teamId, userId);

  if (!canManageTeam) {
    return (
      <AccessDenied
        title="You do not have access to this team settings page."
        description="Only team admins can manage members and invitations."
      />
    );
  }

  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id, name").eq("id", teamId).maybeSingle();

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(display_name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, email, role, token, expires_at, accepted_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Team Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Team: {team?.name ?? teamId}</p>
        </div>

        {message ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Invite Member</h2>
          <form action={inviteMemberAction} className="mt-4 flex flex-wrap gap-3">
            <input type="hidden" name="team_id" value={teamId} />
            <input
              name="email"
              type="email"
              className="min-w-[260px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="member@example.com"
              required
            />
            <select
              name="role"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              defaultValue="user"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create invite
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Members</h2>
          <div className="mt-4 space-y-3">
            {members?.length ? (
              members.map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
                const displayName = profile?.display_name || member.user_id;
                return (
                  <div key={member.user_id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{displayName}</p>
                        <p className="text-xs text-slate-500">{member.user_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={updateMemberRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="team_id" value={teamId} />
                          <input type="hidden" name="member_id" value={member.user_id} />
                          <select
                            name="role"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            defaultValue={member.role}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            Update role
                          </button>
                        </form>
                        <form action={removeMemberAction}>
                          <input type="hidden" name="team_id" value={teamId} />
                          <input type="hidden" name="member_id" value={member.user_id} />
                          <button
                            type="submit"
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No members.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Invitations</h2>
          <div className="mt-4 space-y-3">
            {invitations?.length ? (
              invitations.map((invite) => (
                <div key={invite.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{invite.email}</p>
                  <p className="text-xs text-slate-500">
                    role: {invite.role} / expires: {new Date(invite.expires_at).toLocaleString()}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    invite link: /invite/{invite.token}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    status: {invite.accepted_at ? "accepted" : "pending"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No invitations.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
