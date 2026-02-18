export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">パスワード再設定</h1>
      <p className="mt-2 text-sm text-slate-600">登録済みEmailに再設定リンクを送信します。</p>

      <form className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            placeholder="you@example.com"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          再設定リンクを送信
        </button>
      </form>
    </main>
  );
}
