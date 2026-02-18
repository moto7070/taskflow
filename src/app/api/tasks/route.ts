import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface CreateTaskPayload {
  projectId: string;
  columnId: string;
  title: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as CreateTaskPayload;
  if (!payload?.projectId || !payload?.columnId || !payload?.title?.trim()) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", payload.projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!projectMember) {
    const { data: project } = await supabase
      .from("projects")
      .select("team_id")
      .eq("id", payload.projectId)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const { data: teamAdmin } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", project.team_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (teamAdmin?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("project_id", payload.projectId)
    .eq("column_id", payload.columnId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (lastTask?.sort_order ?? 0) + 100;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: payload.projectId,
      column_id: payload.columnId,
      title: payload.title.trim(),
      created_by: user.id,
      priority: "medium",
      status: "todo",
      sort_order: nextSort,
    })
    .select("id, title, description, priority, status, assignee_id, milestone_id, column_id")
    .single();

  if (error || !task) {
    return NextResponse.json({ error: error?.message ?? "Failed to create task" }, { status: 500 });
  }

  return NextResponse.json({ task });
}
