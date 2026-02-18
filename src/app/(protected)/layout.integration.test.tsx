import { beforeEach, describe, expect, it, vi } from "vitest";

import ProtectedLayout from "@/app/(protected)/layout";

const mockContext = vi.hoisted(() => {
  const redirectMock = vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  });
  const getUserMock = vi.fn();
  const createClientMock = vi.fn(async () => ({
    auth: { getUser: getUserMock },
  }));

  return { redirectMock, getUserMock, createClientMock };
});

vi.mock("next/navigation", () => ({
  redirect: mockContext.redirectMock,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockContext.createClientMock,
}));

describe("ProtectedLayout integration", () => {
  beforeEach(() => {
    mockContext.redirectMock.mockClear();
    mockContext.getUserMock.mockReset();
  });

  it("redirects to login when user is not authenticated", async () => {
    mockContext.getUserMock.mockResolvedValueOnce({
      data: { user: null },
    });

    await expect(
      ProtectedLayout({
        children: "content",
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockContext.redirectMock).toHaveBeenCalledWith("/auth/login");
  });

  it("renders children when user is authenticated", async () => {
    mockContext.getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
    });

    const result = await ProtectedLayout({
      children: "content",
    });

    expect(result).toBeDefined();
    expect(mockContext.redirectMock).not.toHaveBeenCalled();
  });
});
