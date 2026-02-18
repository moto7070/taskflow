import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { canAccessProject } from "@/lib/server/project-access";
import { createColumnSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

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

  const access = await canAccessProject(projectId, user.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createColumnSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;

  const { data: lastColumn } = await supabase
    .from("columns")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (lastColumn?.sort_order ?? 0) + 100;

  const { data, error } = await supabase
    .from("columns")
    .insert({
      project_id: projectId,
      name: payload.name,
      sort_order: nextSort,
    })
    .select("id, name, sort_order")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to add column." }, { status: 500 });
  return NextResponse.json({ column: data });
}
