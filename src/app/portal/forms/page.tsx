import { Trophy } from "lucide-react";
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
          <p className="mt-2 text-sm text-slate-600">An admin needs to add you as a captain, manager, or co-captain.</p>
        </div>
      ) : (
        <FillOutFormsSelector teams={teams} />
      )}
    </section>
  );
}
