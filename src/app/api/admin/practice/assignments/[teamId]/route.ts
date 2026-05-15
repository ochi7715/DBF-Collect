import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { normalizePracticeSlot } from "@/lib/practice";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const assignmentSchema = z.object({
  slotStartTime: z.string().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const actor = await requireStaff();
  const formData = await request.formData();
  const parsed = assignmentSchema.parse({
    slotStartTime: normalizePracticeSlot(formData.get("slotStartTime")?.toString() ?? null),
  });
  const admin = createSupabaseAdminClient();

  if (!parsed.slotStartTime) {
    const { error } = await admin.from("team_practice_assignments").delete().eq("team_id", teamId);
    if (error) throw error;

    await writeAuditLog({
      actorId: actor.id,
      teamId,
      entityType: "team_practice_assignment",
      action: "team_practice_assignment_cleared",
      request,
    });

    redirect("/admin/practice?status=assignment-cleared");
  }

  const [{ data: capacity, error: capacityError }, { count: assignedCount, error: assignedCountError }] = await Promise.all([
    admin
      .from("practice_slot_capacities")
      .select("capacity")
      .eq("slot_start_time", parsed.slotStartTime)
      .single(),
    admin
      .from("team_practice_assignments")
      .select("*", { count: "exact", head: true })
      .eq("slot_start_time", parsed.slotStartTime)
      .neq("team_id", teamId),
  ]);

  if (capacityError || assignedCountError) throw capacityError ?? assignedCountError;
  if ((assignedCount ?? 0) >= (capacity?.capacity ?? 0)) {
    redirect("/admin/practice?status=slot-full");
  }

  const { data: assignment, error } = await admin
    .from("team_practice_assignments")
    .upsert(
      {
        team_id: teamId,
        slot_start_time: parsed.slotStartTime,
        assigned_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id" }
    )
    .select("id")
    .single();
  if (error) throw error;

  await writeAuditLog({
    actorId: actor.id,
    teamId,
    entityType: "team_practice_assignment",
    entityId: assignment.id,
    action: "team_practice_assignment_saved",
    details: parsed,
    request,
  });

  redirect("/admin/practice?status=assignment-updated");
}
