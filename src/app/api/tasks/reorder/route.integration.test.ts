import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/tasks/reorder/route";

const mockContext = vi.hoisted(() => {
  const createClientMock = vi.fn();
  return { createClientMock };
});

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockContext.createClientMock,
}));

function buildUnauthorizedClient() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
    from: vi.fn(),
  };
}

function buildAuthorizedClient() {
  const updateCalls: Array<{ id: string; projectId: string; values: Record<string, unknown> }> = [];

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })),
    },
    from: vi.fn((table: string) => {
      if (table === "project_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "pm-1" } }),
              }),
            }),
          }),
        };
      }

      if (table === "tasks") {
        return {
          select: () => ({
            eq: () => ({
              in: async (_: string, ids: string[]) => ({
                data: ids.map((id) => ({ id })),
              }),
            }),
          }),
          update: (values: Record<string, unknown>) => ({
            eq: (field: string, id: string) => ({
              eq: (projectField: string, projectId: string) => {
                if (field === "id" && projectField === "project_id") {
                  updateCalls.push({ id, projectId, values });
                }
                return { error: null };
              },
            }),
          }),
        };
      }

      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }

      if (table === "team_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client, updateCalls };
}

describe("POST /api/tasks/reorder integration", () => {
  beforeEach(() => {
    mockContext.createClientMock.mockReset();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockContext.createClientMock.mockResolvedValueOnce(buildUnauthorizedClient());

    const req = new Request("http://localhost/api/tasks/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: "89b52ce3-c0be-4a96-9f1f-03b387f33353",
        columns: [{ id: "7f6ca4bd-b4e1-4690-a566-cf8f3487d703", taskIds: [] }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("reorders tasks and returns ok for authorized member", async () => {
    const { client, updateCalls } = buildAuthorizedClient();
    mockContext.createClientMock.mockResolvedValue(client);

    const req = new Request("http://localhost/api/tasks/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: "89b52ce3-c0be-4a96-9f1f-03b387f33353",
        columns: [
          {
            id: "7f6ca4bd-b4e1-4690-a566-cf8f3487d703",
            taskIds: [
              "95b68f6b-3876-4850-a84d-d2483e04625b",
              "1e251e06-8015-4e5d-b346-6a611262ba4e",
            ],
          },
        ],
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0]?.values.sort_order).toBe(100);
    expect(updateCalls[1]?.values.sort_order).toBe(200);
  });
});
