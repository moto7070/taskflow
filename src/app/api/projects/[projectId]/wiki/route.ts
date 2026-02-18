import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface CreateWikiPagePayload {
  title: string;
  body?: string;
}

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
  const { projectId } = await params;
  const payload = (await req.json()) as CreateWikiPagePayload;
  const title = payload?.title?.trim();
  const body = payload?.body?.trim() ?? "";
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}
