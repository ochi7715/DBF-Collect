import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { normalizePracticeSlot } from "@/lib/practice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const assignmentSchema = z.object({
  primarySlotStartTime: z.string().nullable(),
  additionalSlotStartTime: z.string().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const actor = await requireStaff();
  const formData = await request.formData();
  const parsed = assignmentSchema.parse({
    primarySlotStartTime: normalizePracticeSlot(formData.get("primarySlotStartTime")?.toString() ?? null),
    additionalSlotStartTime: normalizePracticeSlot(formData.get("additionalSlotStartTime")?.toString() ?? null),
  });
  const admin = createSupabaseAdminClient();

  if (!parsed.primarySlotStartTime && parsed.additionalSlotStartTime) {
    redirect("/admin/practice?status=additional-needs-primary");
  }
  if (parsed.primarySlotStartTime && parsed.primarySlotStartTime === parsed.additionalSlotStartTime) {
    redirect("/admin/practice?status=duplicate-slots");
  }

  const requestedSlots = [
    { assignmentKind: "primary" as const, slotStartTime: parsed.primarySlotStartTime },
    { assignmentKind: "additional" as const, slotStartTime: parsed.additionalSlotStartTime },
  ];
  const activeSlots = requestedSlots.filter((slot) => slot.slotStartTime);

  const [{ data: capacities, error: capacityError }, { data: otherAssignments, error: assignmentError }] = await Promise.all([
    admin.from("practice_slot_capacities").select("slot_start_time, capacity"),
    admin.from("team_practice_assignments").select("slot_start_time").neq("team_id", teamId),
  ]);
  if (capacityError || assignmentError) throw capacityError ?? assignmentError;

  const capacityBySlot = new Map((capacities ?? []).map((row) => [String(row.slot_start_time).slice(0, 5), row.capacity]));
  const assignedCountBySlot = new Map<string, number>();
  for (const assignment of otherAssignments ?? []) {
    const slot = String(assignment.slot_start_time).slice(0, 5);
    assignedCountBySlot.set(slot, (assignedCountBySlot.get(slot) ?? 0) + 1);
  }
  for (const assignment of activeSlots) {
    const slot = assignment.slotStartTime!;
    assignedCountBySlot.set(slot, (assignedCountBySlot.get(slot) ?? 0) + 1);
  }
  for (const [slot, assignedCount] of assignedCountBySlot) {
    if (assignedCount > (capacityBySlot.get(slot) ?? 0)) {
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
