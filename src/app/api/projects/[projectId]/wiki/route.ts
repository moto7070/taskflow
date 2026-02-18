import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { createWikiPageSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

async function canAccessProject(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectMember) return true;

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return false;

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();
  return teamMember?.role === "admin";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { projectId } = await params;
  const parsed = createWikiPageSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { title } = parsed.data;
  const body = parsed.data.body ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit({
    scope: "wiki:create",
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

  const hasAccess = await canAccessProject(projectId, user.id);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("wiki_pages")
    .insert({
      project_id: projectId,
      title,
      body,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id, project_id, title, body, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to create wiki page.") },
      { status: 500 },
    );
  }

  const { error: revisionError } = await supabase.from("wiki_revisions").insert({
    page_id: data.id,
    body: data.body ?? "",
    edited_by: user.id,
  });
  if (revisionError) {
    return NextResponse.json(
      {
        page: data,
        warning: toPublicErrorMessage(revisionError, "Page created but revision save failed."),
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ page: data });
}
