import { NextResponse } from "next/server";

import { getCommentAttachmentsBucket } from "@/lib/env";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { updateCommentSchema } from "@/lib/validations/api";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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
  const parsed = updateCommentSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const body = parsed.data.body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit({
    scope: "comments:update",
    userId: user.id,
    request: req,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retry_after: rateLimit.retryAfterSec },
      { status: 429 },
    );
  }

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
  req: Request,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const { taskId, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit({
    scope: "comments:delete",
    userId: user.id,
    request: req,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retry_after: rateLimit.retryAfterSec },
      { status: 429 },
    );
  }

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

  const { data: allComments, error: allCommentsError } = await supabase
    .from("task_comments")
    .select("id, parent_comment_id")
    .eq("task_id", taskId);
  if (allCommentsError) return NextResponse.json({ error: allCommentsError.message }, { status: 500 });

  const childrenMap = new Map<string, string[]>();
  for (const row of allComments ?? []) {
    if (!row.parent_comment_id) continue;
    const list = childrenMap.get(row.parent_comment_id) ?? [];
    list.push(row.id);
    childrenMap.set(row.parent_comment_id, list);
  }

  const targetCommentIds: string[] = [];
  const queue = [commentId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    targetCommentIds.push(current);
    const children = childrenMap.get(current) ?? [];
    queue.push(...children);
  }

  const { data: attachments, error: attachmentsError } = await supabase
    .from("comment_attachments")
    .select("storage_path")
    .in("comment_id", targetCommentIds);
  if (attachmentsError) return NextResponse.json({ error: attachmentsError.message }, { status: 500 });

  const { error } = await supabase.from("task_comments").delete().eq("id", commentId).eq("task_id", taskId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const storagePaths = Array.from(
    new Set((attachments ?? []).map((attachment) => attachment.storage_path).filter(Boolean)),
  );
  if (storagePaths.length === 0) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const bucket = getCommentAttachmentsBucket();
  const { error: removeError } = await admin.storage.from(bucket).remove(storagePaths);
  if (removeError) {
    return NextResponse.json(
      {
        ok: true,
        warning: "Comment deleted but attachment cleanup failed.",
        detail: removeError.message,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true });
}
