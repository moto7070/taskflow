import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { canAccessProject } from "@/lib/server/project-access";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { createMilestoneSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessProject(projectId, user.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("milestones")
    .select("id, name, status, due_date")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load milestones." }, { status: 500 });
  return NextResponse.json({ milestones: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = consumeRateLimit({
    scope: "milestones:create",
    userId: user.id,
    request: req,
    limit: 20,
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

  const parsed = createMilestoneSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;

  const { data: lastMilestone } = await supabase
    .from("milestones")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (lastMilestone?.sort_order ?? 0) + 100;

  const { data, error } = await supabase
    .from("milestones")
    .insert({
      project_id: projectId,
      name: payload.name,
      due_date: payload.due_date,
      status: payload.status ?? "planned",
      created_by: user.id,
      sort_order: nextSort,
    })
    .select("id, name, status, due_date")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to create milestone." }, { status: 500 });
  return NextResponse.json({ milestone: data });
}
