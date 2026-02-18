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
    .select("id, title, description, priority, status, assignee_id, column_id, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

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
          })) ?? [],
    })) ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-semibold text-slate-900">{project?.name ?? "Project Board"}</h1>
          <p className="mt-1 text-sm text-slate-600">projectId: {projectId}</p>
        </div>

        <BoardDnd projectId={projectId} initialColumns={boardColumns} />
      </div>
    </main>
  );
}
