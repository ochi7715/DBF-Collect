import { Trophy } from "lucide-react";
import Link from "next/link";
import { FillOutFormsSelector } from "@/components/fill-out-forms-selector";
import { requireProfile } from "@/lib/auth";
import { getAccessibleTeams } from "@/lib/teams";

export default async function FillFormsPage() {
  const profile = await requireProfile();
  const teams = await getAccessibleTeams(profile.id, profile.role);

  return (
    <section className="space-y-6">
      {teams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <Trophy className="mx-auto text-slate-400" size={40} />
          <h1 className="mt-4 text-lg font-bold text-slate-900">No teams assigned yet</h1>
          <p className="mt-2 text-sm text-slate-600">Create a team first, or wait for an admin invitation to an existing one.</p>
          <Link href="/portal/teams/new" className="focus-ring mt-5 inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            Create team
          </Link>
        </div>
      ) : (
        <FillOutFormsSelector teams={teams} />
      )}
    </section>
  );
}
