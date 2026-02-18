import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "todo" | "in_progress" | "review" | "done";
}

async function canAccessTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { ok: false };

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", task.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectMember) return { ok: true, projectId: task.project_id };

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", task.project_id)
    .maybeSingle();
  if (!project) return { ok: false };

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();
  return { ok: teamMember?.role === "admin", projectId: task.project_id };
}

export async function GET(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessTask(taskId, user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, title, description, priority, status, assignee_id, column_id")
    .eq("id", taskId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const payload = (await req.json()) as UpdateTaskPayload;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessTask(taskId, user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, string | null> = {};
  if (typeof payload.title === "string") updates.title = payload.title.trim();
  if (typeof payload.description === "string" || payload.description === null) {
    updates.description = payload.description;
  }
  if (payload.priority) updates.priority = payload.priority;
  if (payload.status) updates.status = payload.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("id, title, description, priority, status, assignee_id, column_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task });
}
