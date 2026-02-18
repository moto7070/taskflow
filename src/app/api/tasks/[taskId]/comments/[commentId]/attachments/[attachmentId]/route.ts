import { NextResponse } from "next/server";

import { getCommentAttachmentsBucket } from "@/lib/env";
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

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ taskId: string; commentId: string; attachmentId: string }> },
) {
  const { taskId, commentId, attachmentId } = await params;
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
    return NextResponse.json({ error: "Only the author can delete attachments." }, { status: 403 });
  }

  const { data: attachment } = await supabase
    .from("comment_attachments")
    .select("id, storage_path")
    .eq("id", attachmentId)
    .eq("comment_id", commentId)
    .maybeSingle();
  if (!attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

  const { error: deleteRowError } = await supabase
    .from("comment_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("comment_id", commentId);
  if (deleteRowError) return NextResponse.json({ error: deleteRowError.message }, { status: 500 });

  const admin = createAdminClient();
  const bucket = getCommentAttachmentsBucket();
  const { error: deleteFileError } = await admin.storage.from(bucket).remove([attachment.storage_path]);
  if (deleteFileError) return NextResponse.json({ error: deleteFileError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
