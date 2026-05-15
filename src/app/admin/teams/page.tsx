import Link from "next/link";
import { Plus } from "lucide-react";
import { getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils";

export default async function AdminTeamsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const search = normalizeSearch(q ?? "");
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("teams")
    .select("*, race_categories(*)")
    .order("name", { ascending: true })
    .limit(150);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: teams, error } = await query;
  if (error) throw error;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Teams</h1>
            <p className="mt-2 text-slate-600">Create teams, assign race categories, and track access roles.</p>
          </div>
          <Link href="/admin/teams/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            <Plus size={18} /> New team
          </Link>
        </div>
        <form className="mt-4 flex max-w-xl gap-2">
          <input name="q" defaultValue={search} placeholder="Search by team name" className="focus-ring flex-1 rounded-xl border border-slate-300 px-3 py-2" />
          <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Race category</th>
              <th className="px-4 py-3">Required forms</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(teams ?? []).map((team) => (
              <tr key={team.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{team.name}</td>
                <td className="px-4 py-3 text-slate-600">{team.race_categories?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{getRaceCategoryRuleSummary(team.race_categories?.rule_set)}</td>
                <td className="px-4 py-3 text-slate-600">{team.status}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/teams/${team.id}`} className="font-semibold text-brand-600 hover:text-brand-700">Open</Link>
                </td>
              </tr>
            ))}
            {(teams ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No teams found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
