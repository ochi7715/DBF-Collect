import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { UploadPracticeSeatingChartForm } from "@/components/upload-practice-seating-chart-form";
import { requireProfile, isStaffRole } from "@/lib/auth";
import {
  formatPracticeSessionLabel,
  formatPracticeWeekLabel,
  getPracticeAssignmentKindLabel,
  getPracticeAssignmentsForTeams,
  getPracticeAttendanceForTeams,
  getPracticeSeatingChartsForTeams,
  getUpcomingPracticeWeeks,
  isMissingPracticeSchemaError,
  toDateOnly,
} from "@/lib/practice";
import { getAccessibleTeams } from "@/lib/teams";
import type {
  PracticeAssignmentKind,
  TeamPracticeAssignment,
  TeamPracticeAttendance,
  TeamPracticeSeatingChart,
} from "@/lib/types";

export default async function PracticeSchedulePage() {
  const profile = await requireProfile();
  const teams = await getAccessibleTeams(profile.id, profile.role);
  const teamIds = teams.map((team) => team.id);
  const weeks = getUpcomingPracticeWeeks();
  const weekStarts = weeks.map(toDateOnly);
  let assignments: TeamPracticeAssignment[] = [];
  let attendance: TeamPracticeAttendance[] = [];
  let charts: TeamPracticeSeatingChart[] = [];

  try {
    [assignments, attendance, charts] = await Promise.all([
      getPracticeAssignmentsForTeams(teamIds),
      getPracticeAttendanceForTeams(teamIds, weekStarts),
      getPracticeSeatingChartsForTeams(teamIds, weekStarts),
    ]);
  } catch (error) {
    if (isMissingPracticeSchemaError(error)) {
      return <PracticeSetupNotice />;
    }
    throw error;
  }

  const assignmentsByTeam = new Map<string, TeamPracticeAssignment[]>();
  for (const assignment of assignments) {
    const rows = assignmentsByTeam.get(assignment.team_id) ?? [];
    rows.push(assignment);
    assignmentsByTeam.set(assignment.team_id, rows);
  }
  const attendanceByTeamKindWeek = new Map(
    attendance.map((row) => [`${row.team_id}:${row.assignment_kind}:${row.practice_week_start}`, row])
  );
  const chartByTeamKindWeek = new Map(
    charts.map((row) => [`${row.team_id}:${row.assignment_kind}:${row.practice_week_start}`, row])
  );

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-brand-600">
          <CalendarDays size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Practice schedule</p>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Weekly practice</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Review your weekend practice sessions, confirm attendance, and preupload seating charts before each session.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
          No teams assigned yet.
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const teamAssignments = [...(assignmentsByTeam.get(team.id) ?? [])].sort(
              (a, b) => assignmentKindOrder(a.assignment_kind) - assignmentKindOrder(b.assignment_kind)
            );
            const canRespond = isStaffRole(profile.role) || team.can_upload_documents !== false;
            const canUploadCharts = isStaffRole(profile.role) || team.contact_role === "captain";
            return (
              <article key={team.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">{team.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{team.race_categories?.name ?? "Race category pending"}</p>
                  </div>
                  {teamAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teamAssignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
                          {getPracticeAssignmentKindLabel(assignment.assignment_kind)}: {formatPracticeSessionLabel(assignment.practice_day, assignment.slot_start_time)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">No practice slot assigned</div>
                  )}
                </div>

                {teamAssignments.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {teamAssignments.map((assignment) => (
                      <PracticeSessionPanel
                        key={assignment.id}
                        assignment={assignment}
                        attendanceByTeamKindWeek={attendanceByTeamKindWeek}
                        chartByTeamKindWeek={chartByTeamKindWeek}
                        canRespond={canRespond}
                        canUploadCharts={canUploadCharts}
                        teamId={team.id}
                        weeks={weeks}
                      />
                    ))}
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

function assignmentKindOrder(kind: PracticeAssignmentKind) {
  return kind === "primary" ? 0 : 1;
}

function PracticeSessionPanel({
  assignment,
  attendanceByTeamKindWeek,
  chartByTeamKindWeek,
  canRespond,
  canUploadCharts,
  teamId,
  weeks,
}: {
  assignment: TeamPracticeAssignment;
  attendanceByTeamKindWeek: Map<string, TeamPracticeAttendance>;
  chartByTeamKindWeek: Map<string, TeamPracticeSeatingChart>;
  canRespond: boolean;
  canUploadCharts: boolean;
  teamId: string;
  weeks: Date[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold text-slate-900">
          {getPracticeAssignmentKindLabel(assignment.assignment_kind)} | {formatPracticeSessionLabel(assignment.practice_day, assignment.slot_start_time)}
        </p>
      </div>

      <div className="divide-y divide-slate-200 md:hidden">
        {weeks.map((week) => {
          const weekStart = toDateOnly(week);
          const key = `${teamId}:${assignment.assignment_kind}:${weekStart}`;
          const response = attendanceByTeamKindWeek.get(key);
          const chart = chartByTeamKindWeek.get(key);
          return (
            <article key={weekStart} className="space-y-4 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Week of</p>
                <p className="mt-1 font-semibold text-slate-950">{formatPracticeWeekLabel(week)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Response</p>
                <div className="mt-2">
                  <ResponseBadge response={response} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seating chart</p>
                <div className="mt-2">
                  <PracticeChartCell
                    chart={chart}
                    canUploadCharts={canUploadCharts}
                    teamId={teamId}
                    weekStart={weekStart}
                    assignmentKind={assignment.assignment_kind}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Action</p>
                <div className="mt-2">
                  <PracticeAttendanceActions
                    canRespond={canRespond}
                    teamId={teamId}
                    weekStart={weekStart}
                    assignmentKind={assignment.assignment_kind}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Week of</th>
              <th className="px-4 py-3">Response</th>
              <th className="px-4 py-3">Seating chart</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {weeks.map((week) => {
              const weekStart = toDateOnly(week);
              const key = `${teamId}:${assignment.assignment_kind}:${weekStart}`;
              const response = attendanceByTeamKindWeek.get(key);
              const chart = chartByTeamKindWeek.get(key);
              return (
                <tr key={weekStart}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatPracticeWeekLabel(week)}</td>
                  <td className="px-4 py-3">
                    <ResponseBadge response={response} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PracticeChartCell
                      chart={chart}
                      canUploadCharts={canUploadCharts}
                      teamId={teamId}
                      weekStart={weekStart}
                      assignmentKind={assignment.assignment_kind}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <PracticeAttendanceActions
                      canRespond={canRespond}
                      teamId={teamId}
                      weekStart={weekStart}
                      assignmentKind={assignment.assignment_kind}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PracticeChartCell({
  assignmentKind,
  canUploadCharts,
  chart,
  teamId,
  weekStart,
}: {
  assignmentKind: PracticeAssignmentKind;
  canUploadCharts: boolean;
  chart: TeamPracticeSeatingChart | undefined;
  teamId: string;
  weekStart: string;
}) {
  if (chart) {
    return (
      <div className="space-y-2">
        <Link href={`/api/practice-seating-charts/${chart.id}/signed-url`} className="break-all font-semibold text-brand-600 hover:text-brand-700">
          {chart.file_name}
        </Link>
        {canUploadCharts ? (
          <UploadPracticeSeatingChartForm
            teamId={teamId}
            weekStart={weekStart}
            assignmentKind={assignmentKind}
            compact
          />
        ) : null}
      </div>
    );
  }

  if (canUploadCharts) {
    return (
      <UploadPracticeSeatingChartForm
        teamId={teamId}
        weekStart={weekStart}
        assignmentKind={assignmentKind}
        compact
      />
    );
  }

  return <span className="text-slate-500">Not uploaded</span>;
}

function PracticeAttendanceActions({
  assignmentKind,
  canRespond,
  teamId,
  weekStart,
}: {
  assignmentKind: PracticeAssignmentKind;
  canRespond: boolean;
  teamId: string;
  weekStart: string;
}) {
  if (!canRespond) return <p className="text-slate-500 md:text-right">View only</p>;

  return (
    <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
      <AttendanceButton teamId={teamId} weekStart={weekStart} assignmentKind={assignmentKind} response="confirmed" label="Confirm attendance" />
      <AttendanceButton teamId={teamId} weekStart={weekStart} assignmentKind={assignmentKind} response="no_attendance" label="No attendance" />
    </div>
  );
}

function ResponseBadge({ response }: { response: TeamPracticeAttendance | undefined }) {
  if (!response) return <span className="text-slate-500">No response yet</span>;

  return (
    <span className={response.response === "confirmed" ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
      {response.response === "confirmed" ? "Confirmed" : "No attendance"}
    </span>
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
  assignmentKind,
  response,
  label,
}: {
  teamId: string;
  weekStart: string;
  assignmentKind: PracticeAssignmentKind;
  response: "confirmed" | "no_attendance";
  label: string;
}) {
  return (
    <form action={`/api/teams/${teamId}/practice-attendance`} method="post">
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="assignmentKind" value={assignmentKind} />
      <input type="hidden" name="response" value={response} />
      <button className={response === "confirmed" ? "focus-ring w-full rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700" : "focus-ring w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"}>
        {label}
      </button>
    </form>
  );
}
