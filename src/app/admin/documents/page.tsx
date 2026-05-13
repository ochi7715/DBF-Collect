import Link from "next/link";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { requireStaff } from "@/lib/auth";
import { getStaffDocumentInbox } from "@/lib/documents";
import { formatDate } from "@/lib/utils";

export default async function AdminDocumentsPage() {
  await requireStaff();
  const docs = await getStaffDocumentInbox();

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Document inbox</h1>
        <p className="mt-2 text-slate-600">Review uploaded intake documents and track Dropbox Sign documents.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Child</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <tr key={doc.id} className="align-top">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {doc.children.first_name} {doc.children.last_name}
                </td>
                <td className="px-4 py-3 text-slate-700">{doc.intake_document_templates.name}</td>
                <td className="px-4 py-3"><DocumentStatusBadge status={doc.status} /></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(doc.updated_at)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/documents/${doc.id}`} className="font-semibold text-brand-600 hover:text-brand-700">Review</Link>
                </td>
              </tr>
            ))}
            {docs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No submitted documents yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
