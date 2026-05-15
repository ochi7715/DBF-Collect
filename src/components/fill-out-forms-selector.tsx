"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { TeamWithContactAccess } from "@/lib/types";

export function FillOutFormsSelector({ teams }: { teams: TeamWithContactAccess[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? "");
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  return (
    <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex items-center gap-2 text-brand-600">
          <FileText size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Fill out forms</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Choose a team</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Select the team you want to prepare forms for.
        </p>
        <label className="mt-5 block max-w-xl">
          <span className="text-sm font-medium text-slate-700">Team</span>
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} - {team.race_categories?.name ?? "Race category pending"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Link
        href={selectedTeam ? `/portal/teams/${selectedTeam.id}/documents` : "/portal"}
        className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
      >
        Continue
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}
