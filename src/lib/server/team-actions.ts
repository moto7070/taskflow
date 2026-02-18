"use server";

import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/app-url";
import { writeAuditLog } from "@/lib/server/audit-log";
import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { sendInviteMail } from "@/lib/server/invite-email";
import { createClient } from "@/utils/supabase/server";

function withQuery(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${path}?${search.toString()}`;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, user };
}

async function assertTeamAdmin(teamId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role === "admin";
}

export async function createTeamAction(formData: FormData) {
  const teamName = getString(formData, "team_name");
  if (!teamName) {
    redirect(withQuery("/app", { error: "Team name is required." }));
  }

  const { supabase, user } = await requireUser();
  const teamId = crypto.randomUUID();

  const { error: teamError } = await supabase
    .from("teams")
    .insert({ id: teamId, name: teamName, created_by: user.id });

  if (teamError) {
    redirect(withQuery("/app", { error: toPublicErrorMessage(teamError, "Failed to create team.") }));
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) {
    redirect(withQuery("/app", { error: toPublicErrorMessage(memberError, "Failed to add team owner.") }));
  }

  redirect(withQuery("/app", { message: "Team created." }));
}

export async function createProjectAction(formData: FormData) {
  const teamId = getString(formData, "team_id");
  const projectName = getString(formData, "project_name");

  if (!teamId || !projectName) {
    redirect(withQuery("/app", { error: "Team and project name are required." }));
  }

  const { supabase, user } = await requireUser();
  const canManage = await assertTeamAdmin(teamId, user.id);
  if (!canManage) {
    redirect(withQuery("/app", { error: "Only team admins can create projects." }));
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      team_id: teamId,
      name: projectName,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    redirect(withQuery("/app", { error: toPublicErrorMessage(projectError, "Failed to create project.") }));
  }

  const { error: pmError } = await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "admin",
  });

  if (pmError) {
    redirect(withQuery("/app", { error: toPublicErrorMessage(pmError, "Failed to add project owner.") }));
  }

  await writeAuditLog(supabase, {
    teamId,
    actorUserId: user.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    projectId: project.id,
    metadata: {
      name: projectName,
    },
  });

  redirect(withQuery("/app", { message: "Project created." }));
}

export async function removeProjectAction(formData: FormData) {
  const teamId = getString(formData, "team_id");
  const projectId = getString(formData, "project_id");

  if (!teamId || !projectId) {
    redirect(withQuery("/app", { error: "Missing parameters." }));
  }

  const { supabase, user } = await requireUser();
  const canManage = await assertTeamAdmin(teamId, user.id);
  if (!canManage) {
    redirect(withQuery("/app", { error: "Only team admins can remove projects." }));
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, team_id, name")
    .eq("id", projectId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (projectError || !project) {
    redirect(withQuery("/app", { error: "Project not found." }));
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("team_id", teamId);

  if (error) {
    redirect(withQuery("/app", { error: toPublicErrorMessage(error, "Failed to remove project.") }));
  }

  await writeAuditLog(supabase, {
    teamId,
    actorUserId: user.id,
    action: "project.removed",
    targetType: "project",
    targetId: projectId,
    metadata: {
      name: project.name,
    },
  });

  redirect(withQuery("/app", { message: "Project removed." }));
}

export async function inviteMemberAction(formData: FormData) {
  const teamId = getString(formData, "team_id");
  const email = getString(formData, "email").toLowerCase();
  const role = getString(formData, "role") || "user";

  if (!teamId || !email) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "Email is required." }));
  }

  const { supabase, user } = await requireUser();
  const canManage = await assertTeamAdmin(teamId, user.id);
  if (!canManage) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "Only team admins can invite members." }));
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const normalizedRole = role === "admin" ? "admin" : "user";

  const { error } = await supabase.from("invitations").insert({
    team_id: teamId,
    email,
    role: normalizedRole,
    token,
    expires_at: expiresAt,
    created_by: user.id,
  });

  if (error) {
    redirect(
      withQuery(`/app/team/${teamId}/settings`, {
        error: toPublicErrorMessage(error, "Failed to create invitation."),
      }),
    );
  }

  await writeAuditLog(supabase, {
    teamId,
    actorUserId: user.id,
    action: "team.member_invited",
    targetType: "invitation",
    metadata: {
      invited_email: email,
      role: normalizedRole,
    },
  });

  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const { data: team } = await supabase.from("teams").select("name").eq("id", teamId).maybeSingle();
  const teamName = team?.name ?? "your team";

  const emailResult = await sendInviteMail({
    to: email,
    inviteUrl,
    teamName,
    role: normalizedRole,
    invitedByEmail: user.email ?? "team admin",
  });

  if (!emailResult.sent) {
    redirect(
      withQuery(`/app/team/${teamId}/settings`, {
        message: "Invitation created, but invite email was not sent. Share the link from Invitations list.",
      }),
    );
  }

  redirect(withQuery(`/app/team/${teamId}/settings`, { message: "Invitation created and email sent." }));
}

export async function updateMemberRoleAction(formData: FormData) {
  const teamId = getString(formData, "team_id");
  const memberId = getString(formData, "member_id");
  const role = getString(formData, "role");

  if (!teamId || !memberId || !role) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "Missing parameters." }));
  }

  const { supabase, user } = await requireUser();
  const canManage = await assertTeamAdmin(teamId, user.id);
  if (!canManage) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "Only team admins can update roles." }));
  }

  const { error } = await supabase
    .from("team_members")
    .update({ role: role === "admin" ? "admin" : "user" })
    .eq("team_id", teamId)
    .eq("user_id", memberId);

  if (error) {
    redirect(
      withQuery(`/app/team/${teamId}/settings`, {
        error: toPublicErrorMessage(error, "Failed to update member role."),
      }),
    );
  }

  await writeAuditLog(supabase, {
    teamId,
    actorUserId: user.id,
    action: "team.member_role_updated",
    targetType: "team_member",
    targetId: memberId,
    metadata: {
      role: role === "admin" ? "admin" : "user",
    },
  });

  redirect(withQuery(`/app/team/${teamId}/settings`, { message: "Role updated." }));
}

export async function removeMemberAction(formData: FormData) {
  const teamId = getString(formData, "team_id");
  const memberId = getString(formData, "member_id");

  if (!teamId || !memberId) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "Missing parameters." }));
  }

  const { supabase, user } = await requireUser();
  const canManage = await assertTeamAdmin(teamId, user.id);
  if (!canManage) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "Only team admins can remove members." }));
  }

  if (memberId === user.id) {
    redirect(withQuery(`/app/team/${teamId}/settings`, { error: "You cannot remove yourself." }));
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", memberId);

  if (error) {
    redirect(
      withQuery(`/app/team/${teamId}/settings`, {
        error: toPublicErrorMessage(error, "Failed to remove member."),
      }),
    );
  }

  await writeAuditLog(supabase, {
    teamId,
    actorUserId: user.id,
    action: "team.member_removed",
    targetType: "team_member",
    targetId: memberId,
  });

  redirect(withQuery(`/app/team/${teamId}/settings`, { message: "Member removed." }));
}

export async function acceptInvitationAction(formData: FormData) {
  const token = getString(formData, "token");
  if (!token) {
    redirect(withQuery("/app", { error: "Invalid invitation token." }));
  }

  const { supabase, user } = await requireUser();
  const userEmail = user.email?.toLowerCase();
  if (!userEmail) {
    redirect(withQuery("/app", { error: "Your account email is missing." }));
  }

  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .select("id, team_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invitation) {
    redirect(withQuery("/app", { error: "Invitation not found." }));
  }

  if (invitation.email.toLowerCase() !== userEmail) {
    redirect(withQuery("/app", { error: "Invitation email does not match your account." }));
  }

  if (invitation.accepted_at) {
    redirect(withQuery("/app", { message: "Invitation already accepted." }));
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    redirect(withQuery("/app", { error: "Invitation expired." }));
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: user.id,
    role: invitation.role,
  });

  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    redirect(withQuery("/app", { error: toPublicErrorMessage(memberError, "Failed to accept invitation.") }));
  }

  await supabase.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);

  redirect(withQuery("/app", { message: "Invitation accepted." }));
}
