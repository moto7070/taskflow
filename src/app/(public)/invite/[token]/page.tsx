import Link from "next/link";

import { acceptInvitationAction } from "@/lib/server/team-actions";
import { createClient } from "@/utils/supabase/server";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Invitation</h1>
      <p className="mt-2 text-sm text-slate-600">
        Accept this invitation to join a team in TaskFlow.
      </p>

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Token: <span className="font-mono">{token}</span>
      </div>

      {user ? (
        <form action={acceptInvitationAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Accept invitation
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-rose-600">Log in first to accept this invitation.</p>
          <Link href="/auth/login" className="text-sm text-slate-700 underline">
            Go to login
          </Link>
        </div>
      )}
    </main>
  );
}
