import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { canAccessProject, requireUserId } from "@/lib/rbac/guards";
import { createClient } from "@/utils/supabase/server";

import { WikiEditorForm } from "../../wiki-editor-form";

interface EditWikiPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function EditWikiPage({ params }: EditWikiPageProps) {
  const { projectId, pageId } = await params;
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

  const supabase = await createClient();
  const { data: page } = await supabase
    .from("wiki_pages")
    .select("id, title, body")
    .eq("id", pageId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!page) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Wiki page not found</h1>
          <Link
            href={`/app/project/${projectId}/wiki`}
            className="mt-4 inline-block rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Back to wiki list
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Edit Wiki Page</h1>
            <p className="mt-1 text-sm text-slate-600">{page.title}</p>
          </div>
          <Link
            href={`/app/project/${projectId}/wiki/${pageId}`}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Back to detail
          </Link>
        </div>

        <WikiEditorForm
          projectId={projectId}
          pageId={pageId}
          mode="edit"
          initialTitle={page.title}
          initialBody={page.body}
        />
      </div>
    </main>
  );
}
