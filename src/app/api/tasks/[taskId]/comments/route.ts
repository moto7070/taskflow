import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface CreateCommentPayload {
  body: string;
  parent_comment_id?: string | null;
}

interface ReactionSummaryItem {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

interface CommentRow {
  id: string;
  body: string;
  author_id: string;
  parent_comment_id: string | null;
  created_at: string;
}

interface EnrichedCommentRow extends CommentRow {
  reaction_summary: ReactionSummaryItem[];
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

  const withReactions = (comment: CommentRow): EnrichedCommentRow => ({
    ...comment,
    reaction_summary: Array.from((reactionMap.get(comment.id) ?? new Map()).values()),
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
