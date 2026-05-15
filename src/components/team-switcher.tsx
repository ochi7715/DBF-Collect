"use client";

import { useRouter } from "next/navigation";
import type { TeamWithContactAccess } from "@/lib/types";

export function TeamSwitcher({
  teams,
  currentTeamId,
  destination = "documents",
}: {
  teams: TeamWithContactAccess[];
  currentTeamId: string;
  destination?: "management" | "documents";
}) {
  const router = useRouter();

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Selected team</span>
      <select
        value={currentTeamId}
        onChange={(event) =>
          router.push(destination === "management" ? `/portal/teams/${event.target.value}` : `/portal/teams/${event.target.value}/documents`)
        }
        className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
