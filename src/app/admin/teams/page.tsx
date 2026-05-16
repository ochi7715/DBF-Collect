import Link from "next/link";
import { Plus } from "lucide-react";
import { getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils";
import type { RaceCategory } from "@/lib/types";

export default async function AdminTeamsPage({ searchParams }: { searchParams: Promise<{ q?: string; categoryId?: string }> }) {
  await requireStaff();
  const { q, categoryId } = await searchParams;
  const search = normalizeSearch(q ?? "");
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: countRows }] = await Promise.all([
    supabase.from("race_categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("teams").select("race_category_id"),
  ]);
  let query = supabase
    .from("teams")
    .select("*, race_categories(*)")
    .order("name", { ascending: true })
    .limit(150);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (categoryId) {
    query = query.eq("race_category_id", categoryId);
  }

  const { data: teams, error } = await query;
  if (error) throw error;
  const categoryRows = (categories ?? []) as RaceCategory[];
  const categoryCounts = new Map<string, number>();
  for (const row of countRows ?? []) {
    categoryCounts.set(row.race_category_id, (categoryCounts.get(row.race_category_id) ?? 0) + 1);
  }
  const totalTeams = (countRows ?? []).length;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Teams</h1>
            <p className="mt-2 text-slate-600">Create teams, choose categories, and manage team roles.</p>
          </div>
          <Link href="/admin/teams/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            <Plus size={18} /> New team
          </Link>
        </div>
        <form className="mt-4 grid gap-2 md:max-w-3xl md:grid-cols-[minmax(0,1fr)_240px_auto]">
          <input name="q" defaultValue={search} placeholder="Search by team name" className="focus-ring rounded-xl border border-slate-300 px-3 py-2" />
          <select name="categoryId" defaultValue={categoryId ?? ""} className="focus-ring rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="">All categories</option>
            {categoryRows.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href={search ? `/admin/teams?q=${encodeURIComponent(search)}` : "/admin/teams"}
          className={`rounded-3xl border p-5 shadow-sm ${categoryId ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}
        >
          <p className="text-sm font-semibold text-slate-600">All teams</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totalTeams}</p>
        </Link>
        {categoryRows.map((category) => (
          <Link
            key={category.id}
            href={`/admin/teams?${new URLSearchParams({
              ...(search ? { q: search } : {}),
              categoryId: category.id,
            }).toString()}`}
            className={`rounded-3xl border p-5 shadow-sm ${
              categoryId === category.id ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-sm font-semibold text-slate-600">{category.name}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{categoryCounts.get(category.id) ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
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
      </div>
    </section>
  );
}
