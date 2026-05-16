import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DocumentForm } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

export default async function AdminFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status } = await searchParams;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_forms")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) throw error;
  const forms = (data ?? []) as DocumentForm[];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Form setup</h1>
        <p className="mt-2 text-slate-600">Manage the blank forms teams use.</p>
      </div>

      {status ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {getStatusCopy(status)}
        </div>
      ) : null}

      <div className="grid gap-4">
        {forms.map((form) => (
          <article key={form.code} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Form {form.code}</p>
                <h2 className="text-lg font-bold text-slate-950">{form.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {form.scope === "member" ? "Team member form" : "Team-level form"} | {form.is_active ? "Active" : "Inactive"} | Sort {form.sort_order}
                </p>
              </div>
              <button form={`form-${form.code}`} className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Save form
              </button>
            </div>
            <form id={`form-${form.code}`} action={`/api/admin/templates/${form.code}`} method="post">
              <FormFields form={form} />
            </form>
            <form action={`/api/admin/forms/${form.code}/template`} method="post" encType="multipart/form-data" className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_320px_auto] lg:items-end">
                <div>
                  <h3 className="font-semibold text-slate-950">Blank form file</h3>
                  {form.template_file_path ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Current:{" "}
                      <Link href={`/api/forms/${form.code}/template`} className="font-semibold text-brand-600 hover:text-brand-700">
                        {form.template_file_name ?? `Form ${form.code}`}
                      </Link>
                      {form.template_file_size_bytes ? ` | ${formatBytes(form.template_file_size_bytes)}` : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">No blank form has been uploaded yet.</p>
                  )}
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Replacement file</span>
                  <input
                    name="template"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    className="mt-1 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                </label>
                <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                  Upload new file
                </button>
              </div>
            </form>
          </article>
        ))}
        {forms.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            No forms are ready yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getStatusCopy(status: string) {
  switch (status) {
    case "updated":
      return "Document form updated.";
    case "template-updated":
      return "Blank form file uploaded.";
    case "template-missing":
      return "Choose a replacement file before uploading.";
    case "template-too-large":
      return "Blank form files must be 10 MB or smaller.";
    case "template-type":
      return "Blank form files must be PDF, DOC, or DOCX.";
    default:
      return "Form setup saved.";
  }
}

function FormFields({ form }: { form: DocumentForm }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Code</span>
        <input name="code" readOnly value={form.code} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Sort order</span>
        <input name="sortOrder" type="number" min="0" max="9999" defaultValue={form.sort_order} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input name="name" required defaultValue={form.name} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea name="description" defaultValue={form.description ?? ""} className="focus-ring mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Dropbox template ID</span>
        <input name="dropboxTemplateId" defaultValue={form.dropbox_template_id ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Scope</span>
        <select name="scope" defaultValue={form.scope} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
          <option value="team">Team-level</option>
          <option value="member">Team member</option>
        </select>
      </label>
      <div className="grid gap-2 text-sm text-slate-700 md:col-span-2 md:grid-cols-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="requiresUpload" defaultChecked={form.requires_upload} className="size-4 rounded border-slate-300 text-brand-600" />
          Requires upload
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="requiresSignature" defaultChecked={form.requires_signature} className="size-4 rounded border-slate-300 text-brand-600" />
          Requires signature
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={form.is_active} className="size-4 rounded border-slate-300 text-brand-600" />
          Active
        </label>
      </div>
    </div>
  );
}
