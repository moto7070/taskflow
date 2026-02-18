import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { updateNotificationSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { notificationId } = await params;
  const parsed = updateNotificationSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;

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

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to update notification.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ notification: data });
}
