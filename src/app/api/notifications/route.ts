import { NextResponse } from "next/server";

import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

  let query = supabase
    .from("notifications")
    .select("id, type, body, is_read, read_at, created_at, project_id, task_id, comment_id, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to load notifications.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ notifications: data ?? [] });
}
