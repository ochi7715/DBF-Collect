import Link from "next/link";
import { getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RaceCategory } from "@/lib/types";

export default async function NewTeamPage() {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { data: categories, error } = await supabase
    .from("race_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/admin/teams" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to teams
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-brand-600">Team setup</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Create team</h1>
        <p className="mt-2 text-slate-600">Team-level forms are selected from the race category rules.</p>
      </div>

      <form action="/api/admin/teams" method="post" className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Team name</span>
          <input name="name" required maxLength={160} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Race category</span>
          <select name="raceCategoryId" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            {((categories ?? []) as RaceCategory[]).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} - {getRaceCategoryRuleSummary(category.rule_set)}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select name="status" defaultValue="registration" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="registration">Registration</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">Create team</button>
        </div>
      </form>
    </section>
  );
}
