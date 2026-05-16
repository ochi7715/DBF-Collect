import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getPracticeDaySlotKey, parsePracticeSessionValue } from "@/lib/practice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const actor = await requireStaff();
  const formData = await request.formData();
  const primary = parsePracticeSessionValue(formData.get("primarySession")?.toString() ?? null);
  const additional = parsePracticeSessionValue(formData.get("additionalSession")?.toString() ?? null);
  const parsed = {
    primaryPracticeDay: primary.practiceDay,
    primarySlotStartTime: primary.slotStartTime,
    additionalPracticeDay: additional.practiceDay,
    additionalSlotStartTime: additional.slotStartTime,
  };
  const admin = createSupabaseAdminClient();

  if (!parsed.primarySlotStartTime && parsed.additionalSlotStartTime) {
    redirect("/admin/practice?status=additional-needs-primary");
  }
  if (parsed.primarySlotStartTime && !parsed.primaryPracticeDay) {
    redirect("/admin/practice?status=invalid-practice-day");
  }
  if (parsed.additionalSlotStartTime && !parsed.additionalPracticeDay) {
    redirect("/admin/practice?status=invalid-practice-day");
  }
  if (
    parsed.primaryPracticeDay &&
    parsed.primarySlotStartTime &&
    parsed.primaryPracticeDay === parsed.additionalPracticeDay &&
    parsed.primarySlotStartTime === parsed.additionalSlotStartTime
  ) {
    redirect("/admin/practice?status=duplicate-slots");
  }

  const requestedSlots = [
    {
      assignmentKind: "primary" as const,
      practiceDay: parsed.primaryPracticeDay,
      slotStartTime: parsed.primarySlotStartTime,
    },
    {
      assignmentKind: "additional" as const,
      practiceDay: parsed.additionalPracticeDay,
      slotStartTime: parsed.additionalSlotStartTime,
    },
  ];
  const activeSlots = requestedSlots.filter((slot) => slot.practiceDay && slot.slotStartTime);

  const [{ data: capacities, error: capacityError }, { data: otherAssignments, error: assignmentError }] = await Promise.all([
    admin.from("practice_slot_capacities").select("practice_day, slot_start_time, capacity"),
    admin.from("team_practice_assignments").select("practice_day, slot_start_time").neq("team_id", teamId),
  ]);
  if (capacityError || assignmentError) throw capacityError ?? assignmentError;

  const capacityBySlot = new Map(
    (capacities ?? [])
      .map((row) => [getPracticeDaySlotKey(row.practice_day, row.slot_start_time), row.capacity] as const)
      .filter((row): row is [string, number] => Boolean(row[0]))
  );
  const assignedCountBySlot = new Map<string, number>();
  for (const assignment of otherAssignments ?? []) {
    const key = getPracticeDaySlotKey(assignment.practice_day, assignment.slot_start_time);
    if (!key) continue;
    assignedCountBySlot.set(key, (assignedCountBySlot.get(key) ?? 0) + 1);
  }
  for (const assignment of activeSlots) {
    const key = getPracticeDaySlotKey(assignment.practiceDay, assignment.slotStartTime);
    if (!key) continue;
    assignedCountBySlot.set(key, (assignedCountBySlot.get(key) ?? 0) + 1);
  }
  for (const [slotKey, assignedCount] of assignedCountBySlot) {
    if (assignedCount > (capacityBySlot.get(slotKey) ?? 0)) {
      redirect("/admin/practice?status=slot-full");
    }
  }

  const rowsToDelete = requestedSlots.filter((slot) => !slot.slotStartTime);
  for (const assignment of rowsToDelete) {
    const { error } = await admin
      .from("team_practice_assignments")
      .delete()
      .eq("team_id", teamId)
      .eq("assignment_kind", assignment.assignmentKind);
    if (error) throw error;
  }

  if (activeSlots.length > 0) {
    const rows = activeSlots.map((assignment) => ({
      team_id: teamId,
      assignment_kind: assignment.assignmentKind,
      practice_day: assignment.practiceDay,
      slot_start_time: assignment.slotStartTime,
      assigned_by: actor.id,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin
      .from("team_practice_assignments")
      .upsert(rows, { onConflict: "team_id,assignment_kind" });
    if (error) throw error;
  }

  await writeAuditLog({
    actorId: actor.id,
    teamId,
    entityType: "team_practice_assignment",
    action: "team_practice_assignments_saved",
    details: parsed,
    request,
  });

  redirect("/admin/practice?status=assignment-updated");
}
