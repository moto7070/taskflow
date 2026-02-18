import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface CreateCommentPayload {
  body: string;
  parent_comment_id?: string | null;
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

export async function GET(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: comments, error } = await supabase
    .from("task_comments")
    .select("id, body, author_id, parent_comment_id, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const topLevel = (comments ?? []).filter((comment) => comment.parent_comment_id === null);
  const byParent = new Map<string, typeof comments>();
  for (const comment of comments ?? []) {
    if (!comment.parent_comment_id) continue;
    const list = byParent.get(comment.parent_comment_id) ?? [];
    list.push(comment);
    byParent.set(comment.parent_comment_id, list);
  }

  const result = topLevel.map((comment) => ({
    ...comment,
    replies: byParent.get(comment.id) ?? [],
  }));

  return NextResponse.json({ comments: result, currentUserId: user.id });
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const payload = (await req.json()) as CreateCommentPayload;
  const body = payload?.body?.trim();

  if (!body) return NextResponse.json({ error: "Comment body is required." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parentCommentId: string | null = null;
  if (typeof payload.parent_comment_id === "string" && payload.parent_comment_id.trim().length > 0) {
    const { data: parentComment } = await supabase
      .from("task_comments")
      .select("id")
      .eq("id", payload.parent_comment_id)
      .eq("task_id", taskId)
      .maybeSingle();
    if (!parentComment) {
      return NextResponse.json({ error: "Parent comment not found." }, { status: 404 });
    }
    parentCommentId = parentComment.id;
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      body,
      author_id: user.id,
      parent_comment_id: parentCommentId,
    })
    .select("id, body, author_id, parent_comment_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
