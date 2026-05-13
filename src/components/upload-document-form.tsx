"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadDocumentForm({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("documentId", documentId);

    const response = await fetch("/api/documents/upload", {
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
    setMessage("Uploaded successfully.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="file"
        name="file"
        required
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
      />
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="focus-ring rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Upload document"}
      </button>
    </form>
  );
}
