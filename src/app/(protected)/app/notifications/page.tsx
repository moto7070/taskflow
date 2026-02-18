import Link from "next/link";

import { NotificationsClient } from "./notifications-client";

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
            <p className="mt-1 text-sm text-slate-600">Mentions and project updates</p>
          </div>
          <Link
            href="/app"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>

        <NotificationsClient />
      </div>
    </main>
  );
}
