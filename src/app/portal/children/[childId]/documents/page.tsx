import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChildSwitcher } from "@/components/child-switcher";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { UploadDocumentForm } from "@/components/upload-document-form";
import { isStaffRole, requireProfile } from "@/lib/auth";
import { canCurrentUserAccessChild, getAccessibleChildren, getChildById } from "@/lib/children";
import { getChildDocuments } from "@/lib/documents";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function ChildDocumentsPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const profile = await requireProfile();
  const allowed = await canCurrentUserAccessChild(childId);
  if (!allowed) redirect("/portal");

  const [child, childrenList, documents] = await Promise.all([
    getChildById(childId).catch(() => null),
    getAccessibleChildren(profile.id, profile.role),
    getChildDocuments(childId),
  ]);

  if (!child) notFound();

  const childAccess = childrenList.find((item) => item.id === childId);
  const canUploadDocuments = isStaffRole(profile.role) || childAccess?.can_upload_documents !== false;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_280px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Intake documents</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {child.first_name} {child.last_name}
          </h1>
          <p className="mt-2 text-slate-600">Upload required intake documents and track documents sent for signature.</p>
        </div>
        {childrenList.length > 1 ? <ChildSwitcher childrenList={childrenList} currentChildId={childId} /> : null}
      </div>

      <div className="space-y-4">
        {documents.map((doc) => {
          const template = doc.intake_document_templates;
          if (!template) return null;
          return (
            <article key={doc.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-950">{template.name}</h2>
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                  {template.description ? <p className="mt-2 text-sm text-slate-600">{template.description}</p> : null}
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold text-slate-800">Upload:</span> {template.requires_upload ? "Required" : "Not required"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Signature:</span> {template.requires_signature ? "Required" : "Not required"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Updated:</span> {formatDate(doc.updated_at)}
                    </p>
                  </div>
                  {doc.file_name ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="font-semibold">Current file</p>
                      <p>
                        {doc.file_name} | {formatBytes(doc.file_size_bytes)}
                      </p>
                      <Link href={`/api/documents/${doc.id}/signed-url?version=uploaded`} className="mt-2 inline-block font-semibold text-brand-600 hover:text-brand-700">
                        Open uploaded file
                      </Link>
                    </div>
                  ) : null}
                  {doc.signed_file_path ? (
                    <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
                      <p className="font-semibold">Signed document</p>
                      <p>The completed signed PDF is stored in the portal.</p>
                      <Link href={`/api/documents/${doc.id}/signed-url?version=signed`} className="mt-2 inline-block font-semibold text-emerald-700 hover:text-emerald-900">
                        Open signed file
                      </Link>
                    </div>
                  ) : null}
                  {doc.review_notes ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Staff note: {doc.review_notes}</p> : null}
                </div>

                {template.requires_upload && canUploadDocuments ? (
                  <div className="w-full rounded-2xl border border-slate-200 p-4 lg:w-80">
                    <UploadDocumentForm documentId={doc.id} />
                  </div>
                ) : template.requires_upload ? (
                  <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 lg:w-80">
                    You can view this checklist item, but uploads are disabled for your caregiver access.
                  </div>
                ) : (
                  <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 lg:w-80">
                    No upload needed. Staff will send this through Dropbox Sign when ready.
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
