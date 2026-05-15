import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import {
  PRACTICE_SLOT_OPTIONS,
  formatPracticeSlotLabel,
  formatPracticeWeekLabel,
  getPracticeAssignmentKindLabel,
  getPracticeSlotInputName,
  getPracticeWeekStart,
  isMissingPracticeSchemaError,
  normalizePracticeSlot,
  toDateOnly,
} from "@/lib/practice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PracticeSlotCapacity,
  TeamPracticeAssignment,
  TeamPracticeAttendance,
  TeamPracticeSeatingChart,
} from "@/lib/types";

export default async function AdminPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status } = await searchParams;
  const admin = createSupabaseAdminClient();
  const currentWeekStart = toDateOnly(getPracticeWeekStart());

  const [capacitiesResult, teamsResult, assignmentsResult, attendanceResult, chartsResult] = await Promise.all([
    admin.from("practice_slot_capacities").select("*").order("slot_start_time", { ascending: true }),
    admin.from("teams").select("*, race_categories(*)").order("name", { ascending: true }),
    admin.from("team_practice_assignments").select("*"),
    admin.from("team_practice_attendance").select("*").eq("practice_week_start", currentWeekStart),
    admin.from("team_practice_seating_charts").select("*").eq("practice_week_start", currentWeekStart),
  ]);

  const practiceError = capacitiesResult.error ?? assignmentsResult.error ?? attendanceResult.error ?? chartsResult.error;
  if (practiceError) {
    if (isMissingPracticeSchemaError(practiceError)) {
      return <PracticeSetupNotice />;
    }
    throw practiceError;
  }
  if (teamsResult.error) throw teamsResult.error;

  const capacityRows = (capacitiesResult.data ?? []) as PracticeSlotCapacity[];
  const assignmentRows = (assignmentsResult.data ?? []) as TeamPracticeAssignment[];
  const attendanceRows = (attendanceResult.data ?? []) as TeamPracticeAttendance[];
  const chartRows = (chartsResult.data ?? []) as TeamPracticeSeatingChart[];
  const capacityBySlot = new Map(capacityRows.map((row) => [normalizePracticeSlot(row.slot_start_time), row]));
  const assignmentByTeamKind = new Map(assignmentRows.map((row) => [`${row.team_id}:${row.assignment_kind}`, row]));
  const attendanceByTeamKind = new Map(attendanceRows.map((row) => [`${row.team_id}:${row.assignment_kind}`, row]));
  const chartByTeamKind = new Map(chartRows.map((row) => [`${row.team_id}:${row.assignment_kind}`, row]));
  const assignedCountBySlot = new Map<string, number>();
  for (const assignment of assignmentRows) {
    const slot = normalizePracticeSlot(assignment.slot_start_time);
    if (!slot) continue;
    assignedCountBySlot.set(slot, (assignedCountBySlot.get(slot) ?? 0) + 1);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-brand-600">
          <CalendarDays size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Back office</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Practice schedule</h1>
        <p className="mt-2 text-slate-600">
          Set interval capacity, assign up to two recurring one-hour slots per team, and review this week&apos;s attendance responses.
        </p>
      </div>

      {status ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {getStatusCopy(status)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form action="/api/admin/practice/capacities" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Slot capacity</h2>
          <p className="mt-1 text-sm text-slate-600">Available teams per 15-minute start interval.</p>
          <div className="mt-4 space-y-3">
            {PRACTICE_SLOT_OPTIONS.map((slot) => {
              const row = capacityBySlot.get(slot);
              return (
                <label key={slot} className="grid grid-cols-[1fr_88px] items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">{formatPracticeSlotLabel(slot)}</span>
                  <input
                    name={getPracticeSlotInputName(slot)}
                    type="number"
                    min={0}
                    max={999}
                    defaultValue={row?.capacity ?? 0}
                    className="focus-ring rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              );
            })}
          </div>
          <button className="focus-ring mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            Save capacity
          </button>
        </form>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">Assignments</h2>
              <p className="mt-1 text-sm text-slate-600">Practice slots are optional. Leave a team unassigned if they do not practice.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Race category</th>
                    <th className="px-4 py-3">Primary slot</th>
                    <th className="px-4 py-3">Additional slot</th>
                    <th className="px-4 py-3">This week</th>
                    <th className="px-4 py-3">Charts</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(teamsResult.data ?? []).map((team) => {
                    const primaryAssignment = assignmentByTeamKind.get(`${team.id}:primary`);
                    const additionalAssignment = assignmentByTeamKind.get(`${team.id}:additional`);
                    const primaryAttendance = attendanceByTeamKind.get(`${team.id}:primary`);
                    const additionalAttendance = attendanceByTeamKind.get(`${team.id}:additional`);
                    const primaryChart = chartByTeamKind.get(`${team.id}:primary`);
                    const additionalChart = chartByTeamKind.get(`${team.id}:additional`);
                    const formId = `practice-assignment-${team.id}`;
                    return (
                      <tr key={team.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{team.name}</td>
                        <td className="px-4 py-3 text-slate-600">{team.race_categories?.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            form={formId}
                            name="primarySlotStartTime"
                            defaultValue={normalizePracticeSlot(primaryAssignment?.slot_start_time) ?? ""}
                            className="focus-ring min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2"
                          >
                            <option value="">No practice slot</option>
                            {PRACTICE_SLOT_OPTIONS.map((slot) => {
                              const capacity = capacityBySlot.get(slot)?.capacity ?? 0;
                              const assigned = assignedCountBySlot.get(slot) ?? 0;
                              return (
                                <option key={slot} value={slot}>
                                  {formatPracticeSlotLabel(slot)} ({assigned}/{capacity})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            form={formId}
                            name="additionalSlotStartTime"
                            defaultValue={normalizePracticeSlot(additionalAssignment?.slot_start_time) ?? ""}
                            className="focus-ring min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2"
                          >
                            <option value="">No additional slot</option>
                            {PRACTICE_SLOT_OPTIONS.map((slot) => {
                              const capacity = capacityBySlot.get(slot)?.capacity ?? 0;
                              const assigned = assignedCountBySlot.get(slot) ?? 0;
                              return (
                                <option key={slot} value={slot}>
                                  {formatPracticeSlotLabel(slot)} ({assigned}/{capacity})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <AttendanceSummary label={getPracticeAssignmentKindLabel("primary")} attendance={primaryAttendance} assigned={Boolean(primaryAssignment)} />
                            <AttendanceSummary label={getPracticeAssignmentKindLabel("additional")} attendance={additionalAttendance} assigned={Boolean(additionalAssignment)} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <ChartSummary label={getPracticeAssignmentKindLabel("primary")} chart={primaryChart} assigned={Boolean(primaryAssignment)} />
                            <ChartSummary label={getPracticeAssignmentKindLabel("additional")} chart={additionalChart} assigned={Boolean(additionalAssignment)} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            form={formId}
                            className="focus-ring rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(teamsResult.data ?? []).map((team) => (
              <form
                key={team.id}
                id={`practice-assignment-${team.id}`}
                action={`/api/admin/practice/assignments/${team.id}`}
                method="post"
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">Interval summary</h2>
              <p className="mt-1 text-sm text-slate-600">Week of {formatPracticeWeekLabel(currentWeekStart)}</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {PRACTICE_SLOT_OPTIONS.map((slot) => {
                const assigned = assignedCountBySlot.get(slot) ?? 0;
                const capacity = capacityBySlot.get(slot)?.capacity ?? 0;
                return (
                  <div key={slot} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{formatPracticeSlotLabel(slot)}</p>
                    <p className="mt-1 text-sm text-slate-600">{assigned} assigned / {capacity} available</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PracticeSetupNotice() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <CalendarDays size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Back office</p>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-amber-950">Practice scheduling is not ready yet</h1>
        <p className="mt-2 max-w-2xl text-amber-900">
          Apply the latest Supabase schema first. The practice tables are not present in the database yet, so capacity and assignments cannot be managed safely.
        </p>
      </div>
    </section>
  );
}

function getStatusCopy(status: string) {
  switch (status) {
    case "capacities-updated":
      return "Practice slot capacity updated.";
    case "assignment-updated":
      return "Practice slot assignment updated.";
    case "assignment-cleared":
      return "Practice slot assignment cleared.";
    case "slot-full":
      return "That practice slot is already at capacity.";
    case "duplicate-slots":
      return "Primary and additional practice slots must be different.";
    case "additional-needs-primary":
      return "Assign a primary practice slot before adding an additional one.";
    case "capacity-too-low":
      return "Capacity cannot be set below the number of teams already assigned to that interval.";
    default:
      return "Practice schedule updated.";
  }
}

function AttendanceSummary({
  label,
  attendance,
  assigned,
}: {
  label: string;
  attendance: TeamPracticeAttendance | undefined;
  assigned: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {!assigned ? (
        <span className="text-xs text-slate-500">Not assigned</span>
      ) : attendance ? (
        <span className={attendance.response === "confirmed" ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
          {attendance.response === "confirmed" ? "Confirmed" : "No attendance"}
        </span>
      ) : (
        <span className="text-xs text-slate-500">No response</span>
      )}
    </div>
  );
}

function ChartSummary({
  label,
  chart,
  assigned,
}: {
  label: string;
  chart: TeamPracticeSeatingChart | undefined;
  assigned: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {!assigned ? (
        <span className="text-xs text-slate-500">Not assigned</span>
      ) : chart ? (
        <Link href={`/api/practice-seating-charts/${chart.id}/signed-url`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          Open chart
        </Link>
      ) : (
        <span className="text-xs text-slate-500">Not uploaded</span>
      )}
    </div>
  );
}
