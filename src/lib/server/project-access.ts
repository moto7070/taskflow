import { createClient } from "@/utils/supabase/server";

export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (projectMember) return true;

  const { data: project } = await supabase.from("projects").select("team_id").eq("id", projectId).maybeSingle();
  if (!project) return false;

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();
  return teamMember?.role === "admin";
}
