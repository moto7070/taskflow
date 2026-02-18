import { NextResponse } from "next/server";

import { updateWikiPageSchema } from "@/lib/validations/api";
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> },
) {
  const { projectId, pageId } = await params;
  const parsed = updateWikiPageSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessProject(projectId, user.id);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: existingPage, error: existingPageError } = await supabase
    .from("wiki_pages")
    .select("id, body")
    .eq("id", pageId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingPageError || !existingPage) {
    return NextResponse.json({ error: existingPageError?.message ?? "Page not found." }, { status: 404 });
  }

  const updates: Record<string, string | null> = {
    updated_by: user.id,
  };
  if (typeof payload.title === "string") {
    updates.title = payload.title;
  }
  if (typeof payload.body === "string") updates.body = payload.body;

  const { data, error } = await supabase
    .from("wiki_pages")
    .update(updates)
    .eq("id", pageId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .select("id, project_id, title, body, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nextBody = typeof payload.body === "string" ? payload.body : existingPage.body ?? "";
  if (nextBody !== (existingPage.body ?? "")) {
    const { error: revisionError } = await supabase.from("wiki_revisions").insert({
      page_id: data.id,
      body: nextBody,
      edited_by: user.id,
    });
    if (revisionError) {
      return NextResponse.json(
        { page: data, warning: "Page updated but revision insert failed.", detail: revisionError.message },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ page: data });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> },
) {
  const { projectId, pageId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessProject(projectId, user.id);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("wiki_pages")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", pageId)
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
