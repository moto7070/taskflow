import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { canAccessProject, requireUserId } from "@/lib/rbac/guards";

import { WikiEditorForm } from "../wiki-editor-form";

interface NewWikiPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewWikiPage({ params }: NewWikiPageProps) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const hasAccess = await canAccessProject(projectId, userId);

  if (!hasAccess) {
    return (
      <AccessDenied
        title="You do not have access to this project."
        description="Wiki pages are available only to project members."
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">New Wiki Page</h1>
            <p className="mt-1 text-sm text-slate-600">projectId: {projectId}</p>
          </div>
          <Link
            href={`/app/project/${projectId}/wiki`}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Back to list
          </Link>
        </div>

        <WikiEditorForm projectId={projectId} mode="create" />
      </div>
    </main>
  );
}
