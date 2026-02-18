import Link from "next/link";

import { googleLoginAction, loginAction } from "../actions";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = pickParam(params.message);
  const error = pickParam(params.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">ログイン</h1>
      <p className="mt-2 text-sm text-slate-600">まずはEmailログインで開始します（Googleは後続対応）。</p>

      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <form action={loginAction} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            name="password"
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring"
            placeholder="********"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          ログイン
        </button>
      </form>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <p className="text-xs text-slate-500">or</p>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <form action={googleLoginAction} className="mt-4">
        <input type="hidden" name="next" value="/app" />
        <button
          type="submit"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Continue with Google
        </button>
      </form>
      <Link href="/auth/forgot-password" className="mt-4 text-sm text-slate-600 underline">
        パスワードを忘れた場合
      </Link>
    </main>
  );
}
