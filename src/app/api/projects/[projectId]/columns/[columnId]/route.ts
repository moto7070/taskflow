import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { canAccessProject } from "@/lib/server/project-access";
import { updateColumnSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; columnId: string }> },
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { projectId, columnId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessProject(projectId, user.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateColumnSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { data, error } = await supabase
    .from("columns")
    .update({ name: parsed.data.name })
    .eq("id", columnId)
    .eq("project_id", projectId)
    .select("id, name, sort_order")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to update column." }, { status: 500 });
  return NextResponse.json({ column: data });
}
