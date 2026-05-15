"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { GeneratedFormCode } from "@/lib/form-generation";

type GenerationItem = {
  formCode: GeneratedFormCode;
  label: string;
  description: string;
  ready: boolean;
  issues: string[];
};

export function AdminFormGenerationPanel({
  teamId,
  items,
}: {
  teamId: string;
  items: GenerationItem[];
}) {
  const [statuses, setStatuses] = useState<Record<string, string | null>>({});
  const [busyFormCode, setBusyFormCode] = useState<GeneratedFormCode | null>(null);

  async function generatePdf(formCode: GeneratedFormCode) {
    setBusyFormCode(formCode);
    setStatuses((current) => ({ ...current, [formCode]: null }));
    try {
      const response = await fetch(`/api/teams/${teamId}/forms/${formCode}/generate`, { method: "POST" });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        setStatuses((current) => ({ ...current, [formCode]: message }));
        return;
      }
      await downloadPdfResponse(response, `Form-${formCode}.pdf`);
      setStatuses((current) => ({ ...current, [formCode]: `Form ${formCode} generated.` }));
    } finally {
      setBusyFormCode(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-950">PDF generation</h2>
        <p className="mt-1 text-sm text-slate-600">Generate official PDFs from saved team details, member profiles, and roster layouts.</p>
      </div>
      <div className="divide-y divide-slate-200">
        {items.map((item) => (
          <div key={item.formCode} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{item.label}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">Form {item.formCode}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              {item.issues.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-amber-800">
                  {item.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              {statuses[item.formCode] ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{statuses[item.formCode]}</p> : null}
            </div>
            <button
              type="button"
              disabled={!item.ready || busyFormCode === item.formCode}
              onClick={() => generatePdf(item.formCode)}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download size={18} />
              {busyFormCode === item.formCode ? "Generating..." : `Generate Form ${item.formCode}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return "Unable to complete the request.";
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Unable to complete the request.";
}

async function downloadPdfResponse(response: Response, fallbackFileName: string) {
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = getFileNameFromDisposition(response.headers.get("content-disposition")) ?? fallbackFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function getFileNameFromDisposition(value: string | null) {
  if (!value) return null;
  const match = value.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}
