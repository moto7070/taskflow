import { logoutAction } from "@/app/(public)/auth/actions";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </form>
        </div>
        <p className="mt-2 text-sm text-slate-600">所属チームとプロジェクトの概要をここに表示します。</p>
      </div>
    </main>
  );
}
