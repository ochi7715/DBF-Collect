import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function ReviewDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { data: doc, error } = await supabase
    .from("dragon_boat_documents")
    .select("*, teams(*, race_categories(*)), team_members(*), document_forms(*)")
    .eq("id", documentId)
    .single();

  if (error || !doc) notFound();

  const team = doc.teams;
  const member = doc.team_members;
  const form = doc.document_forms;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/admin/documents" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Back to inbox</Link>
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Review document</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">{form.name}</h1>
            <p className="mt-2 text-slate-600">
              {team.name}
              {member ? ` | ${member.full_name}` : ""} | Updated {formatDate(doc.updated_at)}
            </p>
          </div>
          <DocumentStatusBadge status={doc.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Submitted file</h2>
          {form.template_file_path ? (
            <Link href={`/api/forms/${form.code}/template`} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
              Download blank Form {form.code}
            </Link>
          ) : null}
          {doc.file_path ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{doc.file_name}</p>
              <p className="mt-1 text-sm text-slate-500">{doc.mime_type ?? "Unknown type"} | {formatBytes(doc.file_size_bytes)}</p>
              <Link href={`/api/documents/${doc.id}/signed-url?version=uploaded`} className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Open uploaded file
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No file uploaded for this form.</p>
          )}

          {doc.signed_file_path ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-900">Signed document stored</p>
              <p className="mt-1 text-sm text-emerald-700">The completed PDF has been stored privately.</p>
              <Link href={`/api/documents/${doc.id}/signed-url?version=signed`} className="mt-4 inline-block rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                Open signed file
              </Link>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <form action={`/api/documents/${doc.id}/review`} method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Review decision</h2>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select name="status" defaultValue={doc.status} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="in_review">In review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Needs correction</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">Notes</span>
              <textarea name="reviewNotes" defaultValue={doc.review_notes ?? ""} className="focus-ring mt-1 min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <button className="focus-ring mt-4 w-full rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Save review</button>
          </form>

          {form.requires_signature ? (
            <form action="/api/dropbox-sign/send" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Dropbox Sign</h2>
              <input type="hidden" name="documentId" value={doc.id} />
              <p className="mt-2 text-sm text-slate-600">Send the configured Dropbox Sign template to the team captain.</p>
              <button className="focus-ring mt-4 w-full rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">Send signature request</button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
