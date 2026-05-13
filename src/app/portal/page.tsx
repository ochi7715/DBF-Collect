import Link from "next/link";
import { Baby, FileText } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getAccessibleChildren } from "@/lib/children";
import { formatDate } from "@/lib/utils";

export default async function PortalHomePage() {
  const profile = await requireProfile();
  const children = await getAccessibleChildren(profile.id, profile.role);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Parent portal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">My children</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Select a child to view intake document requirements, upload files, and track signature-related documents.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <Baby className="mx-auto text-slate-400" size={40} />
          <h2 className="mt-4 text-lg font-bold text-slate-900">No child records yet</h2>
          <p className="mt-2 text-sm text-slate-600">A staff member needs to authorize your account for a child record.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/portal/children/${child.id}/documents`}
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    {child.first_name} {child.last_name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">DOB: {formatDate(child.date_of_birth)}</p>
                  {child.relationship ? <p className="mt-1 text-sm text-slate-500">Relationship: {child.relationship}</p> : null}
                </div>
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <FileText size={22} />
                </div>
              </div>
              <p className="mt-6 text-sm font-semibold text-brand-600 group-hover:text-brand-700">View intake documents →</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
