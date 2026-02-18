import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  getCommentAttachmentAllowedMimeTypes,
  getCommentAttachmentMaxBytes,
  getCommentAttachmentsBucket,
} from "@/lib/env";
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

async function getComment(taskId: string, commentId: string) {
  const supabase = await createClient();
  return supabase
    .from("task_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("task_id", taskId)
    .maybeSingle();
}

export async function GET(
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

  const { data: comment } = await getComment(taskId, commentId);
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });

  const { data: attachments, error } = await supabase
    .from("comment_attachments")
    .select("id, file_name, mime_type, file_size, storage_path")
    .eq("comment_id", commentId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  const bucket = getCommentAttachmentsBucket();
  const withUrls = await Promise.all(
    (attachments ?? []).map(async (attachment) => {
      const { data } = await admin.storage.from(bucket).createSignedUrl(attachment.storage_path, 60 * 60);
      return {
        ...attachment,
        signed_url: data?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ attachments: withUrls });
}

export async function POST(
  req: Request,
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

  const { data: comment } = await getComment(taskId, commentId);
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (comment.author_id !== user.id) {
    return NextResponse.json({ error: "Only the author can upload attachments." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }

  const maxBytes = getCommentAttachmentMaxBytes();
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File size exceeds limit (${maxBytes} bytes).` },
      { status: 400 },
    );
  }

  const allowedMimeTypes = getCommentAttachmentAllowedMimeTypes();
  const mimeType = file.type || "application/octet-stream";
  if (!allowedMimeTypes.has(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}` },
      { status: 400 },
    );
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${taskId}/${commentId}/${randomUUID()}-${safeFileName}`;
  const bucket = getCommentAttachmentsBucket();
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, file, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: attachment, error: insertError } = await supabase
    .from("comment_attachments")
    .insert({
      comment_id: commentId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      file_size: file.size,
    })
    .select("id, file_name, mime_type, file_size, storage_path")
    .single();

  if (insertError || !attachment) {
    await admin.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ error: insertError?.message ?? "Failed to save attachment." }, { status: 500 });
  }

  const { data: signed } = await admin.storage.from(bucket).createSignedUrl(storagePath, 60 * 60);

  return NextResponse.json({
    attachment: {
      ...attachment,
      signed_url: signed?.signedUrl ?? null,
    },
  });
}
