import { NextResponse } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { toPublicErrorMessage } from "@/lib/server/error-policy";
import { updateTaskSchema } from "@/lib/validations/api";
import { createClient } from "@/utils/supabase/server";

async function canAccessTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { ok: false };

  const { data: projectMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", task.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectMember) return { ok: true, projectId: task.project_id };

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", task.project_id)
    .maybeSingle();
  if (!project) return { ok: false };

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle();
  return { ok: teamMember?.role === "admin", projectId: task.project_id };
}

export async function GET(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessTask(taskId, user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, title, description, priority, status, assignee_id, milestone_id, column_id")
    .eq("id", taskId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to load task details.") },
      { status: 500 },
    );
  }

  const { data: projectMembers, error: projectMembersError } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", access.projectId);

  if (projectMembersError) {
    return NextResponse.json(
      { error: toPublicErrorMessage(projectMembersError, "Failed to load assignee candidates.") },
      { status: 500 },
    );
  }

  const candidateIds = Array.from(new Set((projectMembers ?? []).map((member) => member.user_id)));
  const { data: profiles, error: profilesError } =
    candidateIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", candidateIds)
      : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json(
      { error: toPublicErrorMessage(profilesError, "Failed to load profile data.") },
      { status: 500 },
    );
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const assigneeCandidates = candidateIds.map((id) => ({
    id,
    display_name: profileMap.get(id) ?? null,
  }));

  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("id, name, status, due_date")
    .eq("project_id", access.projectId)
    .order("due_date", { ascending: true });

  if (milestonesError) {
    return NextResponse.json(
      { error: toPublicErrorMessage(milestonesError, "Failed to load milestones.") },
      { status: 500 },
    );
  }

  return NextResponse.json({ task, assigneeCandidates, milestoneCandidates: milestones ?? [] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const { taskId } = await params;
  const parsed = updateTaskSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const payload = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessTask(taskId, user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, string | null> = {};
  if (typeof payload.title === "string") updates.title = payload.title.trim();
  if (typeof payload.description === "string" || payload.description === null) {
    updates.description = payload.description;
  }
  if (payload.priority) updates.priority = payload.priority;
  if (payload.status) updates.status = payload.status;
  if ("assignee_id" in payload) {
    if (payload.assignee_id === null) {
      updates.assignee_id = null;
    } else if (typeof payload.assignee_id === "string" && payload.assignee_id.trim().length > 0) {
      const { data: assigneeMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", access.projectId)
        .eq("user_id", payload.assignee_id)
        .maybeSingle();

      if (!assigneeMember) {
        return NextResponse.json({ error: "Assignee must be a project member." }, { status: 400 });
      }
      updates.assignee_id = payload.assignee_id;
    } else {
      return NextResponse.json({ error: "Invalid assignee_id." }, { status: 400 });
    }
  }
  if ("milestone_id" in payload) {
    if (payload.milestone_id === null) {
      updates.milestone_id = null;
    } else if (typeof payload.milestone_id === "string" && payload.milestone_id.trim().length > 0) {
      const { data: milestone } = await supabase
        .from("milestones")
        .select("id")
        .eq("id", payload.milestone_id)
        .eq("project_id", access.projectId)
        .maybeSingle();

      if (!milestone) {
        return NextResponse.json({ error: "Milestone must belong to this project." }, { status: 400 });
      }
      updates.milestone_id = payload.milestone_id;
    } else {
      return NextResponse.json({ error: "Invalid milestone_id." }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("id, title, description, priority, status, assignee_id, milestone_id, column_id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: toPublicErrorMessage(error, "Failed to update task.") },
      { status: 500 },
    );
  }
  return NextResponse.json({ task });
}
