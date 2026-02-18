import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface ToggleReactionPayload {
  emoji: string;
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const { taskId, commentId } = await params;
  const payload = (await req.json()) as ToggleReactionPayload;
  const emoji = payload?.emoji?.trim();
  if (!emoji) return NextResponse.json({ error: "Emoji is required." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessTask(taskId, user.id);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: comment } = await supabase
    .from("task_comments")
    .select("id")
    .eq("id", commentId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });

  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("comment_reactions").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reacted: false });
  }

  const { error } = await supabase
    .from("comment_reactions")
    .insert({ comment_id: commentId, user_id: user.id, emoji });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reacted: true });
}
