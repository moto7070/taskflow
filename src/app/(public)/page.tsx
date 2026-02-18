import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Project OS for teams</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900">
          TaskFlowで、マイルストーンとタスクを一つの流れで管理する
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          開発、マーケティング、制作などのプロジェクトを共通のボードで運用し、進行状況を明確化します。
        </p>
        <div className="flex gap-3">
          <Link
            href="/auth/signup"
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            無料で始める
          </Link>
          <Link
            href="/auth/login"
            className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
          >
            ログイン
          </Link>
        </div>
      </main>
    </div>
  );
}
