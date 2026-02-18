import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user.id;
}

export async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return data?.role === "admin";
}

export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: projectMember, error: pmError } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (pmError) {
    return false;
  }

  if (projectMember) {
    return true;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return false;
  }

  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (teamMemberError) {
    return false;
  }

  return teamMember?.role === "admin";
}
