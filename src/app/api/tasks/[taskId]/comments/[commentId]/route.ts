import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface UpdateCommentPayload {
  body: string;
}

async function canAccessTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return false;

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", task.project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectMember) return true;

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", task.project_id)
    .maybeSingle();
  if (!project) return false;

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  return teamMember?.role === "admin";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const { taskId, commentId } = await params;
  const payload = (await req.json()) as UpdateCommentPayload;
  const body = payload?.body?.trim();
  if (!body) return NextResponse.json({ error: "Comment body is required." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: comment } = await supabase
    .from("task_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (comment.author_id !== user.id) {
    return NextResponse.json({ error: "Only the author can edit this comment." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("task_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("task_id", taskId)
    .select("id, body, author_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const { taskId, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: comment } = await supabase
    .from("task_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (comment.author_id !== user.id) {
    return NextResponse.json({ error: "Only the author can delete this comment." }, { status: 403 });
  }

  const { error } = await supabase.from("task_comments").delete().eq("id", commentId).eq("task_id", taskId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
