import { NextResponse } from "next/server";

import { reorderPayloadSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

async function hasProjectAccess(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) return true;

  const { data: project } = await supabase.from("projects").select("team_id").eq("id", projectId).maybeSingle();
  if (!project) return false;

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  return teamMember?.role === "admin";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reorderPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const payload = parsed.data;

  const canAccess = await hasProjectAccess(payload.projectId, user.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allTaskIds = payload.columns.flatMap((col) => col.taskIds);
  if (allTaskIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", payload.projectId)
    .in("id", allTaskIds);

  if (!tasks || tasks.length !== allTaskIds.length) {
    return NextResponse.json({ error: "Invalid task IDs" }, { status: 400 });
  }

  for (const column of payload.columns) {
    for (const [index, taskId] of column.taskIds.entries()) {
      const { error } = await supabase
        .from("tasks")
        .update({
          column_id: column.id,
          sort_order: (index + 1) * 100,
        })
        .eq("id", taskId)
        .eq("project_id", payload.projectId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
