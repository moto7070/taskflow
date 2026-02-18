"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

interface NotificationItem {
  id: string;
  type: "mention";
  body: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  project_id: string | null;
  task_id: string | null;
  comment_id: string | null;
  metadata: Record<string, unknown>;
}

export function NotificationsClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/notifications?limit=100");
    const json = (await res.json()) as { notifications?: NotificationItem[] };
    setItems(json.notifications ?? []);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchItems();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setRead = (notificationId: string, isRead: boolean) => {
    startTransition(async () => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: isRead }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to update notification.");
        return;
      }
      await fetchItems();
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error ?? "Failed to mark all notifications read.");
        return;
      }
      await fetchItems();
    });
  };

  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">Unread: {unreadCount}</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={pending || unreadCount === 0}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
        >
          Mark all read
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
      {!loading && items.length === 0 ? <p className="text-sm text-slate-500">No notifications.</p> : null}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-md border p-3 ${item.is_read ? "border-slate-200 bg-white" : "border-slate-300 bg-slate-50"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-900">{item.body ?? "You have a new notification."}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                {item.project_id ? (
                  <Link
                    href={`/app/project/${item.project_id}/board`}
                    className="mt-2 inline-block text-xs underline"
                  >
                    Open project board
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setRead(item.id, !item.is_read)}
                disabled={pending}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                {item.is_read ? "Mark unread" : "Mark read"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
