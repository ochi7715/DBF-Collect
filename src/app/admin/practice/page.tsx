import { CalendarDays } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import {
  PRACTICE_SLOT_OPTIONS,
  formatPracticeSlotLabel,
  formatPracticeWeekLabel,
  getPracticeSlotInputName,
  getPracticeWeekStart,
  normalizePracticeSlot,
  toDateOnly,
} from "@/lib/practice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PracticeSlotCapacity,
  TeamPracticeAssignment,
  TeamPracticeAttendance,
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

  const [
    { data: capacities, error: capacityError },
    { data: teams, error: teamError },
    { data: assignments, error: assignmentError },
    { data: attendance, error: attendanceError },
  ] = await Promise.all([
    admin.from("practice_slot_capacities").select("*").order("slot_start_time", { ascending: true }),
    admin.from("teams").select("*, race_categories(*)").order("name", { ascending: true }),
    admin.from("team_practice_assignments").select("*"),
    admin.from("team_practice_attendance").select("*").eq("practice_week_start", currentWeekStart),
  ]);

  if (capacityError || teamError || assignmentError || attendanceError) {
    throw capacityError ?? teamError ?? assignmentError ?? attendanceError;
  }

  const capacityRows = (capacities ?? []) as PracticeSlotCapacity[];
  const assignmentRows = (assignments ?? []) as TeamPracticeAssignment[];
  const attendanceRows = (attendance ?? []) as TeamPracticeAttendance[];
  const capacityBySlot = new Map(capacityRows.map((row) => [normalizePracticeSlot(row.slot_start_time), row]));
  const assignmentByTeam = new Map(assignmentRows.map((row) => [row.team_id, row]));
  const attendanceByTeam = new Map(attendanceRows.map((row) => [row.team_id, row]));
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
          Set interval capacity, assign recurring one-hour slots, and review this week&apos;s attendance responses.
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
                    <th className="px-4 py-3">Recurring slot</th>
                    <th className="px-4 py-3">This week</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(teams ?? []).map((team) => {
                    const assignment = assignmentByTeam.get(team.id);
                    const attendanceRow = attendanceByTeam.get(team.id);
                    const formId = `practice-assignment-${team.id}`;
                    return (
                      <tr key={team.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{team.name}</td>
                        <td className="px-4 py-3 text-slate-600">{team.race_categories?.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            form={formId}
                            name="slotStartTime"
                            defaultValue={normalizePracticeSlot(assignment?.slot_start_time) ?? ""}
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
                          {attendanceRow ? (
                            <span className={attendanceRow.response === "confirmed" ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
                              {attendanceRow.response === "confirmed" ? "Confirmed" : "No attendance"}
                            </span>
                          ) : (
                            <span className="text-slate-500">No response</span>
                          )}
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
            {(teams ?? []).map((team) => (
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
    case "capacity-too-low":
      return "Capacity cannot be set below the number of teams already assigned to that interval.";
    default:
      return "Practice schedule updated.";
  }
}
