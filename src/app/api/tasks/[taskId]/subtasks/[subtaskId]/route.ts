import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { updateSubtaskSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

async function canAccessTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("project_id").eq("id", taskId).maybeSingle();
  if (!task) return false;

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", task.project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectMember) return true;

  const { data: project } = await supabase.from("projects").select("team_id").eq("id", task.project_id).maybeSingle();
  if (!project) return false;

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();
  return teamMember?.role === "admin";
}

async function validateSubtask(taskId: string, subtaskId: string) {
  const supabase = await createClient();
  const { data: subtask } = await supabase
    .from("task_subtasks")
    .select("id, task_id")
    .eq("id", subtaskId)
    .eq("task_id", taskId)
    .maybeSingle();
  return !!subtask;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { taskId, subtaskId } = await params;
  const parsed = updateSubtaskSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const exists = await validateSubtask(taskId, subtaskId);
  if (!exists) return NextResponse.json({ error: "Subtask not found." }, { status: 404 });

  const updates: Record<string, string | boolean> = {};
  if (typeof payload.title === "string") {
    updates.title = payload.title;
  }
  if (typeof payload.is_done === "boolean") updates.is_done = payload.is_done;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("task_subtasks")
    .update(updates)
    .eq("id", subtaskId)
    .eq("task_id", taskId)
    .select("id, title, is_done, sort_order")
    .single();

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to update subtask.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ subtask: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { taskId, subtaskId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const exists = await validateSubtask(taskId, subtaskId);
  if (!exists) return NextResponse.json({ error: "Subtask not found." }, { status: 404 });

  const { error } = await supabase.from("task_subtasks").delete().eq("id", subtaskId).eq("task_id", taskId);
  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to delete subtask.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
