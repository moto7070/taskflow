import type {
  AssigneeCandidate,
  CommentItem,
  MentionCandidate,
  MilestoneCandidate,
  NotificationItem,
  SubtaskItem,
  TaskItem,
} from "@/lib/types/domain";

export interface ApiErrorResponse {
  error: string;
  detail?: string;
}

export interface ApiOkResponse {
  ok: true;
  warning?: string;
  detail?: string;
}

export interface TaskCreateResponse {
  task: TaskItem & { column_id: string };
}

export interface TaskUpdateResponse {
  task: TaskItem;
}

export interface TaskDetailResponse {
  task: TaskItem;
  assigneeCandidates: AssigneeCandidate[];
  milestoneCandidates: MilestoneCandidate[];
}

export interface CommentsGetResponse {
  comments: CommentItem[];
  currentUserId: string;
}

export interface CommentCreateResponse {
  comment: CommentItem;
}

export interface SubtasksGetResponse {
  subtasks: SubtaskItem[];
}

export interface SubtaskUpdateResponse {
  subtask: SubtaskItem;
}

export interface MentionsGetResponse {
  candidates: MentionCandidate[];
}

export interface NotificationsGetResponse {
  notifications: NotificationItem[];
}

export interface NotificationUpdateResponse {
  notification: Pick<NotificationItem, "id" | "is_read" | "read_at">;
}

export interface WikiUpsertResponse {
  page: { id: string };
  warning?: string;
  detail?: string;
}
