export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">新しいパスワード設定</h1>
      <p className="mt-2 text-sm text-slate-600">認証済みリンク経由で新しいパスワードを設定します。</p>

      <form className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            placeholder="********"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          更新する
        </button>
      </form>
    </main>
  );
}
