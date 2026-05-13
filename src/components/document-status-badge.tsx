import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<DocumentStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 ring-slate-200",
  uploaded: "bg-blue-50 text-blue-700 ring-blue-200",
  in_review: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  sent_for_signature: "bg-purple-50 text-purple-700 ring-purple-200",
  signed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const labels: Record<DocumentStatus, string> = {
  not_started: "Not started",
  uploaded: "Uploaded",
  in_review: "In review",
  accepted: "Accepted",
  rejected: "Needs correction",
  sent_for_signature: "Sent for signature",
  signed: "Signed",
  completed: "Completed",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", styles[status])}>
      {labels[status]}
    </span>
  );
}
