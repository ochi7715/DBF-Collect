import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import {
  PRACTICE_DAYS,
  PRACTICE_SLOT_OPTIONS,
  formatPracticeSessionLabel,
  formatPracticeSlotLabel,
  formatPracticeWeekLabel,
  getPracticeAssignmentKindLabel,
  getPracticeDayLabel,
  getPracticeDaySlotKey,
  getPracticeSessionValue,
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
    admin
      .from("practice_slot_capacities")
      .select("*")
      .order("practice_day", { ascending: true })
      .order("slot_start_time", { ascending: true }),
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
  const capacityBySlot = new Map(
    capacityRows
      .map((row) => [getPracticeDaySlotKey(row.practice_day, row.slot_start_time), row] as const)
      .filter((row): row is [string, PracticeSlotCapacity] => Boolean(row[0]))
  );
  const assignmentByTeamKind = new Map(assignmentRows.map((row) => [`${row.team_id}:${row.assignment_kind}`, row]));
  const attendanceByTeamKind = new Map(attendanceRows.map((row) => [`${row.team_id}:${row.assignment_kind}`, row]));
  const chartByTeamKind = new Map(chartRows.map((row) => [`${row.team_id}:${row.assignment_kind}`, row]));
  const assignedCountBySlot = new Map<string, number>();
  for (const assignment of assignmentRows) {
    const key = getPracticeDaySlotKey(assignment.practice_day, assignment.slot_start_time);
    if (!key) continue;
    assignedCountBySlot.set(key, (assignedCountBySlot.get(key) ?? 0) + 1);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-brand-600">
          <CalendarDays size={18} />
          <p className="text-sm font-semibold uppercase tracking-wider">Back office</p>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Practice schedule</h1>
        <p className="mt-2 text-slate-600">
          Set interval capacity for Saturday and Sunday, assign up to two recurring one-hour slots per team, and review this week&apos;s attendance responses.
        </p>
      </div>

      {status ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {getStatusCopy(status)}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form action="/api/admin/practice/capacities" method="post" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-950">Slot capacity</h2>
          <p className="mt-1 text-sm text-slate-600">Available teams per 15-minute start interval, counted separately for each day.</p>
          <div className="mt-5 space-y-5">
            {PRACTICE_DAYS.map((day) => (
              <section key={day} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-950">{getPracticeDayLabel(day)}</h3>
                <div className="mt-3 space-y-3">
                  {PRACTICE_SLOT_OPTIONS.map((slot) => {
                    const key = `${day}:${slot}`;
                    const row = capacityBySlot.get(key);
                    return (
                      <label key={slot} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">{formatPracticeSlotLabel(slot)}</span>
                        <input
                          name={getPracticeSlotInputName(day, slot)}
                          type="number"
                          min={0}
                          max={999}
                          defaultValue={row?.capacity ?? 0}
                          className="focus-ring w-full rounded-xl border border-slate-300 px-3 py-2"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <button className="focus-ring mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            Save capacity
          </button>
        </form>

        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">Assignments</h2>
              <p className="mt-1 text-sm text-slate-600">Practice slots are optional. Leave a team unassigned if they do not practice.</p>
            </div>
            <div className="divide-y divide-slate-200">
              {(teamsResult.data ?? []).map((team) => {
                const primaryAssignment = assignmentByTeamKind.get(`${team.id}:primary`);
                const additionalAssignment = assignmentByTeamKind.get(`${team.id}:additional`);
                const primaryAttendance = attendanceByTeamKind.get(`${team.id}:primary`);
                const additionalAttendance = attendanceByTeamKind.get(`${team.id}:additional`);
                const primaryChart = chartByTeamKind.get(`${team.id}:primary`);
                const additionalChart = chartByTeamKind.get(`${team.id}:additional`);
                const formId = `practice-assignment-${team.id}`;
                return (
                  <article key={team.id} className="p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold text-slate-950">{team.name}</h3>
                        <p className="text-sm text-slate-600">{team.race_categories?.name ?? "-"}</p>
                      </div>
                      <button
                        form={formId}
                        className="focus-ring mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:mt-0"
                      >
                        Save
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <PracticeAssignmentField
                        fieldName="primarySession"
                        assignment={primaryAssignment}
                        formId={formId}
                        label={getPracticeAssignmentKindLabel("primary")}
                        emptyLabel="No practice slot"
                        capacityBySlot={capacityBySlot}
                        assignedCountBySlot={assignedCountBySlot}
                      />
                      <PracticeAssignmentField
                        fieldName="additionalSession"
                        assignment={additionalAssignment}
                        formId={formId}
                        label={getPracticeAssignmentKindLabel("additional")}
                        emptyLabel="No additional slot"
                        capacityBySlot={capacityBySlot}
                        assignedCountBySlot={assignedCountBySlot}
                      />
                      <PracticeStatusPanel title="This week">
                        <AttendanceSummary label={getPracticeAssignmentKindLabel("primary")} attendance={primaryAttendance} assigned={Boolean(primaryAssignment)} />
                        <AttendanceSummary label={getPracticeAssignmentKindLabel("additional")} attendance={additionalAttendance} assigned={Boolean(additionalAssignment)} />
                      </PracticeStatusPanel>
                      <PracticeStatusPanel title="Charts">
                        <ChartSummary label={getPracticeAssignmentKindLabel("primary")} chart={primaryChart} assigned={Boolean(primaryAssignment)} />
                        <ChartSummary label={getPracticeAssignmentKindLabel("additional")} chart={additionalChart} assigned={Boolean(additionalAssignment)} />
                      </PracticeStatusPanel>
                    </div>
                  </article>
                );
              })}
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
            <div className="space-y-5 p-5">
              {PRACTICE_DAYS.map((day) => (
                <section key={day}>
                  <h3 className="font-bold text-slate-950">{getPracticeDayLabel(day)}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {PRACTICE_SLOT_OPTIONS.map((slot) => {
                      const key = `${day}:${slot}`;
                      const assigned = assignedCountBySlot.get(key) ?? 0;
                      const capacity = capacityBySlot.get(key)?.capacity ?? 0;
                      return (
                        <div key={slot} className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-sm font-semibold text-slate-900">{formatPracticeSlotLabel(slot)}</p>
                          <p className="mt-1 text-sm text-slate-600">{assigned} assigned / {capacity} available</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PracticeAssignmentField({
  assignment,
  capacityBySlot,
  assignedCountBySlot,
  emptyLabel,
  fieldName,
  formId,
  label,
}: {
  assignment: TeamPracticeAssignment | undefined;
  capacityBySlot: Map<string, PracticeSlotCapacity>;
  assignedCountBySlot: Map<string, number>;
  emptyLabel: string;
  fieldName: string;
  formId: string;
  label: string;
}) {
  const normalizedSlot = normalizePracticeSlot(assignment?.slot_start_time);
  const selectedValue = assignment && normalizedSlot ? getPracticeSessionValue(assignment.practice_day, normalizedSlot) : "";

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <select
        form={formId}
        name={fieldName}
        defaultValue={selectedValue}
        className="focus-ring mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
      >
        <option value="">{emptyLabel}</option>
        {PRACTICE_DAYS.flatMap((day) =>
          PRACTICE_SLOT_OPTIONS.map((slot) => {
            const key = `${day}:${slot}`;
            const capacity = capacityBySlot.get(key)?.capacity ?? 0;
            const assigned = assignedCountBySlot.get(key) ?? 0;
            return (
              <option key={key} value={getPracticeSessionValue(day, slot)}>
                {formatPracticeSessionLabel(day, slot)} ({assigned}/{capacity})
              </option>
            );
          })
        )}
      </select>
    </div>
  );
}

function PracticeStatusPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
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
    case "invalid-practice-day":
      return "Choose Saturday or Sunday for each assigned practice slot.";
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
    <div className="flex flex-wrap items-center gap-2">
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
    <div className="flex flex-wrap items-center gap-2">
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
