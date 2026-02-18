import { AccessDenied } from "@/components/access-denied";
import { BoardDnd } from "@/components/board-dnd";
import { canAccessProject, requireUserId } from "@/lib/rbac/guards";
import { createClient } from "@/utils/supabase/server";

interface ProjectBoardPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectBoardPage({ params }: ProjectBoardPageProps) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const hasAccess = await canAccessProject(projectId, userId);

  if (!hasAccess) {
    return (
      <AccessDenied
        title="You do not have access to this project."
        description="Ask a team admin to add you to the project."
      />
    );
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();

  const { data: columns } = await supabase
    .from("columns")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, priority, status, assignee_id, milestone_id, column_id, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, name, status, due_date, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("user_id, profiles(display_name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const memberLabels =
    memberRows?.map((memberRow) => {
      const profile = Array.isArray(memberRow.profiles) ? memberRow.profiles[0] : memberRow.profiles;
      return profile?.display_name ?? memberRow.user_id;
    }) ?? [];

  const boardColumns =
    columns?.map((column) => ({
      id: column.id,
      name: column.name,
      sortOrder: column.sort_order,
      tasks:
        tasks
          ?.filter((task) => task.column_id === column.id)
          .map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description ?? null,
            priority: task.priority,
            status: task.status,
            assignee_id: task.assignee_id ?? null,
            milestone_id: task.milestone_id ?? null,
          })) ?? [],
    })) ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <BoardDnd
          projectId={projectId}
          projectName={project?.name ?? "Project Board"}
          memberLabels={memberLabels}
          initialColumns={boardColumns}
          milestones={
            milestones?.map((milestone) => ({
              id: milestone.id,
              name: milestone.name,
              status: milestone.status,
              due_date: milestone.due_date ?? "",
            })) ?? []
          }
        />
      </div>
    </main>
  );
}
