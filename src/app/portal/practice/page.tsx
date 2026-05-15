import { CalendarDays } from "lucide-react";
import { requireProfile, isStaffRole } from "@/lib/auth";
import {
  formatPracticeSlotLabel,
  formatPracticeWeekLabel,
  getPracticeAssignmentsForTeams,
  getPracticeAttendanceForTeams,
  getUpcomingPracticeWeeks,
  isMissingPracticeSchemaError,
  toDateOnly,
} from "@/lib/practice";
import { getAccessibleTeams } from "@/lib/teams";

export default async function PracticeSchedulePage() {
  const profile = await requireProfile();
  const teams = await getAccessibleTeams(profile.id, profile.role);
  const teamIds = teams.map((team) => team.id);
  const weeks = getUpcomingPracticeWeeks();
  const weekStarts = weeks.map(toDateOnly);
  let assignments = [];
  let attendance = [];

  try {
    [assignments, attendance] = await Promise.all([
      getPracticeAssignmentsForTeams(teamIds),
      getPracticeAttendanceForTeams(teamIds, weekStarts),
    ]);
  } catch (error) {
    if (isMissingPracticeSchemaError(error)) {
      return <PracticeSetupNotice />;
    }
    throw error;
  }

  const assignmentByTeam = new Map(assignments.map((assignment) => [assignment.team_id, assignment]));
  const attendanceByTeamWeek = new Map(
    attendance.map((row) => [`${row.team_id}:${row.practice_week_start}`, row])
  );

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-brand-600">
          <CalendarDays size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Practice schedule</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Weekly practice</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Review your recurring practice slot and respond for each upcoming week.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
          No teams assigned yet.
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const assignment = assignmentByTeam.get(team.id);
            const canRespond = isStaffRole(profile.role) || team.can_upload_documents !== false;
            return (
              <article key={team.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">{team.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{team.race_categories?.name ?? "Race category pending"}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
                    {assignment ? formatPracticeSlotLabel(assignment.slot_start_time) : "No practice slot assigned"}
                  </div>
                </div>

                {assignment ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Week of</th>
                          <th className="px-4 py-3">Response</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {weeks.map((week) => {
                          const weekStart = toDateOnly(week);
                          const response = attendanceByTeamWeek.get(`${team.id}:${weekStart}`);
                          return (
                            <tr key={weekStart}>
                              <td className="px-4 py-3 font-semibold text-slate-900">{formatPracticeWeekLabel(week)}</td>
                              <td className="px-4 py-3">
                                {response ? (
                                  <span className={response.response === "confirmed" ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
                                    {response.response === "confirmed" ? "Confirmed" : "No attendance"}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">No response yet</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {canRespond ? (
                                  <div className="flex justify-end gap-2">
                                    <AttendanceButton teamId={team.id} weekStart={weekStart} response="confirmed" label="Confirm attendance" />
                                    <AttendanceButton teamId={team.id} weekStart={weekStart} response="no_attendance" label="No attendance" />
                                  </div>
                                ) : (
                                  <p className="text-right text-slate-500">View only</p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">This team does not currently have a weekly practice slot.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PracticeSetupNotice() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <CalendarDays size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Practice schedule</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-amber-950">Practice scheduling is not ready yet</h1>
        <p className="mt-2 max-w-2xl text-amber-900">
          The practice tables have not been added to the database yet. An admin needs to apply the latest Supabase schema before weekly practice scheduling can be used.
        </p>
      </div>
    </section>
  );
}

function AttendanceButton({
  teamId,
  weekStart,
  response,
  label,
}: {
  teamId: string;
  weekStart: string;
  response: "confirmed" | "no_attendance";
  label: string;
}) {
  return (
    <form action={`/api/teams/${teamId}/practice-attendance`} method="post">
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="response" value={response} />
      <button className={response === "confirmed" ? "focus-ring rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700" : "focus-ring rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"}>
        {label}
      </button>
    </form>
  );
}
