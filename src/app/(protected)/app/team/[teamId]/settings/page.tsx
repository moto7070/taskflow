interface TeamSettingsPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const { teamId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Team Settings</h1>
        <p className="mt-2 text-sm text-slate-600">teamId: {teamId}</p>
        <p className="mt-2 text-sm text-slate-600">メンバー管理UIは次ステップで実装します。</p>
      </div>
    </main>
  );
}
