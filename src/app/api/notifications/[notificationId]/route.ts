import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface UpdateNotificationPayload {
  is_read: boolean;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await params;
  const payload = (await req.json()) as UpdateNotificationPayload;
  if (typeof payload?.is_read !== "boolean") {
    return NextResponse.json({ error: "is_read must be boolean." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = payload.is_read
    ? { is_read: true, read_at: new Date().toISOString() }
    : { is_read: false, read_at: null };

  const { data, error } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id, is_read, read_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
}
