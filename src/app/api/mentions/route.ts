import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

async function canAccessTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { ok: false as const };

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", task.project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectMember) return { ok: true as const, projectId: task.project_id };

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", task.project_id)
    .maybeSingle();
  if (!project) return { ok: false as const };

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (teamMember?.role === "admin") return { ok: true as const, projectId: task.project_id };
  return { ok: false as const };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (!taskId) return NextResponse.json({ error: "taskId is required." }, { status: 400 });

  const access = await canAccessTask(taskId, user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: members, error: membersError } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", access.projectId);
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

  const ids = Array.from(new Set((members ?? []).map((member) => member.user_id)));
  const { data: profiles, error: profilesError } =
    ids.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [], error: null };
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const candidates = ids
    .map((id) => {
      const displayName = profileMap.get(id) ?? null;
      const label = displayName || id.slice(0, 8);
      return {
        id,
        display_name: displayName,
        label,
      };
    })
    .filter((candidate) => (q ? candidate.label.toLowerCase().includes(q) : true))
    .slice(0, 8);

  return NextResponse.json({ candidates });
}
