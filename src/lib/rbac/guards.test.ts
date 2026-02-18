import { beforeEach, describe, expect, it, vi } from "vitest";

import { canAccessProject, isTeamAdmin } from "@/lib/rbac/guards";

const mockContext = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ eq: eqMock, maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const createClientMock = vi.fn(async () => ({ from: fromMock }));
  return { maybeSingleMock, eqMock, selectMock, fromMock, createClientMock };
});

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockContext.createClientMock,
}));

describe("isTeamAdmin", () => {
  beforeEach(() => {
    mockContext.maybeSingleMock.mockReset();
    mockContext.eqMock.mockClear();
    mockContext.selectMock.mockClear();
    mockContext.fromMock.mockClear();
    mockContext.createClientMock.mockClear();
  });

  it("returns true when role is admin", async () => {
    mockContext.maybeSingleMock.mockResolvedValueOnce({
      data: { role: "admin" },
      error: null,
    });

    const result = await isTeamAdmin("team-1", "user-1");

    expect(result).toBe(true);
    expect(mockContext.fromMock).toHaveBeenCalledWith("team_members");
  });

  it("returns false when query fails", async () => {
    mockContext.maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });

    const result = await isTeamAdmin("team-1", "user-1");
    expect(result).toBe(false);
  });
});

describe("canAccessProject", () => {
  beforeEach(() => {
    mockContext.maybeSingleMock.mockReset();
    mockContext.eqMock.mockClear();
    mockContext.selectMock.mockClear();
    mockContext.fromMock.mockClear();
    mockContext.createClientMock.mockClear();
  });

  it("returns true when user is direct project member", async () => {
    mockContext.maybeSingleMock.mockResolvedValueOnce({
      data: { id: "pm-1" },
      error: null,
    });

    const result = await canAccessProject("project-1", "user-1");
    expect(result).toBe(true);
  });

  it("returns true when user is team admin", async () => {
    mockContext.maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { team_id: "team-1" }, error: null })
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null });

    const result = await canAccessProject("project-1", "user-1");
    expect(result).toBe(true);
  });

  it("returns false when user is neither project member nor team admin", async () => {
    mockContext.maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { team_id: "team-1" }, error: null })
      .mockResolvedValueOnce({ data: { role: "user" }, error: null });

    const result = await canAccessProject("project-1", "user-1");
    expect(result).toBe(false);
  });
});
