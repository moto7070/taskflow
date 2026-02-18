import { createClient } from "@/utils/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface AuditLogInput {
  teamId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(client: SupabaseServerClient, input: AuditLogInput): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    team_id: input.teamId,
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    project_id: input.projectId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[TaskFlow][AuditLogError]", {
      action: input.action,
      teamId: input.teamId,
      actorUserId: input.actorUserId,
      error,
    });
  }
}
