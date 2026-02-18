import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { canAccessProject } from "@/lib/server/project-access";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { updateMilestoneSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { projectId, milestoneId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = consumeRateLimit({
    scope: "milestones:update",
    userId: user.id,
    request: req,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retry_after: rateLimit.retryAfterSec },
      { status: 429 },
    );
  }

  const access = await canAccessProject(projectId, user.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateMilestoneSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { data, error } = await supabase
    .from("milestones")
    .update(parsed.data)
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .select("id, name, status, due_date")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to update milestone." }, { status: 500 });
  return NextResponse.json({ milestone: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { projectId, milestoneId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessProject(projectId, user.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: "Failed to delete milestone." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
