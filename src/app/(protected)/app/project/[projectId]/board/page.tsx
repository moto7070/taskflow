import { AccessDenied } from "@/components/access-denied";
import { canAccessProject, requireUserId } from "@/lib/rbac/guards";

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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Project Board</h1>
        <p className="mt-2 text-sm text-slate-600">projectId: {projectId}</p>
        <p className="mt-2 text-sm text-slate-600">Board and drag-and-drop UI will be implemented next.</p>
      </div>
    </main>
  );
}
