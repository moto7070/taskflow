export type AppRole = "admin" | "user";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type MilestoneStatus = "planned" | "done";
export type NotificationType = "mention";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignee_id: string | null;
  milestone_id: string | null;
}

export interface BoardColumn {
  id: string;
  name: string;
  sortOrder: number;
  tasks: TaskItem[];
}

export interface ReactionSummaryItem {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface CommentAttachment {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  signed_url: string | null;
}

export interface CommentItem {
  id: string;
  body: string;
  author_id: string;
  parent_comment_id: string | null;
  created_at: string;
  reaction_summary?: ReactionSummaryItem[];
  attachments?: CommentAttachment[];
  replies?: CommentItem[];
}

export interface SubtaskItem {
  id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
}

export interface AssigneeCandidate {
  id: string;
  display_name: string | null;
}

export interface MilestoneCandidate {
  id: string;
  name: string;
  status: MilestoneStatus;
  due_date: string;
}

export interface MentionCandidate {
  id: string;
  display_name: string | null;
  label: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  body: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  project_id: string | null;
  task_id: string | null;
  comment_id: string | null;
  metadata: Record<string, unknown>;
}
