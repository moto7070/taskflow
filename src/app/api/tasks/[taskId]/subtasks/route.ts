import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { createSubtaskSchema } from "@/lib/validations/api";
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

export async function GET(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("task_subtasks")
    .select("id, title, is_done, sort_order")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to load subtasks.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ subtasks: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { taskId } = await params;
  const parsed = createSubtaskSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { title } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: lastSubtask } = await supabase
    .from("task_subtasks")
    .select("sort_order")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (lastSubtask?.sort_order ?? 0) + 100;

  const { data, error } = await supabase
    .from("task_subtasks")
    .insert({ task_id: taskId, title, sort_order: nextSortOrder })
    .select("id, title, is_done, sort_order")
    .single();

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to create subtask.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ subtask: data });
}
