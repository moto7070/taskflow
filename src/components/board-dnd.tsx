"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "review" | "done";
  assignee_id: string | null;
  milestone_id: string | null;
}

interface BoardColumn {
  id: string;
  name: string;
  sortOrder: number;
  tasks: TaskItem[];
}

interface CommentItem {
  id: string;
  body: string;
  author_id: string;
  parent_comment_id: string | null;
  created_at: string;
  replies?: CommentItem[];
}

interface SubtaskItem {
  id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
}

interface AssigneeCandidate {
  id: string;
  display_name: string | null;
}

interface MilestoneCandidate {
  id: string;
  name: string;
  status: "planned" | "done";
  due_date: string;
}

interface BoardDndProps {
  projectId: string;
  initialColumns: BoardColumn[];
}

function findColumnByTask(columns: BoardColumn[], taskId: string): BoardColumn | undefined {
  return columns.find((col) => col.tasks.some((task) => task.id === taskId));
}

function TaskCard({ task, onOpen }: { task: TaskItem; onOpen: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-slate-900">{task.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description || "No description"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {task.priority} / {task.status}
          </p>
        </div>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500"
          title="Drag"
        >
          ::
        </button>
      </div>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="mt-2 text-xs font-medium text-slate-700 underline"
      >
        Open details
      </button>
    </div>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onSaved,
}: {
  task: TaskItem;
  onClose: () => void;
  onSaved: (next: TaskItem) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskItem["priority"]>(task.priority);
  const [status, setStatus] = useState<TaskItem["status"]>(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? "");
  const [assigneeCandidates, setAssigneeCandidates] = useState<AssigneeCandidate[]>([]);
  const [milestoneId, setMilestoneId] = useState(task.milestone_id ?? "");
  const [milestoneCandidates, setMilestoneCandidates] = useState<MilestoneCandidate[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [saving, startSaving] = useTransition();

  const fetchTaskDetails = useCallback(async () => {
    setLoadingDetails(true);
    const res = await fetch(`/api/tasks/${task.id}`);
    const json = (await res.json()) as {
      task?: TaskItem;
      assigneeCandidates?: AssigneeCandidate[];
      milestoneCandidates?: MilestoneCandidate[];
      error?: string;
    };

    if (!res.ok || !json.task) {
      window.alert(json.error ?? "Failed to load task details.");
      setLoadingDetails(false);
      return;
    }

    setTitle(json.task.title);
    setDescription(json.task.description ?? "");
    setPriority(json.task.priority);
    setStatus(json.task.status);
    setAssigneeId(json.task.assignee_id ?? "");
    setMilestoneId(json.task.milestone_id ?? "");
    setAssigneeCandidates(json.assigneeCandidates ?? []);
    setMilestoneCandidates(json.milestoneCandidates ?? []);
    setLoadingDetails(false);
  }, [task.id]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const res = await fetch(`/api/tasks/${task.id}/comments`);
    const json = (await res.json()) as { comments?: CommentItem[]; currentUserId?: string };
    setComments(json.comments ?? []);
    setCurrentUserId(json.currentUserId ?? null);
    setLoadingComments(false);
  }, [task.id]);

  const fetchSubtasks = useCallback(async () => {
    setLoadingSubtasks(true);
    const res = await fetch(`/api/tasks/${task.id}/subtasks`);
    const json = (await res.json()) as { subtasks?: SubtaskItem[] };
    setSubtasks(json.subtasks ?? []);
    setLoadingSubtasks(false);
  }, [task.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTaskDetails();
      void fetchComments();
      void fetchSubtasks();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchComments, fetchSubtasks, fetchTaskDetails]);

  const saveTask = () => {
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          status,
          assignee_id: assigneeId || null,
          milestone_id: milestoneId || null,
        }),
      });
      const json = (await res.json()) as { task?: TaskItem; error?: string };
      if (!res.ok || !json.task) {
        window.alert(json.error ?? "Failed to save task.");
        return;
      }
      onSaved(json.task);
    });
  };

  const postComment = () => {
    if (!commentBody.trim()) return;
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to post comment.");
        return;
      }
      setCommentBody("");
      await fetchComments();
    });
  };

  const postReply = (parentCommentId: string) => {
    const body = replyBodies[parentCommentId]?.trim();
    if (!body) return;
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parent_comment_id: parentCommentId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to post reply.");
        return;
      }
      setReplyBodies((prev) => ({ ...prev, [parentCommentId]: "" }));
      await fetchComments();
    });
  };

  const editComment = (comment: CommentItem) => {
    const nextBody = window.prompt("Edit comment", comment.body);
    if (!nextBody || !nextBody.trim()) return;
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: nextBody.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to edit comment.");
        return;
      }
      await fetchComments();
    });
  };

  const deleteComment = (comment: CommentItem) => {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments/${comment.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to delete comment.");
        return;
      }
      await fetchComments();
    });
  };

  const createSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to create subtask.");
        return;
      }
      setNewSubtaskTitle("");
      await fetchSubtasks();
    });
  };

  const updateSubtask = (subtaskId: string, updates: { title?: string; is_done?: boolean }) => {
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to update subtask.");
        return;
      }
      await fetchSubtasks();
    });
  };

  const deleteSubtask = (subtaskId: string) => {
    startSaving(async () => {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to delete subtask.");
        return;
      }
      await fetchSubtasks();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Task details</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Description"
          />
          <div className="flex gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskItem["priority"])}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskItem["status"])}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="todo">todo</option>
              <option value="in_progress">in_progress</option>
              <option value="review">review</option>
              <option value="done">done</option>
            </select>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="min-w-44 rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={loadingDetails}
            >
              <option value="">Unassigned</option>
              {assigneeCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.display_name ?? candidate.id}
                </option>
              ))}
            </select>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="min-w-52 rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={loadingDetails}
            >
              <option value="">No milestone</option>
              {milestoneCandidates.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name} ({milestone.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveTask}
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900">Subtasks</h4>
          <div className="mt-2 flex gap-2">
            <input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Add subtask"
            />
            <button
              type="button"
              onClick={createSubtask}
              disabled={saving}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              Add
            </button>
          </div>
          <div className="mt-3 max-h-36 space-y-2 overflow-auto">
            {loadingSubtasks ? <p className="text-xs text-slate-500">Loading subtasks...</p> : null}
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
                <input
                  type="checkbox"
                  checked={subtask.is_done}
                  onChange={(e) => updateSubtask(subtask.id, { is_done: e.target.checked })}
                />
                <input
                  defaultValue={subtask.title}
                  onBlur={(e) => {
                    const nextTitle = e.target.value.trim();
                    if (!nextTitle || nextTitle === subtask.title) return;
                    updateSubtask(subtask.id, { title: nextTitle });
                  }}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => deleteSubtask(subtask.id)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
            {!loadingSubtasks && subtasks.length === 0 ? (
              <p className="text-xs text-slate-500">No subtasks yet.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900">Comments</h4>
          <div className="mt-2 space-y-2">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Write a comment..."
            />
            <button type="button" onClick={postComment} disabled={saving} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              Post comment
            </button>
          </div>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto">
            {loadingComments ? <p className="text-xs text-slate-500">Loading comments...</p> : null}
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-slate-200 p-2 text-xs">
                <p className="text-slate-800">{comment.body}</p>
                <p className="mt-1 text-slate-500">
                  {comment.author_id} / {new Date(comment.created_at).toLocaleString()}
                </p>
                {currentUserId === comment.author_id ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => editComment(comment)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteComment(comment)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}

                <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                  {(comment.replies ?? []).map((reply) => (
                    <div key={reply.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                      <p className="text-slate-800">{reply.body}</p>
                      <p className="mt-1 text-slate-500">
                        {reply.author_id} / {new Date(reply.created_at).toLocaleString()}
                      </p>
                      {currentUserId === reply.author_id ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => editComment(reply)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteComment(reply)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      value={replyBodies[comment.id] ?? ""}
                      onChange={(e) =>
                        setReplyBodies((prev) => ({
                          ...prev,
                          [comment.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      placeholder="Reply..."
                    />
                    <button
                      type="button"
                      onClick={() => postReply(comment.id)}
                      disabled={saving}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loadingComments && comments.length === 0 ? (
              <p className="text-xs text-slate-500">No comments yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnContainer({
  column,
  onOpenTask,
  onCreateTask,
}: {
  column: BoardColumn;
  onOpenTask: (taskId: string) => void;
  onCreateTask: (columnId: string, title: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");

  return (
    <div className="w-72 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{column.name}</h2>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
          {column.tasks.length}
        </span>
      </div>
      <div className="mb-3 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
          placeholder="New task title"
        />
        <button
          type="button"
          onClick={() => {
            if (!newTitle.trim()) return;
            onCreateTask(column.id, newTitle.trim());
            setNewTitle("");
          }}
          className="rounded border border-slate-300 px-2 py-1 text-xs"
        >
          Add
        </button>
      </div>
      <div className="space-y-2">
        <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function BoardDnd({ projectId, initialColumns }: BoardDndProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  const selectedTask = useMemo(
    () => columns.flatMap((c) => c.tasks).find((task) => task.id === selectedTaskId) ?? null,
    [columns, selectedTaskId],
  );

  const persistOrder = (nextColumns: BoardColumn[]) => {
    startTransition(async () => {
      const payload = {
        projectId,
        columns: nextColumns.map((col) => ({
          id: col.id,
          taskIds: col.tasks.map((task) => task.id),
        })),
      };

      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({ error: "Failed to reorder tasks." }))) as {
          error?: string;
        };
        window.alert(data.error ?? "Failed to reorder tasks.");
      }
    });
  };

  const createTask = (columnId: string, title: string) => {
    startTransition(async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, columnId, title }),
      });
      const json = (await res.json()) as { task?: TaskItem & { column_id: string }; error?: string };
      if (!res.ok || !json.task) {
        window.alert(json.error ?? "Failed to create task.");
        return;
      }

      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? {
                ...col,
                tasks: [
                  ...col.tasks,
                  {
                    id: json.task!.id,
                    title: json.task!.title,
                    description: json.task!.description ?? null,
                    priority: json.task!.priority,
                    status: json.task!.status,
                    assignee_id: json.task!.assignee_id ?? null,
                    milestone_id: json.task!.milestone_id ?? null,
                  },
                ],
              }
            : col,
        ),
      );
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceColumn = findColumnByTask(columns, activeId);
    const targetColumn = findColumnByTask(columns, overId);
    if (!sourceColumn || !targetColumn) return;

    const sourceIndex = sourceColumn.tasks.findIndex((task) => task.id === activeId);
    const targetIndex = targetColumn.tasks.findIndex((task) => task.id === overId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextColumns = columns.map((col) => ({ ...col, tasks: [...col.tasks] }));
    const source = nextColumns.find((c) => c.id === sourceColumn.id);
    const target = nextColumns.find((c) => c.id === targetColumn.id);
    if (!source || !target) return;

    if (source.id === target.id) {
      source.tasks = arrayMove(source.tasks, sourceIndex, targetIndex);
      setColumns(nextColumns);
      persistOrder(nextColumns);
      return;
    }

    const [moved] = source.tasks.splice(sourceIndex, 1);
    target.tasks.splice(targetIndex, 0, moved);
    setColumns(nextColumns);
    persistOrder(nextColumns);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Drag and drop tasks to reorder or move between columns.
        </p>
        {isPending ? <p className="text-xs text-slate-500">Saving...</p> : null}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <ColumnContainer
              key={column.id}
              column={column}
              onOpenTask={setSelectedTaskId}
              onCreateTask={createTask}
            />
          ))}
        </div>
      </DndContext>
      {activeTaskId ? <p className="text-xs text-slate-500">Dragging: {activeTaskId}</p> : null}

      {selectedTask ? (
        <TaskDetailModal
          key={selectedTask.id}
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onSaved={(next) => {
            setColumns((prev) =>
              prev.map((column) => ({
                ...column,
                tasks: column.tasks.map((task) => (task.id === next.id ? next : task)),
              })),
            );
          }}
        />
      ) : null}
    </section>
  );
}
