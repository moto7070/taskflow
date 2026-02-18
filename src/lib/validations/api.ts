import { z } from "zod";

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  columnId: z.uuid(),
  title: z.string().trim().min(1).max(200),
});

export const reorderPayloadSchema = z.object({
  projectId: z.uuid(),
  columns: z
    .array(
      z.object({
        id: z.uuid(),
        taskIds: z.array(z.uuid()),
      }),
    )
    .min(1),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  assignee_id: z.uuid().nullable().optional(),
  milestone_id: z.uuid().nullable().optional(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  parent_comment_id: z.uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const updateSubtaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    is_done: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.is_done !== undefined, {
    message: "No updates.",
  });

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

export const createWikiPageSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().optional(),
});

export const updateWikiPageSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().optional(),
  })
  .refine((value) => value.title !== undefined || value.body !== undefined, {
    message: "No updates.",
  });

export const updateNotificationSchema = z.object({
  is_read: z.boolean(),
});

export const createMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(200),
  due_date: z.string().date(),
  status: z.enum(["planned", "done"]).optional(),
});

export const updateMilestoneSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    due_date: z.string().date().optional(),
    status: z.enum(["planned", "done"]).optional(),
  })
  .refine((value) => value.name !== undefined || value.due_date !== undefined || value.status !== undefined, {
    message: "No updates.",
  });

export const createColumnSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateColumnSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
