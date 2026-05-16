import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  PRACTICE_DAYS,
  PRACTICE_SLOT_OPTIONS,
  getPracticeDaySlotKey,
  getPracticeSlotInputName,
} from "@/lib/practice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const capacitySchema = z.record(z.coerce.number().int().min(0).max(999));

export async function POST(request: Request) {
  const actor = await requireStaff();
  const formData = await request.formData();
  const values = Object.fromEntries(
    PRACTICE_DAYS.flatMap((day) =>
      PRACTICE_SLOT_OPTIONS.map((slot) => [`${day}:${slot}`, formData.get(getPracticeSlotInputName(day, slot)) ?? "0"])
    )
  );
  const parsed = capacitySchema.parse(values);
  const admin = createSupabaseAdminClient();

  const { data: assignments, error: assignmentError } = await admin
    .from("team_practice_assignments")
    .select("practice_day, slot_start_time");
  if (assignmentError) throw assignmentError;

  const assignedCountBySlot = new Map<string, number>();
  for (const assignment of assignments ?? []) {
    const key = getPracticeDaySlotKey(assignment.practice_day, assignment.slot_start_time);
    if (!key) continue;
    assignedCountBySlot.set(key, (assignedCountBySlot.get(key) ?? 0) + 1);
  }

  for (const day of PRACTICE_DAYS) {
    for (const slot of PRACTICE_SLOT_OPTIONS) {
      const key = `${day}:${slot}`;
      if ((assignedCountBySlot.get(key) ?? 0) > parsed[key]) {
        redirect("/admin/practice?status=capacity-too-low");
      }
    }
  }

  const rows = PRACTICE_DAYS.flatMap((day) =>
    PRACTICE_SLOT_OPTIONS.map((slot) => ({
      practice_day: day,
      slot_start_time: slot,
      capacity: parsed[`${day}:${slot}`],
      updated_at: new Date().toISOString(),
    }))
  );
  const { error } = await admin
    .from("practice_slot_capacities")
    .upsert(rows, { onConflict: "practice_day,slot_start_time" });
  if (error) throw error;

  await writeAuditLog({
    actorId: actor.id,
    entityType: "practice_slot_capacity",
    action: "practice_slot_capacities_updated",
    details: parsed,
    request,
  });

  redirect("/admin/practice?status=capacities-updated");
}
