import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/tasks/[taskId]/comments/route";

const mockContext = vi.hoisted(() => {
  const createClientMock = vi.fn();
  const createAdminClientMock = vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://example.com/file" } })),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
    })),
  }));

  return { createClientMock, createAdminClientMock };
});

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockContext.createClientMock,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mockContext.createAdminClientMock,
}));

function buildAuthOnlyClient(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user } })),
    },
    from: vi.fn(() => {
      throw new Error("from() should not be called in this test path");
    }),
  };
}

describe("comments route integration", () => {
  beforeEach(() => {
    mockContext.createClientMock.mockReset();
    mockContext.createAdminClientMock.mockClear();
  });

  it("GET returns 401 when not authenticated", async () => {
    mockContext.createClientMock.mockResolvedValueOnce(buildAuthOnlyClient(null));

    const res = await GET(new Request("http://localhost/api/tasks/t1/comments"), {
      params: Promise.resolve({ taskId: "t1" }),
    });

    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid payload", async () => {
    mockContext.createClientMock.mockResolvedValueOnce(buildAuthOnlyClient({ id: "user-1" }));

    const req = new Request("http://localhost/api/tasks/t1/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "" }),
    });

    const res = await POST(req, { params: Promise.resolve({ taskId: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("POST returns 401 for valid payload when unauthenticated", async () => {
    mockContext.createClientMock.mockResolvedValueOnce(buildAuthOnlyClient(null));

    const req = new Request("http://localhost/api/tasks/t1/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "hello world" }),
    });

    const res = await POST(req, { params: Promise.resolve({ taskId: "t1" }) });
    expect(res.status).toBe(401);
  });
});
