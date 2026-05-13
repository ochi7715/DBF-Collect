import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminChildrenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("children").select("*").order("last_name", { ascending: true }).limit(100);

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,external_patient_id.ilike.%${q}%`);
  }

  const { data: children, error } = await query;
  if (error) throw error;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Child records</h1>
          </div>
          <Link href="/admin/children/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            <Plus size={18} /> New child
          </Link>
        </div>
        <form className="mt-4 flex max-w-xl gap-2">
          <input name="q" defaultValue={q ?? ""} placeholder="Search by name or patient ID" className="focus-ring flex-1 rounded-xl border border-slate-300 px-3 py-2" />
          <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Patient ID</th>
              <th className="px-4 py-3">DOB</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(children ?? []).map((child) => (
              <tr key={child.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{child.first_name} {child.last_name}</td>
                <td className="px-4 py-3 text-slate-600">{child.external_patient_id ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(child.date_of_birth)}</td>
                <td className="px-4 py-3 text-slate-600">{child.status}</td>
                <td className="px-4 py-3"><Link href={`/admin/children/${child.id}`} className="font-semibold text-brand-600 hover:text-brand-700">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
