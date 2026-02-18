import { NextResponse } from "next/server";

import { getCommentAttachmentsBucket } from "@/lib/env";
import type { ReactionSummaryItem } from "@/lib/types/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { createCommentSchema } from "@/lib/validations/api";

interface CommentRow {
  id: string;
  body: string;
  author_id: string;
  parent_comment_id: string | null;
  created_at: string;
}

interface EnrichedCommentRow extends CommentRow {
  reaction_summary: ReactionSummaryItem[];
  attachments: Array<{
    id: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    storage_path: string;
    signed_url: string | null;
  }>;
}

async function canAccessTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { ok: false as const };

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", task.project_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectMember) return { ok: true as const, projectId: task.project_id };

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", task.project_id)
    .maybeSingle();
  if (!project) return { ok: false as const };

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (teamMember?.role === "admin") return { ok: true as const, projectId: task.project_id };
  return { ok: false as const };
}

async function resolveMentionedUserIds(projectId: string, body: string) {
  const supabase = await createClient();
  const bodyLower = body.toLowerCase();

  const { data: members } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);
  const ids = Array.from(new Set((members ?? []).map((member) => member.user_id)));
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

  const mentionedIds: string[] = [];
  for (const id of ids) {
    const label = profileMap.get(id) ?? id.slice(0, 8);
    if (bodyLower.includes(`@${label.toLowerCase()}`)) {
      mentionedIds.push(id);
    }
  }
  return mentionedIds;
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

  const { data: comments, error } = await supabase
    .from("task_comments")
    .select("id, body, author_id, parent_comment_id, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const commentRows = (comments ?? []) as CommentRow[];
  const commentIds = commentRows.map((comment) => comment.id);
  const { data: reactions, error: reactionsError } =
    commentIds.length > 0
      ? await supabase
          .from("comment_reactions")
          .select("comment_id, emoji, user_id")
          .in("comment_id", commentIds)
      : { data: [], error: null };

  if (reactionsError) return NextResponse.json({ error: reactionsError.message }, { status: 500 });

  const reactionMap = new Map<string, Map<string, ReactionSummaryItem>>();
  for (const reaction of reactions ?? []) {
    const emojiMap = reactionMap.get(reaction.comment_id) ?? new Map<string, ReactionSummaryItem>();
    const existing = emojiMap.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      reacted_by_me: false,
    };
    existing.count += 1;
    if (reaction.user_id === user.id) existing.reacted_by_me = true;
    emojiMap.set(reaction.emoji, existing);
    reactionMap.set(reaction.comment_id, emojiMap);
  }

  const { data: attachments, error: attachmentsError } =
    commentIds.length > 0
      ? await supabase
          .from("comment_attachments")
          .select("id, comment_id, file_name, mime_type, file_size, storage_path")
          .in("comment_id", commentIds)
      : { data: [], error: null };
  if (attachmentsError) return NextResponse.json({ error: attachmentsError.message }, { status: 500 });

  const admin = createAdminClient();
  const bucket = getCommentAttachmentsBucket();
  const attachmentRows = await Promise.all(
    (attachments ?? []).map(async (attachment) => {
      const { data } = await admin.storage.from(bucket).createSignedUrl(attachment.storage_path, 60 * 60);
      return {
        ...attachment,
        signed_url: data?.signedUrl ?? null,
      };
    }),
  );

  const attachmentMap = new Map<string, EnrichedCommentRow["attachments"]>();
  for (const attachment of attachmentRows) {
    const list = attachmentMap.get(attachment.comment_id) ?? [];
    list.push({
      id: attachment.id,
      file_name: attachment.file_name,
      mime_type: attachment.mime_type,
      file_size: attachment.file_size,
      storage_path: attachment.storage_path,
      signed_url: attachment.signed_url,
    });
    attachmentMap.set(attachment.comment_id, list);
  }

  const withReactions = (comment: CommentRow): EnrichedCommentRow => ({
    ...comment,
    reaction_summary: Array.from((reactionMap.get(comment.id) ?? new Map()).values()),
    attachments: attachmentMap.get(comment.id) ?? [],
  });

  const topLevel = commentRows.filter((comment) => comment.parent_comment_id === null);
  const byParent = new Map<string, EnrichedCommentRow[]>();
  for (const comment of commentRows) {
    if (!comment.parent_comment_id) continue;
    const list = byParent.get(comment.parent_comment_id) ?? [];
    list.push(withReactions(comment));
    byParent.set(comment.parent_comment_id, list);
  }

  const result = topLevel.map((comment) => ({
    ...withReactions(comment),
    replies: byParent.get(comment.id) ?? [],
  }));

  return NextResponse.json({ comments: result, currentUserId: user.id });
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const parsed = createCommentSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;
  const body = payload.body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessTask(taskId, user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parentCommentId: string | null = null;
  if (typeof payload.parent_comment_id === "string" && payload.parent_comment_id.length > 0) {
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

  const mentionedUserIds = (await resolveMentionedUserIds(access.projectId, body)).filter(
    (mentionedUserId) => mentionedUserId !== user.id,
  );
  if (mentionedUserIds.length > 0) {
    const admin = createAdminClient();
    await admin.from("notifications").insert(
      mentionedUserIds.map((mentionedUserId) => ({
        user_id: mentionedUserId,
        project_id: access.projectId,
        task_id: taskId,
        comment_id: data.id,
        type: "mention",
        body: `${user.email ?? "A member"} mentioned you in a comment`,
        metadata: { task_id: taskId, comment_id: data.id },
      })),
    );
  }

  return NextResponse.json({ comment: data });
}
