interface ProjectBoardPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectBoardPage({ params }: ProjectBoardPageProps) {
  const { projectId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Project Board</h1>
        <p className="mt-2 text-sm text-slate-600">projectId: {projectId}</p>
        <p className="mt-2 text-sm text-slate-600">カンバンとD&Dは次ステップで実装します。</p>
      </div>
    </main>
  );
}
