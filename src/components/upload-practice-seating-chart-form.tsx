"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PracticeAssignmentKind } from "@/lib/types";

export function UploadPracticeSeatingChartForm({
  teamId,
  weekStart,
  assignmentKind,
  compact = false,
}: {
  teamId: string;
  weekStart: string;
  assignmentKind: PracticeAssignmentKind;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("weekStart", weekStart);
    formData.set("assignmentKind", assignmentKind);

    const response = await fetch(`/api/teams/${teamId}/practice-seating-charts/upload`, {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "Upload failed");
      return;
    }

    form.reset();
    setMessage("Uploaded.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-2" : "space-y-3"}>
      <input
        type="file"
        name="file"
        required
        accept=".pdf,.png,.jpg,.jpeg"
        className="block w-full text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
      />
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="focus-ring rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Upload chart"}
      </button>
    </form>
  );
}
