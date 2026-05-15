import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { getContactRoleLabel, getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { requireProfile } from "@/lib/auth";
import { getAccessibleTeams } from "@/lib/teams";

export default async function PortalHomePage() {
  const profile = await requireProfile();
  const teams = await getAccessibleTeams(profile.id, profile.role);

  return (
    <section className="space-y-6">
      {teams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <Trophy className="mx-auto text-slate-400" size={40} />
          <h2 className="mt-4 text-lg font-bold text-slate-900">No teams assigned yet</h2>
          <p className="mt-2 text-sm text-slate-600">Create a team to get started, or wait for an admin invitation to an existing one.</p>
          <Link href="/portal/teams/new" className="focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            <Plus size={18} /> Create team
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Team portal</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">My teams</h2>
                <p className="mt-2 max-w-2xl text-slate-600">Your assigned teams and race divisions.</p>
              </div>
              <Link href="/portal/teams/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
                <Plus size={18} /> Create team
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <article key={team.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-950">{team.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{team.race_categories?.name ?? "Race category pending"}</p>
                <p className="mt-1 text-sm text-slate-500">{getRaceCategoryRuleSummary(team.race_categories?.rule_set)}</p>
                {team.contact_role ? <p className="mt-1 text-sm text-slate-500">{getContactRoleLabel(team.contact_role)}</p> : null}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
