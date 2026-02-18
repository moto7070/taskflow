"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ApiErrorResponse, WikiUpsertResponse } from "@/lib/types/api";

interface WikiEditorFormProps {
  projectId: string;
  mode: "create" | "edit";
  pageId?: string;
  initialTitle?: string;
  initialBody?: string;
}

export function WikiEditorForm({
  projectId,
  mode,
  pageId,
  initialTitle = "",
  initialBody = "",
}: WikiEditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const endpoint =
        mode === "create"
          ? `/api/projects/${projectId}/wiki`
          : `/api/projects/${projectId}/wiki/${pageId}`;

      const res = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const json = (await res.json()) as WikiUpsertResponse | ApiErrorResponse;
      if (!res.ok || !("page" in json)) {
        window.alert(("error" in json ? json.error : undefined) ?? "Failed to save wiki page.");
        return;
      }
      router.push(`/app/project/${projectId}/wiki/${json.page.id}`);
      router.refresh();
    });
  };

  const remove = () => {
    if (!pageId) return;
    const ok = window.confirm("Delete this page?");
    if (!ok) return;
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/wiki/${pageId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiErrorResponse;
      if (!res.ok) {
        window.alert(json.error ?? "Failed to delete wiki page.");
        return;
      }
      router.push(`/app/project/${projectId}/wiki`);
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Page content"
          className="h-80 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {mode === "create" ? "Create page" : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-md border border-rose-300 px-4 py-2 text-sm text-rose-700"
          >
            Delete page
          </button>
        ) : null}
      </div>
    </section>
  );
}
