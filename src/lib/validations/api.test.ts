import { describe, expect, it } from "vitest";

import {
  createTaskSchema,
  createWikiPageSchema,
  reorderPayloadSchema,
  updateSubtaskSchema,
  updateTaskSchema,
  updateWikiPageSchema,
} from "@/lib/validations/api";

describe("createTaskSchema", () => {
  it("accepts valid payload", () => {
    const parsed = createTaskSchema.parse({
      projectId: "89b52ce3-c0be-4a96-9f1f-03b387f33353",
      columnId: "7f6ca4bd-b4e1-4690-a566-cf8f3487d703",
      title: "Implement milestone filter",
    });

    expect(parsed.title).toBe("Implement milestone filter");
  });

  it("rejects empty title", () => {
    const result = createTaskSchema.safeParse({
      projectId: "89b52ce3-c0be-4a96-9f1f-03b387f33353",
      columnId: "7f6ca4bd-b4e1-4690-a566-cf8f3487d703",
      title: "   ",
    });

    expect(result.success).toBe(false);
  });
});

describe("reorderPayloadSchema", () => {
  it("requires at least one column", () => {
    const result = reorderPayloadSchema.safeParse({
      projectId: "89b52ce3-c0be-4a96-9f1f-03b387f33353",
      columns: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("accepts nullable assignee and milestone", () => {
    const parsed = updateTaskSchema.parse({
      assignee_id: null,
      milestone_id: null,
      status: "done",
    });

    expect(parsed.status).toBe("done");
  });
});

describe("updateSubtaskSchema", () => {
  it("rejects empty update payload", () => {
    const result = updateSubtaskSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts title-only update", () => {
    const result = updateSubtaskSchema.safeParse({ title: "Update docs" });
    expect(result.success).toBe(true);
  });
});

describe("wiki schemas", () => {
  it("rejects blank create title", () => {
    const result = createWikiPageSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects empty patch payload", () => {
    const result = updateWikiPageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
