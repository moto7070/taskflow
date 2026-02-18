interface AccessDeniedProps {
  title?: string;
  description?: string;
}

export function AccessDenied({
  title = "アクセス権限がありません",
  description = "この操作は管理者または対象メンバーのみ実行できます。",
}: AccessDeniedProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-semibold text-rose-700">{title}</h1>
        <p className="mt-2 text-sm text-rose-600">{description}</p>
      </div>
    </main>
  );
}
