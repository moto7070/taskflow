import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { canAccessProject, requireUserId } from "@/lib/rbac/guards";
import { createClient } from "@/utils/supabase/server";

interface WikiDetailPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function WikiDetailPage({ params }: WikiDetailPageProps) {
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
    .select("id, title, body, created_at, updated_at")
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
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{page.title}</h1>
              <p className="mt-2 text-xs text-slate-500">
                Created: {new Date(page.created_at).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Updated: {new Date(page.updated_at).toLocaleString()}
              </p>
            </div>
            <Link
              href={`/app/project/${projectId}/wiki`}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Back
            </Link>
          </div>
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <pre className="whitespace-pre-wrap break-words text-sm text-slate-800">{page.body || ""}</pre>
        </article>
      </div>
    </main>
  );
}
