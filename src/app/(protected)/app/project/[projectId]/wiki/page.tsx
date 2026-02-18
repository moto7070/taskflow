interface ProjectWikiPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWikiPage({ params }: ProjectWikiPageProps) {
  const { projectId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Project Wiki</h1>
        <p className="mt-2 text-sm text-slate-600">projectId: {projectId}</p>
        <p className="mt-2 text-sm text-slate-600">Wiki一覧/編集機能は次ステップで実装します。</p>
      </div>
    </main>
  );
}
