import { requireStaff } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { IntakeTemplate } from "@/lib/types";

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status } = await searchParams;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("intake_document_templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  const templates = (data ?? []) as IntakeTemplate[];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Checklist setup</h1>
        <p className="mt-2 text-slate-600">Manage intake checklist items, upload requirements, and Dropbox Sign template IDs.</p>
      </div>

      {status ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {status === "created" ? "Checklist item created and synced to existing child records." : "Checklist item updated."}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form action="/api/admin/templates" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">New checklist item</h2>
          <TemplateFields submitLabel="Create item" />
        </form>

        <div className="grid gap-4">
          {templates.map((template) => (
            <form key={template.id} action={`/api/admin/templates/${template.id}`} method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{template.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {template.is_active ? "Active" : "Inactive"} | Sort {template.sort_order}
                  </p>
                </div>
                <button className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Save item
                </button>
              </div>
              <TemplateFields template={template} submitLabel="Save item" hideSubmit />
            </form>
          ))}
          {templates.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              No checklist templates yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TemplateFields({
  template,
  submitLabel,
  hideSubmit = false,
}: {
  template?: IntakeTemplate;
  submitLabel: string;
  hideSubmit?: boolean;
}) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input name="name" required defaultValue={template?.name ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea name="description" defaultValue={template?.description ?? ""} className="focus-ring mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Sort order</span>
        <input name="sortOrder" type="number" min="0" max="9999" defaultValue={template?.sort_order ?? 10} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Dropbox template ID</span>
        <input name="dropboxTemplateId" defaultValue={template?.dropbox_template_id ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <div className="grid gap-2 text-sm text-slate-700 md:col-span-2 md:grid-cols-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="requiresUpload" defaultChecked={template?.requires_upload ?? true} className="size-4 rounded border-slate-300 text-brand-600" />
          Requires upload
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="requiresSignature" defaultChecked={template?.requires_signature ?? false} className="size-4 rounded border-slate-300 text-brand-600" />
          Requires signature
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={template?.is_active ?? true} className="size-4 rounded border-slate-300 text-brand-600" />
          Active
        </label>
      </div>
      {!hideSubmit ? (
        <div className="md:col-span-2">
          <button className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            {submitLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
