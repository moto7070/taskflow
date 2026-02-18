import Link from "next/link";

import { logoutAction } from "@/app/(public)/auth/actions";
import { requireUserId } from "@/lib/rbac/guards";
import { createProjectAction, createTeamAction } from "@/lib/server/team-actions";
import { createClient } from "@/utils/supabase/server";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const message = pickParam(params.message);
  const error = pickParam(params.error);

  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: teamMemberships } = await supabase
    .from("team_members")
    .select("team_id, role, teams(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const { data: projectMemberships } = await supabase
    .from("project_members")
    .select("project_id, role, projects(id, name, team_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </form>
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
          <h2 className="text-lg font-semibold text-slate-900">Create Team</h2>
          <form action={createTeamAction} className="mt-4 flex gap-3">
            <input
              name="team_name"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Team name"
              required
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
          <div className="mt-4 space-y-4">
            {teamMemberships?.length ? (
              teamMemberships.map((membership) => {
                const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
                if (!team) return null;

                return (
                  <div key={membership.team_id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{team.name}</p>
                        <p className="text-xs text-slate-500">Role: {membership.role}</p>
                      </div>
                      <Link
                        href={`/app/team/${team.id}/settings`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Team settings
                      </Link>
                    </div>
                    <form action={createProjectAction} className="mt-4 flex gap-3">
                      <input type="hidden" name="team_id" value={team.id} />
                      <input
                        name="project_name"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="New project name"
                        required
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        Add project
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No team membership yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <div className="mt-4 space-y-3">
            {projectMemberships?.length ? (
              projectMemberships.map((membership) => {
                const project = Array.isArray(membership.projects)
                  ? membership.projects[0]
                  : membership.projects;
                if (!project) return null;

                return (
                  <div key={membership.project_id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{project.name}</p>
                      <p className="text-xs text-slate-500">Role: {membership.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/app/project/${project.id}/board`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Board
                      </Link>
                      <Link
                        href={`/app/project/${project.id}/wiki`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Wiki
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No project membership yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
