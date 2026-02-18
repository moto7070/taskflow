import { AccessDenied } from "@/components/access-denied";
import { canAccessProject, requireUserId } from "@/lib/rbac/guards";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

interface ProjectWikiPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWikiPage({ params }: ProjectWikiPageProps) {
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

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("id, title, body, updated_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {project?.name ?? "Project"} Wiki
              </h1>
              <p className="mt-1 text-sm text-slate-600">projectId: {projectId}</p>
            </div>
            <Link
              href={`/app/project/${projectId}/wiki/new`}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              New page
            </Link>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Pages</h2>
          <div className="mt-4 space-y-3">
            {pages?.length ? (
              pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/app/project/${projectId}/wiki/${page.id}`}
                  className="block rounded-md border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{page.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {(page.body || "").slice(0, 180) || "No content"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Updated: {new Date(page.updated_at).toLocaleString()}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">No wiki pages yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
